"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search } from "lucide-react";
import { useState, useCallback } from "react";

const sources = [
  { value: "ALL", label: "All Sources" },
  { value: "MANUAL", label: "Manual" },
  { value: "AI_GENERATED", label: "AI Generated" },
  { value: "PYQ", label: "PYQ" },
];

const difficulties = [
  { value: "ALL", label: "All" },
  { value: "EASY", label: "Easy" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HARD", label: "Hard" },
];

interface QuestionFiltersProps {
  topics: Array<{
    id: string;
    name: string;
    children: Array<{ id: string; name: string }>;
  }>;
}

export function QuestionFilters({ topics }: QuestionFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "ALL") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      router.push(`/admin/questions?${params.toString()}`);
    },
    [router, searchParams],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          defaultValue={searchParams.get("source") || "ALL"}
          onValueChange={(v) => updateParams("source", v)}
        >
          <TabsList>
            {sources.map((s) => (
              <TabsTrigger key={s.value} value={s.value}>
                {s.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search questions..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") updateParams("search", search);
            }}
          />
        </div>
      </div>
      <div className="flex gap-2">
        {difficulties.map((d) => (
          <button
            key={d.value}
            onClick={() => updateParams("difficulty", d.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              (searchParams.get("difficulty") || "ALL") === d.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>
    </div>
  );
}
