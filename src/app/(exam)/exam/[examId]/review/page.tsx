import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/server/db";
import { examSessions, examQuestions } from "@/server/schema";
import { eq } from "drizzle-orm";
import { getExamById } from "@/server/data-access/exams";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default async function ExamReviewPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = await params;
  const exam = await getExamById(examId);
  if (!exam) notFound();

  // Get the first session for this exam (dev mode)
  const session = await db.query.examSessions.findFirst({
    where: eq(examSessions.examId, examId),
    with: {
      examQuestions: {
        orderBy: (eq, { asc }) => [asc(eq.sequenceNumber)],
        with: {
          question: true,
          response: true,
        },
      },
    },
  });

  if (!session) {
    return (
      <div className="mx-auto max-w-3xl p-4 sm:p-6 text-center py-12">
        <p className="text-muted-foreground">No session found for this exam.</p>
        <Button className="mt-4" render={<Link href="/dashboard" />}>Back to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" render={<Link href={`/exam/${examId}/result`} />}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{exam.title}</h1>
          <Badge variant="outline" className="bg-amber-100 text-amber-800">Review Mode</Badge>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-6">
        {session.examQuestions.map((eq) => {
          const q = eq.question;
          const r = eq.response;
          const isCorrect = r?.isCorrect;
          const wasAttempted = !!r?.selectedOption;

          const options = [
            { label: "A", text: q.optionA },
            { label: "B", text: q.optionB },
            { label: "C", text: q.optionC },
            { label: "D", text: q.optionD },
          ];

          return (
            <Card key={eq.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-muted-foreground">
                      Q{eq.sequenceNumber}
                    </span>
                    <Badge variant="outline" className="text-xs">{q.difficulty}</Badge>
                    {r?.totalTimeSec !== undefined && r.totalTimeSec > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {Math.round(r.totalTimeSec)}s
                      </span>
                    )}
                  </div>
                  {wasAttempted ? (
                    isCorrect ? (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Correct
                      </Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800">
                        <XCircle className="mr-1 h-3 w-3" /> Wrong
                      </Badge>
                    )
                  ) : (
                    <Badge className="bg-gray-100 text-gray-800">
                      <MinusCircle className="mr-1 h-3 w-3" /> Skipped
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm leading-relaxed">{q.questionText}</p>

                <div className="grid gap-2 sm:grid-cols-2">
                  {options.map((opt) => {
                    const isCorrectOption = opt.label === q.correctOption;
                    const isUserChoice = opt.label === r?.selectedOption;

                    return (
                      <div
                        key={opt.label}
                        className={cn(
                          "flex items-start gap-2 rounded-md border p-2.5 text-sm",
                          isCorrectOption && "border-green-400 bg-green-50",
                          isUserChoice && !isCorrectOption && "border-red-400 bg-red-50",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                            isCorrectOption
                              ? "bg-green-500 text-white"
                              : isUserChoice
                                ? "bg-red-500 text-white"
                                : "bg-muted text-muted-foreground",
                          )}
                        >
                          {opt.label}
                        </span>
                        <span>{opt.text}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Explanation */}
                {q.explanation && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                    <p className="mb-1 text-xs font-semibold text-amber-800">Solution:</p>
                    <p className="text-sm text-amber-900 whitespace-pre-wrap">{q.explanation}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-center gap-4 pb-8">
        <Button variant="outline" render={<Link href={`/exam/${examId}/result`} />}>
          Back to Results
        </Button>
        <Button render={<Link href="/dashboard" />}>Back to Dashboard</Button>
      </div>
    </div>
  );
}
