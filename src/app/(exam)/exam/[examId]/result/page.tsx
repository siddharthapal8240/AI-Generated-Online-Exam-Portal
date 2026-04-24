import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/server/db";
import { examResults } from "@/server/schema";
import { eq } from "drizzle-orm";
import { getExamById } from "@/server/data-access/exams";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, XCircle, MinusCircle, Trophy } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default async function ExamResultPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = await params;
  const exam = await getExamById(examId);
  if (!exam) notFound();

  // Find the result for this exam (first one found - for dev)
  const result = await db.query.examResults.findFirst({
    where: eq(examResults.examId, examId),
  });

  if (!result) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
        <div className="text-center space-y-4 py-12">
          <h1 className="text-2xl font-bold">Exam Submitted</h1>
          <p className="text-muted-foreground">
            Your exam has been submitted successfully. Results will be available shortly.
          </p>
          <Button render={<Link href="/dashboard" />}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  const percentage = Math.round(result.percentage * 10) / 10;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" render={<Link href="/dashboard" />}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{exam.title}</h1>
          <p className="text-muted-foreground">Exam Results</p>
        </div>
      </div>

      {/* Score Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="relative flex h-32 w-32 items-center justify-center">
              <svg className="h-32 w-32 -rotate-90" viewBox="0 0 120 120">
                <circle
                  cx="60" cy="60" r="54"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-muted"
                />
                <circle
                  cx="60" cy="60" r="54"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${(percentage / 100) * 339.3} 339.3`}
                  strokeLinecap="round"
                  className={percentage >= 60 ? "text-green-500" : percentage >= 40 ? "text-amber-500" : "text-red-500"}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold">{percentage}%</span>
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold">
                {result.totalScore} / {result.maxPossibleScore}
              </p>
              {result.isPassed !== null && (
                <Badge
                  variant="outline"
                  className={result.isPassed ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                >
                  {result.isPassed ? "PASSED" : "NOT CLEARED"}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Breakdown */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-xl font-bold text-green-700">{result.correctCount}</p>
              <p className="text-xs text-muted-foreground">Correct (+{result.positiveMarks})</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <XCircle className="h-5 w-5 text-red-500" />
            <div>
              <p className="text-xl font-bold text-red-700">{result.incorrectCount}</p>
              <p className="text-xs text-muted-foreground">Wrong (-{result.negativeMarks})</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <MinusCircle className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-xl font-bold text-gray-600">{result.unattemptedCount}</p>
              <p className="text-xs text-muted-foreground">Unattempted</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Time Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Time Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <span className="text-muted-foreground">Total Time:</span>
            <span className="font-medium">
              {Math.floor(result.totalTimeSec / 60)}m {Math.floor(result.totalTimeSec % 60)}s
            </span>
            <span className="text-muted-foreground">Avg per Question:</span>
            <span className="font-medium">{Math.round(result.avgTimePerQuestionSec)}s</span>
            <span className="text-muted-foreground">Fastest:</span>
            <span className="font-medium">{Math.round(result.fastestQuestionSec)}s</span>
            <span className="text-muted-foreground">Slowest:</span>
            <span className="font-medium">{Math.round(result.slowestQuestionSec)}s</span>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-center gap-4">
        <Button variant="outline" render={<Link href={`/exam/${examId}/review`} />}>
          Review Answers
        </Button>
        <Button render={<Link href="/dashboard" />}>Back to Dashboard</Button>
      </div>
    </div>
  );
}
