"use client";

import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from "recharts";

interface TopicRadarChartProps {
  data: Array<{ topic: string; accuracy: number }>;
}

export function TopicRadarChart({ data }: TopicRadarChartProps) {
  if (data.length === 0) return <p className="text-sm text-muted-foreground">No data</p>;

  return (
    <ResponsiveContainer width="100%" height={350}>
      <RadarChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
        <PolarGrid className="stroke-border" />
        <PolarAngleAxis
          dataKey="topic"
          fontSize={11}
          className="fill-muted-foreground"
          tick={{ fill: "hsl(var(--muted-foreground))" }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          fontSize={10}
          className="fill-muted-foreground"
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--background))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          formatter={(value: number) => [`${value}%`, "Accuracy"]}
        />
        <Radar
          dataKey="accuracy"
          stroke="hsl(var(--primary))"
          fill="hsl(var(--primary))"
          fillOpacity={0.2}
          strokeWidth={2}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
