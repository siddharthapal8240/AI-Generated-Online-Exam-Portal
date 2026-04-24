"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface TopicBarChartProps {
  data: Array<{ topic: string; accuracy: number }>;
}

const COLORS = {
  high: "#22c55e",   // green
  medium: "#f59e0b", // amber
  low: "#ef4444",    // red
};

export function TopicBarChart({ data }: TopicBarChartProps) {
  if (data.length === 0) return <p className="text-sm text-muted-foreground">No data</p>;

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 40)}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 80 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} fontSize={12} unit="%" className="fill-muted-foreground" />
        <YAxis type="category" dataKey="topic" fontSize={12} width={80} className="fill-muted-foreground" />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--background))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          formatter={(value: number) => [`${value}%`, "Accuracy"]}
        />
        <Bar dataKey="accuracy" radius={[0, 4, 4, 0]}>
          {data.map((entry, index) => (
            <Cell
              key={index}
              fill={entry.accuracy >= 70 ? COLORS.high : entry.accuracy >= 40 ? COLORS.medium : COLORS.low}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
