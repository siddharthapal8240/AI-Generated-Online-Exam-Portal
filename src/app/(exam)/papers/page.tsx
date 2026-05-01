import { currentUser } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { users, examSessions } from "@/server/schema";
import { eq, and } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Clock, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { DownloadPaperButton } from "../exam/[examId]/result/_components/download-paper-button";

export default async function PapersPage() {
  const clerkUser = await currentUser();
  if (!clerkUser) notFound();

  const dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkUser.id),
    columns: { id: true },
  });
  if (!dbUser) notFound();

  // Get all completed sessions for this user
  const sessions = await db.query.examSessions.findMany({
    where: and(eq(examSessions.userId, dbUser.id)),
    with: {
      exam: {
        columns: {
          id: true,
          title: true,
          totalQuestions: true,
          totalMarks: true,
          durationMinutes: true,
        },
      },
      result: true,
    },
    orderBy: (s, { desc }) => [desc(s.createdAt)],
  });

  const completedSessions = sessions.filter(
    (s) => s.status === "SUBMITTED" || s.status === "AUTO_SUBMITTED",
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          My Question Papers
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Download question papers with solutions from your exams
        </p>
      </div>

      {/* Papers */}
      {completedSessions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/50" />
            <p className="font-medium">No papers yet</p>
            <p className="text-sm text-muted-foreground">
              Take an exam and your question paper will be available here for
              download.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {completedSessions.map((session) => {
            const result = session.result;
            const percentage = result
              ? Math.round(result.percentage)
              : null;

            return (
              <Card key={session.id}>
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    {/* Left — exam info */}
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-base font-semibold">
                        {session.exam.title}
                      </h3>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {session.exam.totalQuestions} questions
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {session.exam.durationMinutes} min
                        </span>
                        <span>{session.exam.totalMarks} marks</span>
                        <span>
                          {new Date(session.createdAt).toLocaleDateString(
                            "en-IN",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            },
                          )}
                        </span>
                      </div>

                      {/* Score summary */}
                      {result && (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge
                            variant="outline"
                            className={
                              percentage !== null && percentage >= 60
                                ? "bg-green-50 text-green-700"
                                : percentage !== null && percentage >= 40
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-red-50 text-red-700"
                            }
                          >
                            {percentage}%
                          </Badge>
                          <span className="flex items-center gap-0.5 text-xs text-green-700">
                            <CheckCircle2 className="h-3 w-3" />
                            {result.correctCount}
                          </span>
                          <span className="flex items-center gap-0.5 text-xs text-red-700">
                            <XCircle className="h-3 w-3" />
                            {result.incorrectCount}
                          </span>
                          <span className="flex items-center gap-0.5 text-xs text-gray-500">
                            <MinusCircle className="h-3 w-3" />
                            {result.unattemptedCount}
                          </span>
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
                        </div>
                      )}
                    </div>

                    {/* Right — download button */}
                    <div className="shrink-0">
                      <DownloadPaperButton examId={session.exam.id} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
