import { notFound } from "next/navigation";
import Link from "next/link";
import { getExamById } from "@/server/data-access/exams";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock,
  FileText,
  Award,
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Lock,
} from "lucide-react";

export default async function ExamInfoPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = await params;
  const exam = await getExamById(examId);
  if (!exam) notFound();

  const isLive = exam.status === "LIVE";

  // Group topics by parent subject
  const topicsBySubject = new Map<string, { subjectName: string; topics: string[] }>();
  if (exam.topicConfigs && exam.topicConfigs.length > 0) {
    for (const tc of exam.topicConfigs as any[]) {
      const topicName = tc.topic?.name || "Unknown";
      const parentId = tc.topic?.parentId;

      // Find parent name from the topic's parent
      let subjectName = "General";
      if (parentId) {
        // Check if we already have this parent
        const existingSubject = topicsBySubject.get(parentId);
        if (existingSubject) {
          existingSubject.topics.push(topicName);
          continue;
        }
      }

      // Use topic's parent or group under "Topics"
      const key = parentId || "general";
      const existing = topicsBySubject.get(key);
      if (existing) {
        existing.topics.push(topicName);
      } else {
        topicsBySubject.set(key, { subjectName, topics: [topicName] });
      }
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" render={<Link href="/dashboard" />}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{exam.title}</h1>
            <Badge
              variant="outline"
              className={
                isLive
                  ? "bg-green-100 text-green-800"
                  : exam.status === "SCHEDULED"
                    ? "bg-blue-100 text-blue-800"
                    : exam.status === "COMPLETED"
                      ? "bg-gray-100 text-gray-800"
                      : "bg-amber-100 text-amber-800"
              }
            >
              {exam.status}
            </Badge>
          </div>
          {exam.description && (
            <p className="mt-1 text-muted-foreground">{exam.description}</p>
          )}
        </div>
      </div>

      {/* Quick Stats */}
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

      {/* Exam Topics */}
      {exam.topicConfigs && exam.topicConfigs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-4 w-4" />
              Exam Topics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(exam.topicConfigs as any[]).map((tc: any) => (
                <div
                  key={tc.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <span className="text-sm font-medium">{tc.topic?.name || "Unknown"}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {tc.questionCount} questions
                    </span>
                    <Badge
                      variant="outline"
                      className={
                        tc.difficulty === "EASY"
                          ? "bg-green-50 text-green-700 text-xs"
                          : tc.difficulty === "HARD"
                            ? "bg-red-50 text-red-700 text-xs"
                            : "bg-amber-50 text-amber-700 text-xs"
                      }
                    >
                      {tc.difficulty}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Total: {(exam.topicConfigs as any[]).reduce((s: number, tc: any) => s + tc.questionCount, 0)} questions
              across {(exam.topicConfigs as any[]).length} topics
            </p>
          </CardContent>
        </Card>
      )}

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
            {exam.passingPercentage != null && exam.passingPercentage > 0 && (
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
            <div className="space-y-2 whitespace-pre-wrap text-sm text-muted-foreground">
              {exam.instructions}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Start / Not Available */}
      {isLive ? (
        <>
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="flex gap-3 pt-6">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
              <div className="space-y-1 text-sm text-amber-800">
                <p className="font-medium">Before you begin:</p>
                <ul className="list-disc space-y-1 pl-4">
                  <li>Ensure you have a stable internet connection</li>
                  <li>The timer starts once you click "Start Exam"</li>
                  <li>Do not switch tabs during the exam</li>
                  <li>The exam auto-submits when time expires</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-center pb-4">
            <Button
              size="lg"
              className="px-8"
              render={<Link href={`/exam/${examId}/take`} />}
            >
              Start Exam
            </Button>
          </div>
        </>
      ) : (
        <Card className="border-slate-200 bg-slate-50">
          <CardContent className="flex flex-col items-center gap-3 py-8">
            <Lock className="h-8 w-8 text-slate-400" />
            <div className="text-center">
              <p className="font-semibold text-slate-700">
                {exam.status === "SCHEDULED"
                  ? "This exam is scheduled but not yet live"
                  : exam.status === "COMPLETED"
                    ? "This exam has ended"
                    : exam.status === "DRAFT"
                      ? "This exam is still being prepared"
                      : "This exam is not available"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {exam.status === "SCHEDULED"
                  ? "Please wait for the admin to start the exam."
                  : exam.status === "COMPLETED"
                    ? "Check your results if you participated."
                    : "Contact the exam administrator for more information."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
