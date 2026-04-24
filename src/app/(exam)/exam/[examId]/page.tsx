import { notFound } from "next/navigation";
import Link from "next/link";
import { getExamById } from "@/server/data-access/exams";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, FileText, Award, AlertTriangle, ArrowLeft } from "lucide-react";

export default async function ExamInfoPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = await params;
  const exam = await getExamById(examId);
  if (!exam) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" render={<Link href="/dashboard" />}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{exam.title}</h1>
          {exam.description && (
            <p className="text-muted-foreground">{exam.description}</p>
          )}
        </div>
      </div>

      {/* Exam Details */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xl font-bold">{exam.totalQuestions}</p>
              <p className="text-xs text-muted-foreground">Questions</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xl font-bold">{exam.durationMinutes} min</p>
              <p className="text-xs text-muted-foreground">Duration</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Award className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xl font-bold">{exam.totalMarks}</p>
              <p className="text-xs text-muted-foreground">Total Marks</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Marking Scheme */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Marking Scheme</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <span className="text-muted-foreground">Correct Answer:</span>
            <span className="font-medium text-green-700">+{exam.marksPerQuestion}</span>
            <span className="text-muted-foreground">Wrong Answer:</span>
            <span className="font-medium text-red-700">
              {exam.negativeMarking > 0 ? `-${exam.negativeMarking}` : "No negative marking"}
            </span>
            <span className="text-muted-foreground">Unattempted:</span>
            <span className="font-medium">0</span>
            {exam.passingPercentage && (
              <>
                <span className="text-muted-foreground">Passing %:</span>
                <span className="font-medium">{exam.passingPercentage}%</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      {exam.instructions && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground whitespace-pre-wrap">
              {exam.instructions}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Important Notice */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="flex gap-3 pt-6">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
          <div className="text-sm text-amber-800 space-y-1">
            <p className="font-medium">Before you begin:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Ensure you have a stable internet connection</li>
              <li>The timer starts once you click &quot;Start Exam&quot;</li>
              <li>Do not switch tabs during the exam</li>
              <li>The exam auto-submits when time expires</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Start Button */}
      <div className="flex justify-center">
        <Button
          size="lg"
          className="px-8"
          render={<Link href={`/exam/${examId}/take`} />}
        >
          Start Exam
        </Button>
      </div>
    </div>
  );
}
