import { notFound } from "next/navigation";
import Link from "next/link";
import { getExamById } from "@/server/data-access/exams";
import { getExamAnalytics } from "@/server/data-access/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Users, Trophy, TrendingUp, TrendingDown } from "lucide-react";
import { ScoreDistributionChart } from "@/components/charts/score-distribution-chart";

export default async function ExamResultsPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = await params;
  const [exam, analytics] = await Promise.all([
    getExamById(examId),
    getExamAnalytics(examId),
  ]);

  if (!exam) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" render={<Link href={`/admin/exams/${examId}`} />}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{exam.title} — Results</h1>
          <p className="text-muted-foreground">Detailed exam analytics</p>
        </div>
      </div>

      {!analytics ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No results yet. Waiting for submissions.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="flex items-center gap-3 pt-6">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{analytics.totalParticipants}</p>
                  <p className="text-xs text-muted-foreground">Participants</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 pt-6">
                <Trophy className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{analytics.averageScore}%</p>
                  <p className="text-xs text-muted-foreground">Average Score</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 pt-6">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{analytics.highestScore}%</p>
                  <p className="text-xs text-muted-foreground">Highest</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 pt-6">
                <TrendingDown className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{analytics.lowestScore}%</p>
                  <p className="text-xs text-muted-foreground">Lowest</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Score Distribution Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Score Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ScoreDistributionChart data={analytics.scoreDistribution} />
            </CardContent>
          </Card>

          {/* Rankings Table */}
          <Card>
            <CardHeader>
              <CardTitle>Rankings</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Rank</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Percentage</TableHead>
                    <TableHead>Correct</TableHead>
                    <TableHead>Wrong</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.rankings.map((r: any) => (
                    <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-bold">#{r.rank}</TableCell>
                      <TableCell>
                        <Link
                          href={`/admin/exams/${examId}/results/${r.sessionId}`}
                          className="block"
                        >
                          <p className="font-medium hover:underline">{r.user?.name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">{r.user?.email}</p>
                        </Link>
                      </TableCell>
                      <TableCell>{r.totalScore}/{r.maxPossibleScore}</TableCell>
                      <TableCell className="font-medium">{Math.round(r.percentage)}%</TableCell>
                      <TableCell className="text-green-700">{r.correctCount}</TableCell>
                      <TableCell className="text-red-700">{r.incorrectCount}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {r.isPassed !== null && (
                            <Badge variant="outline" className={r.isPassed ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                              {r.isPassed ? "Pass" : "Fail"}
                            </Badge>
                          )}
                          <Button variant="ghost" size="xs" render={<Link href={`/admin/exams/${examId}/results/${r.sessionId}`} />}>
                            Details →
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
