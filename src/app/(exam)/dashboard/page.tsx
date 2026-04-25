import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { exams, examResults, users } from "@/server/schema";
import { eq, desc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Calendar, Clock, BookOpen, Trophy, ArrowRight } from "lucide-react";

export default async function ParticipantDashboard() {
  // Get current user
  const clerkUser = await currentUser();
  const clerkId = clerkUser?.id;

  // Find the DB user for the current Clerk user
  let dbUserId: string | null = null;
  if (clerkId) {
    const dbUser = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
      columns: { id: true },
    });
    dbUserId = dbUser?.id || null;
  }

  // Get available exams (LIVE and SCHEDULED only for participants)
  const availableExams = await db.query.exams.findMany({
    orderBy: [desc(exams.createdAt)],
    limit: 20,
    with: {
      topicConfigs: {
        with: { topic: true },
      },
    },
  });

  const liveExams = availableExams.filter(
    (e) => e.status === "LIVE" || e.status === "SCHEDULED",
  );

  // Get ONLY this user's results
  const myResults = dbUserId
    ? await db.query.examResults.findMany({
        where: eq(examResults.userId, dbUserId),
        orderBy: [desc(examResults.createdAt)],
        limit: 20,
        with: { exam: true },
      })
    : [];

  const avgScore =
    myResults.length > 0
      ? Math.round(
          myResults.reduce((a, r) => a + r.percentage, 0) / myResults.length,
        )
      : null;

  const bestScore =
    myResults.length > 0
      ? Math.round(Math.max(...myResults.map((r) => r.percentage)))
      : null;

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome{clerkUser?.firstName ? `, ${clerkUser.firstName}` : ""}!
        </h1>
        <p className="text-muted-foreground">
          Here are your upcoming and past exams
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Available Exams
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{liveExams.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Exams Taken
            </CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myResults.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Score
            </CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {avgScore !== null ? `${avgScore}%` : "-"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Best Score
            </CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {bestScore !== null ? `${bestScore}%` : "-"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Available Exams */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Available Exams</h2>
        {liveExams.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Calendar className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">
                No exams available right now.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {liveExams.map((exam) => (
              <Card key={exam.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{exam.title}</CardTitle>
                    <Badge
                      variant="outline"
                      className={
                        exam.status === "LIVE"
                          ? "bg-green-100 text-green-800"
                          : "bg-blue-100 text-blue-800"
                      }
                    >
                      {exam.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {exam.durationMinutes}{" "}
                      min
                    </span>
                    <span>{exam.totalQuestions} questions</span>
                    <span>{exam.totalMarks} marks</span>
                  </div>
                  {exam.description && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {exam.description}
                    </p>
                  )}
                  {/* Show topics */}
                  {exam.topicConfigs && exam.topicConfigs.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {(exam.topicConfigs as any[]).map((tc: any) => (
                        <span
                          key={tc.id}
                          className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                        >
                          {tc.topic?.name}
                        </span>
                      ))}
                    </div>
                  )}
                  <Button
                    size="sm"
                    render={<Link href={`/exam/${exam.id}`} />}
                  >
                    View Details <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* My Results */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">My Results</h2>
        {myResults.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">
                No results yet. Take an exam to see your results here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {myResults.map((result) => (
              <Card key={result.id}>
                <CardContent className="flex items-center justify-between pt-6">
                  <div>
                    <p className="font-medium">{result.exam?.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {result.correctCount} correct, {result.incorrectCount}{" "}
                      wrong, {result.unattemptedCount} skipped
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xl font-bold">
                        {Math.round(result.percentage)}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {result.totalScore}/{result.maxPossibleScore}
                      </p>
                    </div>
                    {result.isPassed !== null && (
                      <Badge
                        variant="outline"
                        className={
                          result.isPassed
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }
                      >
                        {result.isPassed ? "Pass" : "Fail"}
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      render={
                        <Link href={`/exam/${result.examId}/result`} />
                      }
                    >
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
