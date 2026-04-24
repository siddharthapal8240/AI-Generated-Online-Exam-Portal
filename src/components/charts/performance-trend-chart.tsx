"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface PerformanceTrendChartProps {
  data: Array<{ examTitle: string; date: string; percentage: number }>;
}

export function PerformanceTrendChart({ data }: PerformanceTrendChartProps) {
  if (data.length === 0) return <p className="text-sm text-muted-foreground">No data</p>;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="date"
          fontSize={12}
          tickLine={false}
          className="fill-muted-foreground"
        />
        <YAxis
          fontSize={12}
          tickLine={false}
          className="fill-muted-foreground"
          domain={[0, 100]}
          unit="%"
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--background))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          formatter={(value: number) => [`${value}%`, "Score"]}
        />
        <Line
          type="monotone"
          dataKey="percentage"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={{ r: 4, fill: "hsl(var(--primary))" }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
