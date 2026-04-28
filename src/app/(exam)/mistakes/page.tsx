import { currentUser } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { users } from "@/server/schema";
import { eq } from "drizzle-orm";
import {
  getWrongQuestions,
  getWrongQuestionStats,
} from "@/server/data-access/wrong-questions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { XCircle, MinusCircle, BookOpen, Target } from "lucide-react";
import { WrongQuestionsList } from "./_components/wrong-questions-list";
import { TopicFilter } from "./_components/topic-filter";

export default async function MistakesPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string; exam?: string }>;
}) {
  const clerkUser = await currentUser();
  if (!clerkUser) notFound();

  const dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkUser.id),
    columns: { id: true },
  });
  if (!dbUser) notFound();

  const params = await searchParams;
  const [wrongQuestions, stats] = await Promise.all([
    getWrongQuestions(dbUser.id, {
      topicId: params.topic,
      examId: params.exam,
    }),
    getWrongQuestionStats(dbUser.id),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          My Mistakes
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Review your wrong and skipped questions — practice makes perfect
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4 sm:pt-6">
            <BookOpen className="h-5 w-5 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-xl font-bold sm:text-2xl">{stats.total}</p>
              <p className="text-[10px] text-muted-foreground sm:text-xs">
                Total
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4 sm:pt-6">
            <XCircle className="h-5 w-5 shrink-0 text-red-500" />
            <div>
              <p className="text-xl font-bold text-red-700 sm:text-2xl">
                {stats.totalWrong}
              </p>
              <p className="text-[10px] text-muted-foreground sm:text-xs">
                Wrong
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4 sm:pt-6">
            <MinusCircle className="h-5 w-5 shrink-0 text-gray-400" />
            <div>
              <p className="text-xl font-bold text-gray-600 sm:text-2xl">
                {stats.totalSkipped}
              </p>
              <p className="text-[10px] text-muted-foreground sm:text-xs">
                Skipped
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4 sm:pt-6">
            <Target className="h-5 w-5 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-xl font-bold sm:text-2xl">
                {stats.byTopic.length}
              </p>
              <p className="text-[10px] text-muted-foreground sm:text-xs">
                Topics
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weak Topics */}
      {stats.byTopic.length > 0 && (
        <Card>
          <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-3">
            <CardTitle className="text-sm sm:text-base">
              Weak Topics (most mistakes)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="flex flex-wrap gap-2">
              {stats.byTopic.slice(0, 8).map((t) => (
                <Badge
                  key={t.topicId}
                  variant="outline"
                  className="bg-red-50 text-red-800"
                >
                  {t.name}: {t.wrong + t.skipped}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <TopicFilter
        topics={stats.byTopic}
        exams={stats.byExam}
        activeTopic={params.topic}
        activeExam={params.exam}
      />

      {/* Questions List */}
      {wrongQuestions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground/50" />
            <p className="font-medium">No mistakes yet!</p>
            <p className="text-sm text-muted-foreground">
              {params.topic || params.exam
                ? "No mistakes found for this filter. Try a different topic or exam."
                : "Take an exam and your wrong/skipped questions will appear here for review."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <WrongQuestionsList questions={wrongQuestions} />
      )}
    </div>
  );
}
