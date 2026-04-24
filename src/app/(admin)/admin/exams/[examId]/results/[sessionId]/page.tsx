import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/server/db";
import {
  examSessions,
  examQuestions,
  examResults,
} from "@/server/schema";
import { eq } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Clock,
  Zap,
  AlertTriangle,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TimePerQuestionChart } from "@/components/charts/time-per-question-chart";

export default async function ParticipantExamDetailPage({
  params,
}: {
  params: Promise<{ examId: string; sessionId: string }>;
}) {
  const { examId, sessionId } = await params;

  // Load session with all details
  const session = await db.query.examSessions.findFirst({
    where: eq(examSessions.id, sessionId),
    with: {
      exam: true,
      user: true,
      examQuestions: {
        orderBy: (eqCol, { asc }) => [asc(eqCol.sequenceNumber)],
        with: {
          question: true,
          response: true,
        },
      },
    },
  });

  if (!session) notFound();

  // Load exam result
  const result = await db.query.examResults.findFirst({
    where: eq(examResults.sessionId, sessionId),
  });

  // Calculate per-question analysis
  const questionAnalysis = session.examQuestions.map((eq) => {
    const q = eq.question;
    const r = eq.response;
    const timeSec = r?.totalTimeSec || 0;
    const isAttempted = !!r?.selectedOption;
    const isCorrect = r?.isCorrect ?? false;

    return {
      sequenceNumber: eq.sequenceNumber,
      questionText: q.questionText,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      correctOption: q.correctOption,
      selectedOption: r?.selectedOption || null,
      isCorrect,
      isAttempted,
      timeSec,
      marksAwarded: r?.marksAwarded ?? 0,
      marksForCorrect: eq.marksForCorrect,
      marksForIncorrect: eq.marksForIncorrect,
      difficulty: q.difficulty,
      topicName: q.topicId, // We'll show topic if available
      explanation: q.explanation,
      status: r?.status || "NOT_VISITED",
    };
  });

  const totalTime = questionAnalysis.reduce((s, q) => s + q.timeSec, 0);
  const avgTime = questionAnalysis.length > 0 ? totalTime / questionAnalysis.filter((q) => q.isAttempted).length : 0;
  const tooFast = questionAnalysis.filter((q) => q.isAttempted && q.timeSec < avgTime * 0.3 && q.timeSec > 0);
  const tooSlow = questionAnalysis.filter((q) => q.isAttempted && q.timeSec > avgTime * 2.5);
  const accuracy = result ? (result.correctCount / (result.correctCount + result.incorrectCount || 1)) * 100 : 0;

  // Chart data
  const timeChartData = questionAnalysis.map((q) => ({
    question: `Q${q.sequenceNumber}`,
    timeSec: Math.round(q.timeSec),
    isCorrect: q.isCorrect,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          render={<Link href={`/admin/exams/${examId}/results`} />}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{session.user?.name || "Unknown"}</h1>
          <p className="text-sm text-muted-foreground">
            {session.user?.email} — {session.exam.title}
          </p>
        </div>
      </div>

      {/* Score Overview */}
      {result && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold">
                {Math.round(result.percentage)}%
              </div>
              <p className="text-xs text-muted-foreground">
                {result.totalScore} / {result.maxPossibleScore}
              </p>
              {result.isPassed !== null && (
                <Badge
                  variant="outline"
                  className={cn(
                    "mt-1",
                    result.isPassed
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800",
                  )}
                >
                  {result.isPassed ? "PASSED" : "FAILED"}
                </Badge>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-xl font-bold text-green-700">
                  {result.correctCount}
                </p>
                <p className="text-xs text-muted-foreground">
                  Correct (+{result.positiveMarks})
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <XCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-xl font-bold text-red-700">
                  {result.incorrectCount}
                </p>
                <p className="text-xs text-muted-foreground">
                  Wrong (-{result.negativeMarks})
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <MinusCircle className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xl font-bold text-gray-600">
                  {result.unattemptedCount}
                </p>
                <p className="text-xs text-muted-foreground">Skipped</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <Target className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-xl font-bold">{Math.round(accuracy)}%</p>
                <p className="text-xs text-muted-foreground">Accuracy</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Time Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Time Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-md border p-3 text-center">
              <p className="text-lg font-bold">
                {Math.floor(totalTime / 60)}m {Math.round(totalTime % 60)}s
              </p>
              <p className="text-xs text-muted-foreground">Total Time</p>
            </div>
            <div className="rounded-md border p-3 text-center">
              <p className="text-lg font-bold">{Math.round(avgTime)}s</p>
              <p className="text-xs text-muted-foreground">Avg per Question</p>
            </div>
            <div className="rounded-md border p-3 text-center">
              <p className="text-lg font-bold">{result?.fastestQuestionSec || 0}s</p>
              <p className="text-xs text-muted-foreground">Fastest</p>
            </div>
            <div className="rounded-md border p-3 text-center">
              <p className="text-lg font-bold">{result?.slowestQuestionSec || 0}s</p>
              <p className="text-xs text-muted-foreground">Slowest</p>
            </div>
          </div>

          {/* Time per question chart */}
          <TimePerQuestionChart data={timeChartData} avgTimeSec={avgTime} />

          {/* Flags */}
          {(tooFast.length > 0 || tooSlow.length > 0) && (
            <div className="grid gap-3 sm:grid-cols-2">
              {tooFast.length > 0 && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                  <div className="mb-1 flex items-center gap-1 text-sm font-medium text-amber-800">
                    <Zap className="h-4 w-4" />
                    Too Fast ({tooFast.length} questions)
                  </div>
                  <p className="text-xs text-amber-700">
                    Questions {tooFast.map((q) => `Q${q.sequenceNumber}`).join(", ")} were
                    answered very quickly (&lt;{Math.round(avgTime * 0.3)}s). May indicate guessing.
                  </p>
                </div>
              )}
              {tooSlow.length > 0 && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3">
                  <div className="mb-1 flex items-center gap-1 text-sm font-medium text-red-800">
                    <AlertTriangle className="h-4 w-4" />
                    Too Slow ({tooSlow.length} questions)
                  </div>
                  <p className="text-xs text-red-700">
                    Questions {tooSlow.map((q) => `Q${q.sequenceNumber}`).join(", ")} took
                    significantly longer (&gt;{Math.round(avgTime * 2.5)}s). May need more practice.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Question-by-Question Review */}
      <Card>
        <CardHeader>
          <CardTitle>Question-by-Question Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Q#</TableHead>
                <TableHead>Question</TableHead>
                <TableHead className="w-20">Answer</TableHead>
                <TableHead className="w-20">Correct</TableHead>
                <TableHead className="w-16">Result</TableHead>
                <TableHead className="w-16">Time</TableHead>
                <TableHead className="w-16">Marks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {questionAnalysis.map((q) => (
                <TableRow key={q.sequenceNumber}>
                  <TableCell className="font-medium">Q{q.sequenceNumber}</TableCell>
                  <TableCell className="max-w-xs">
                    <p className="truncate text-sm" title={q.questionText}>
                      {q.questionText.length > 80
                        ? q.questionText.slice(0, 80) + "..."
                        : q.questionText}
                    </p>
                  </TableCell>
                  <TableCell>
                    {q.selectedOption ? (
                      <Badge
                        variant="outline"
                        className={
                          q.isCorrect
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }
                      >
                        {q.selectedOption}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-green-100 text-green-800">
                      {q.correctOption}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {q.isAttempted ? (
                      q.isCorrect ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )
                    ) : (
                      <MinusCircle className="h-4 w-4 text-gray-400" />
                    )}
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "text-xs font-medium",
                        q.timeSec > 0 && q.timeSec < avgTime * 0.3
                          ? "text-amber-600"
                          : q.timeSec > avgTime * 2.5
                            ? "text-red-600"
                            : "text-muted-foreground",
                      )}
                    >
                      {Math.round(q.timeSec)}s
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "text-xs font-bold",
                        q.marksAwarded > 0
                          ? "text-green-700"
                          : q.marksAwarded < 0
                            ? "text-red-700"
                            : "text-muted-foreground",
                      )}
                    >
                      {q.marksAwarded > 0 ? "+" : ""}
                      {q.marksAwarded}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detailed Question Review with Solutions */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Solutions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {questionAnalysis.map((q) => {
            const options = [
              { label: "A", text: q.optionA },
              { label: "B", text: q.optionB },
              { label: "C", text: q.optionC },
              { label: "D", text: q.optionD },
            ];

            return (
              <div key={q.sequenceNumber} className="rounded-lg border p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-muted-foreground">
                      Q{q.sequenceNumber}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {q.difficulty}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(q.timeSec)}s
                    </span>
                  </div>
                  {q.isAttempted ? (
                    q.isCorrect ? (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Correct +
                        {q.marksForCorrect}
                      </Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800">
                        <XCircle className="mr-1 h-3 w-3" /> Wrong -
                        {q.marksForIncorrect}
                      </Badge>
                    )
                  ) : (
                    <Badge className="bg-gray-100 text-gray-800">
                      <MinusCircle className="mr-1 h-3 w-3" /> Skipped
                    </Badge>
                  )}
                </div>

                <p className="mb-3 text-sm">{q.questionText}</p>

                <div className="mb-3 grid gap-1.5 sm:grid-cols-2">
                  {options.map((opt) => {
                    const isCorrectOpt = opt.label === q.correctOption;
                    const isUserChoice = opt.label === q.selectedOption;

                    return (
                      <div
                        key={opt.label}
                        className={cn(
                          "flex items-start gap-2 rounded-md border p-2 text-sm",
                          isCorrectOpt && "border-green-400 bg-green-50",
                          isUserChoice &&
                            !isCorrectOpt &&
                            "border-red-400 bg-red-50",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                            isCorrectOpt
                              ? "bg-green-500 text-white"
                              : isUserChoice
                                ? "bg-red-500 text-white"
                                : "bg-muted text-muted-foreground",
                          )}
                        >
                          {opt.label}
                        </span>
                        <span className="text-xs">{opt.text}</span>
                      </div>
                    );
                  })}
                </div>

                {q.explanation && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                    <p className="mb-1 text-xs font-semibold text-amber-800">
                      Solution:
                    </p>
                    <p className="whitespace-pre-wrap text-xs text-amber-900">
                      {q.explanation}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
