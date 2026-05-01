"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { XCircle, MinusCircle, ListFilter } from "lucide-react";

interface TopicFilterProps {
  topics: Array<{
    topicId: string;
    name: string;
    wrong: number;
    skipped: number;
  }>;
  exams: Array<{ examId: string; title: string; count: number }>;
  activeTopic?: string;
  activeExam?: string;
  activeType?: string;
  wrongCount: number;
  skippedCount: number;
}

export function TopicFilter({
  topics,
  exams,
  activeTopic,
  activeExam,
  activeType = "all",
  wrongCount,
  skippedCount,
}: TopicFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setFilter(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/mistakes?${params.toString()}`);
  }

  const typeOptions = [
    {
      value: "all",
      label: "All",
      count: wrongCount + skippedCount,
      icon: ListFilter,
      activeClass: "bg-primary text-primary-foreground",
    },
    {
      value: "wrong",
      label: "Wrong Answers",
      count: wrongCount,
      icon: XCircle,
      activeClass: "bg-red-600 text-white",
    },
    {
      value: "skipped",
      label: "Unattempted",
      count: skippedCount,
      icon: MinusCircle,
      activeClass: "bg-gray-600 text-white",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Type filter — Wrong vs Skipped */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {typeOptions.map((opt) => {
          const isActive = activeType === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() =>
                setFilter("type", opt.value === "all" ? null : opt.value)
              }
              className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                isActive
                  ? `${opt.activeClass} border-transparent`
                  : "border-border bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              <opt.icon className="h-3.5 w-3.5" />
              {opt.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  isActive
                    ? "bg-white/20 text-inherit"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {opt.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Topic filters */}
      {topics.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Filter by Topic
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter("topic", null)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                !activeTopic
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              All Topics
            </button>
            {topics.map((t) => (
              <button
                key={t.topicId}
                onClick={() =>
                  setFilter(
                    "topic",
                    activeTopic === t.topicId ? null : t.topicId,
                  )
                }
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTopic === t.topicId
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {t.name} ({t.wrong + t.skipped})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Exam filters */}
      {exams.length > 1 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Filter by Exam
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter("exam", null)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                !activeExam
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              All Exams
            </button>
            {exams.map((e) => (
              <button
                key={e.examId}
                onClick={() =>
                  setFilter(
                    "exam",
                    activeExam === e.examId ? null : e.examId,
                  )
                }
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeExam === e.examId
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {e.title} ({e.count})
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
