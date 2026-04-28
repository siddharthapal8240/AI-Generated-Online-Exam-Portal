"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface TopicFilterProps {
  topics: Array<{ topicId: string; name: string; wrong: number; skipped: number }>;
  exams: Array<{ examId: string; title: string; count: number }>;
  activeTopic?: string;
  activeExam?: string;
}

export function TopicFilter({
  topics,
  exams,
  activeTopic,
  activeExam,
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

  return (
    <div className="space-y-3">
      {/* Topic filters */}
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
