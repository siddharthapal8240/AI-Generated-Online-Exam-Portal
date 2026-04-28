import { db } from "@/server/db";
import { examResults, exams, users, topicBreakdowns } from "@/server/schema";
import { eq, desc, asc, and, count, avg, sql } from "drizzle-orm";

// ─── Dashboard Overview ──────────────────────────────────────────────────────

export async function getDashboardStats() {
  const [examCount] = await db.select({ count: count() }).from(exams);
  const [participantCount] = await db
    .select({ count: count() })
    .from(users)
    .where(eq(users.role, "PARTICIPANT"));
  const [resultCount] = await db.select({ count: count() }).from(examResults);

  const upcomingExams = await db.query.exams.findMany({
    where: eq(exams.status, "SCHEDULED"),
    orderBy: [asc(exams.scheduledStartTime)],
    limit: 5,
  });

  const liveExams = await db.query.exams.findMany({
    where: eq(exams.status, "LIVE"),
  });

  const recentResults = await db.query.examResults.findMany({
    orderBy: [desc(examResults.createdAt)],
    limit: 10,
    with: {
      exam: true,
      user: true,
    },
  });

  return {
    totalExams: examCount?.count ?? 0,
    totalParticipants: participantCount?.count ?? 0,
    totalResults: resultCount?.count ?? 0,
    upcomingExams,
    liveExams,
    liveCount: liveExams.length,
    recentResults,
  };
}

// ─── Per-Exam Analytics ──────────────────────────────────────────────────────

export async function getExamAnalytics(examId: string) {
  const results = await db.query.examResults.findMany({
    where: eq(examResults.examId, examId),
    orderBy: [desc(examResults.totalScore)],
    with: { user: true },
  });

  if (results.length === 0) return null;

  const scores = results.map((r) => r.percentage);
  const sorted = [...scores].sort((a, b) => a - b);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];

  // Score distribution (10 buckets: 0-10, 10-20, ..., 90-100)
  const distribution = Array.from({ length: 10 }, (_, i) => ({
    range: `${i * 10}-${(i + 1) * 10}`,
    min: i * 10,
    max: (i + 1) * 10,
    count: 0,
  }));

  for (const score of scores) {
    const bucket = Math.min(Math.floor(score / 10), 9);
    distribution[bucket].count++;
  }

  // Assign ranks
  const ranked = results.map((r, i) => ({
    ...r,
    rank: i + 1,
  }));

  return {
    totalParticipants: results.length,
    averageScore: Math.round(avgScore * 10) / 10,
    medianScore: Math.round(median * 10) / 10,
    highestScore: Math.round(Math.max(...scores) * 10) / 10,
    lowestScore: Math.round(Math.min(...scores) * 10) / 10,
    passCount: results.filter((r) => r.isPassed === true).length,
    failCount: results.filter((r) => r.isPassed === false).length,
    scoreDistribution: distribution,
    rankings: ranked,
  };
}

// ─── Per-Participant Analytics ───────────────────────────────────────────────

export async function getParticipantAnalytics(userId: string) {
  const results = await db.query.examResults.findMany({
    where: eq(examResults.userId, userId),
    orderBy: [asc(examResults.createdAt)],
    with: { exam: true },
  });

  if (results.length === 0) return null;

  const scores = results.map((r) => r.percentage);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

  // Score trend data for line chart
  const scoreTrend = results.map((r) => ({
    examId: r.examId,
    examTitle: r.exam.title,
    date: r.createdAt.toISOString().split("T")[0],
    percentage: Math.round(r.percentage * 10) / 10,
    score: r.totalScore,
    maxScore: r.maxPossibleScore,
  }));

  // Topic-wise performance aggregation
  const topicMap = new Map<string, { correct: number; total: number; timeSec: number }>();

  for (const result of results) {
    const breakdowns = await db.query.topicBreakdowns.findMany({
      where: eq(topicBreakdowns.resultId, result.id),
    });

    for (const tb of breakdowns) {
      const existing = topicMap.get(tb.topicName) || { correct: 0, total: 0, timeSec: 0 };
      existing.correct += tb.correctCount;
      existing.total += tb.totalQuestions;
      existing.timeSec += tb.avgTimeSec * tb.totalQuestions;
      topicMap.set(tb.topicName, existing);
    }
  }

  const topicPerformance = Array.from(topicMap.entries()).map(([name, data]) => ({
    topic: name,
    accuracy: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
    totalQuestions: data.total,
    correctCount: data.correct,
    avgTimeSec: data.total > 0 ? Math.round(data.timeSec / data.total) : 0,
  }));

  // Strengths and weaknesses
  const sorted = [...topicPerformance].sort((a, b) => b.accuracy - a.accuracy);
  const strengths = sorted.filter((t) => t.accuracy >= 70).slice(0, 5);
  const weaknesses = sorted.filter((t) => t.accuracy < 50).slice(-5).reverse();

  return {
    totalExams: results.length,
    averageScore: Math.round(avgScore * 10) / 10,
    highestScore: Math.round(Math.max(...scores) * 10) / 10,
    lowestScore: Math.round(Math.min(...scores) * 10) / 10,
    passRate: results.filter((r) => r.isPassed).length / results.length * 100,
    scoreTrend,
    topicPerformance,
    strengths,
    weaknesses,
    recentResults: results.slice(-10),
  };
}

// ─── Participant List ────────────────────────────────────────────────────────

export async function getParticipantsList(params: {
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const { search, page = 1, pageSize = 20 } = params;

  const conditions = [eq(users.role, "PARTICIPANT")];
  if (search) {
    conditions.push(sql`(${users.name} ILIKE ${'%' + search + '%'} OR ${users.email} ILIKE ${'%' + search + '%'})`);
  }

  const where = and(...conditions);

  const [data, total] = await Promise.all([
    db.query.users.findMany({
      where,
      orderBy: [desc(users.createdAt)],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }),
    db.select({ count: count() }).from(users).where(where),
  ]);

  // Get result counts per user
  const userIds = data.map((u) => u.id);
  const resultCounts = userIds.length > 0
    ? await Promise.all(
        userIds.map(async (uid) => {
          const [rc] = await db.select({ count: count() }).from(examResults).where(eq(examResults.userId, uid));
          const [avgR] = await db.select({ avg: avg(examResults.percentage) }).from(examResults).where(eq(examResults.userId, uid));
          return { userId: uid, examCount: rc?.count ?? 0, avgScore: avgR?.avg ? parseFloat(String(avgR.avg)) : null };
        }),
      )
    : [];

  const enriched = data.map((u) => {
    const stats = resultCounts.find((r) => r.userId === u.id);
    return {
      ...u,
      examCount: stats?.examCount ?? 0,
      avgScore: stats?.avgScore ? Math.round(stats.avgScore * 10) / 10 : null,
    };
  });

  return {
    data: enriched,
    totalCount: total[0]?.count ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((total[0]?.count ?? 0) / pageSize),
  };
}