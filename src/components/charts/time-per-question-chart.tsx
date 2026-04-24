"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface TimePerQuestionChartProps {
  data: Array<{ question: string; timeSec: number; isCorrect: boolean | null }>;
  avgTimeSec?: number;
}

export function TimePerQuestionChart({ data, avgTimeSec }: TimePerQuestionChartProps) {
  if (data.length === 0) return <p className="text-sm text-muted-foreground">No data</p>;

  const avg = avgTimeSec || data.reduce((a, b) => a + b.timeSec, 0) / data.length;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="question" fontSize={11} tickLine={false} className="fill-muted-foreground" />
        <YAxis fontSize={12} tickLine={false} className="fill-muted-foreground" unit="s" />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--background))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          formatter={(value: number) => [`${value}s`, "Time"]}
        />
        <Bar dataKey="timeSec" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell
              key={index}
              fill={
                entry.timeSec < avg * 0.3
                  ? "#f59e0b" // too fast - amber
                  : entry.timeSec > avg * 2.5
                    ? "#ef4444" // too slow - red
                    : entry.isCorrect
                      ? "#22c55e" // correct - green
                      : "#94a3b8" // wrong/unanswered - gray
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
