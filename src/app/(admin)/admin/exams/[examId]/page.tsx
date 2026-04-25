import { notFound } from "next/navigation";
import { getExamById } from "@/server/data-access/exams";
import { getQuestionsByExamId } from "@/server/data-access/questions";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Clock, FileText, Users, Settings, CheckCircle2 } from "lucide-react";
import { GenerateQuestionsButton } from "./_components/generate-questions-button";
import { ExamStatusActions } from "./_components/exam-status-actions";
import { InviteParticipants } from "./_components/invite-participants";
import { formatDateTime } from "@/lib/utils";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  SCHEDULED: "bg-blue-100 text-blue-800",
  LIVE: "bg-green-100 text-green-800",
  COMPLETED: "bg-indigo-100 text-indigo-800",
  ARCHIVED: "bg-red-100 text-red-800",
};

export default async function ExamDetailPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = await params;
  const [exam, examQuestions] = await Promise.all([
    getExamById(examId),
    getQuestionsByExamId(examId),
  ]);
  if (!exam) notFound();

  const hasQuestions = examQuestions.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon-sm"
              render={<Link href="/admin/exams" />}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">{exam.title}</h1>
            <Badge
              variant="outline"
              className={statusColors[exam.status] || ""}
            >
              {exam.status}
            </Badge>
          </div>
          {exam.description && (
            <p className="ml-11 text-muted-foreground">{exam.description}</p>
          )}
        </div>
        <ExamStatusActions
          examId={exam.id}
          currentStatus={exam.status}
          hasQuestions={hasQuestions}
          questionMode={(exam as any).questionMode || "PRE_GENERATED"}
        />
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{exam.totalQuestions}</p>
              <p className="text-xs text-muted-foreground">Questions</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{exam.durationMinutes}</p>
              <p className="text-xs text-muted-foreground">Minutes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{exam.totalMarks}</p>
              <p className="text-xs text-muted-foreground">Total Marks</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Users className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">
                {exam.sessions?.length || 0}
              </p>
              <p className="text-xs text-muted-foreground">Participants</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="participants">Participants</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Exam Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Difficulty
                  </dt>
                  <dd>
                    <Badge variant="outline">{exam.targetDifficulty}</Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Marks per Question
                  </dt>
                  <dd>
                    +{exam.marksPerQuestion} / -{exam.negativeMarking}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Passing %
                  </dt>
                  <dd>{exam.passingPercentage ?? "Not set"}%</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Shuffle Questions
                  </dt>
                  <dd>{exam.shuffleQuestions ? "Yes" : "No"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Show Results Instantly
                  </dt>
                  <dd>{exam.showResultInstantly ? "Yes" : "No"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    AI Generation
                  </dt>
                  <dd>{exam.useAiGeneration ? "Enabled" : "Disabled"}</dd>
                </div>
                {exam.scheduledStartTime && (
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">
                      Scheduled Start
                    </dt>
                    <dd>{formatDateTime(exam.scheduledStartTime)}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Created
                  </dt>
                  <dd>{formatDateTime(exam.createdAt)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
          {exam.instructions && (
            <Card>
              <CardHeader>
                <CardTitle>Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">
                  {exam.instructions}
                </p>
              </CardContent>
            </Card>
          )}
          {exam.topicConfigs && exam.topicConfigs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Topic Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {exam.topicConfigs.map((tc: any) => (
                    <div
                      key={tc.id}
                      className="flex items-center justify-between rounded-md border p-3"
                    >
                      <span className="font-medium">
                        {tc.topic?.name || tc.topicId}
                      </span>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>{tc.questionCount} questions</span>
                        <Badge variant="outline">{tc.difficulty}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="questions" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>
                Questions
                {examQuestions.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({examQuestions.length} generated)
                  </span>
                )}
              </CardTitle>
              <GenerateQuestionsButton
                examId={exam.id}
                examStatus={exam.status}
              />
            </CardHeader>
            <CardContent>
              {examQuestions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No questions yet. Configure topics in Step 2 of exam creation, then click "Generate with AI".
                </p>
              ) : (
                <div className="space-y-3">
                  {examQuestions.map((q: any, i: number) => (
                    <div key={q.id} className="rounded-md border p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground">
                          Q{i + 1}
                        </span>
                        <div className="flex items-center gap-2">
                          {q.source === "PYQ" && q.tags?.includes("direct") && (
                            <Badge className="bg-purple-100 text-purple-800 text-xs">
                              PYQ {q.pyqSource || ""} {q.pyqYear || ""}
                            </Badge>
                          )}
                          {q.source === "PYQ" && q.tags?.includes("variant") && (
                            <Badge className="bg-indigo-100 text-indigo-800 text-xs">
                              PYQ Variant {q.pyqSource || ""}
                            </Badge>
                          )}
                          {q.source === "AI_GENERATED" && (
                            <Badge variant="outline" className="text-xs text-blue-700">
                              AI Exam Level
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {q.difficulty}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {q.topic?.name}
                          </Badge>
                          <Badge variant="outline" className="text-xs text-green-700">
                            Ans: {q.correctOption}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm">{q.questionText}</p>
                      <div className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                        <span className={q.correctOption === "A" ? "font-medium text-green-700" : ""}>
                          A: {q.optionA}
                        </span>
                        <span className={q.correctOption === "B" ? "font-medium text-green-700" : ""}>
                          B: {q.optionB}
                        </span>
                        <span className={q.correctOption === "C" ? "font-medium text-green-700" : ""}>
                          C: {q.optionC}
                        </span>
                        <span className={q.correctOption === "D" ? "font-medium text-green-700" : ""}>
                          D: {q.optionD}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="participants">
          <InviteParticipants
            examId={exam.id}
            examStatus={exam.status}
            invitations={(exam.invitations || []).map((inv: any) => ({
              id: inv.id,
              email: inv.email,
              status: inv.status,
              invitedAt: inv.invitedAt?.toISOString?.() || inv.invitedAt,
            }))}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
