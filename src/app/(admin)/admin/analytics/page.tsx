import { getDashboardStats } from "@/server/data-access/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FileText, Users, Trophy, Radio, ArrowRight } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export default async function AnalyticsPage() {
  const stats = await getDashboardStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">Platform overview and performance insights</p>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Exams</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalExams}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Participants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalParticipants}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Submissions</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalResults}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Live Now</CardTitle>
            <Radio className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.liveCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Results */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentResults.length === 0 ? (
            <p className="text-sm text-muted-foreground">No submissions yet.</p>
          ) : (
            <div className="space-y-3">
              {stats.recentResults.map((result: any) => (
                <div key={result.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{result.user?.name || "Unknown"}</p>
                    <p className="text-sm text-muted-foreground">{result.exam?.title || "Unknown Exam"}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-bold">{Math.round(result.percentage)}%</p>
                      <p className="text-xs text-muted-foreground">
                        {result.totalScore}/{result.maxPossibleScore}
                      </p>
                    </div>
                    {result.isPassed !== null && (
                      <Badge variant="outline" className={result.isPassed ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                        {result.isPassed ? "Pass" : "Fail"}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Exams */}
      {stats.upcomingExams.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Exams</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.upcomingExams.map((exam: any) => (
                <div key={exam.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{exam.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {exam.scheduledStartTime ? formatDateTime(exam.scheduledStartTime) : "Not scheduled"}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" render={<Link href={`/admin/exams/${exam.id}`} />}>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
