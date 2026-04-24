import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/server/db";
import { users } from "@/server/schema";
import { eq } from "drizzle-orm";
import { getParticipantAnalytics } from "@/server/data-access/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trophy, Target, TrendingUp, BookOpen } from "lucide-react";
import { PerformanceTrendChart } from "@/components/charts/performance-trend-chart";
import { TopicRadarChart } from "@/components/charts/topic-radar-chart";
import { TopicBarChart } from "@/components/charts/topic-bar-chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function ParticipantDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  if (!user) notFound();

  const analytics = await getParticipantAnalytics(userId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" render={<Link href="/admin/participants" />}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{user.name}</h1>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
      </div>

      {!analytics ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No exam data available for this participant.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-4">
            <Card>
              <CardContent className="flex items-center gap-3 pt-6">
                <BookOpen className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{analytics.totalExams}</p>
                  <p className="text-xs text-muted-foreground">Exams Taken</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 pt-6">
                <Target className="h-5 w-5 text-muted-foreground" />
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
                  <p className="text-xs text-muted-foreground">Best Score</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 pt-6">
                <Trophy className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{Math.round(analytics.passRate)}%</p>
                  <p className="text-xs text-muted-foreground">Pass Rate</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="performance">
            <TabsList>
              <TabsTrigger value="performance">Performance Trend</TabsTrigger>
              <TabsTrigger value="topics">Topic Analysis</TabsTrigger>
              <TabsTrigger value="strengths">Strengths & Weaknesses</TabsTrigger>
            </TabsList>

            <TabsContent value="performance">
              <Card>
                <CardHeader>
                  <CardTitle>Score Trend Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <PerformanceTrendChart data={analytics.scoreTrend} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="topics" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Topic-wise Accuracy</CardTitle>
                </CardHeader>
                <CardContent>
                  <TopicRadarChart data={analytics.topicPerformance} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Topic Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <TopicBarChart data={analytics.topicPerformance} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="strengths">
              <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-green-700">Strengths</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analytics.strengths.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Not enough data yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {analytics.strengths.map((s: any) => (
                          <div key={s.topic} className="flex items-center justify-between rounded-md border border-green-200 bg-green-50 p-2">
                            <span className="text-sm font-medium">{s.topic}</span>
                            <Badge className="bg-green-100 text-green-800">{s.accuracy}%</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-red-700">Weaknesses</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analytics.weaknesses.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Not enough data yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {analytics.weaknesses.map((w: any) => (
                          <div key={w.topic} className="flex items-center justify-between rounded-md border border-red-200 bg-red-50 p-2">
                            <span className="text-sm font-medium">{w.topic}</span>
                            <Badge className="bg-red-100 text-red-800">{w.accuracy}%</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
