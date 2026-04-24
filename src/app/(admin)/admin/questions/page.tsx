import { getQuestions } from "@/server/data-access/questions";
import { getTopicsWithChildren } from "@/server/data-access/topics";
import { QuestionTable } from "./_components/question-table";
import { QuestionFilters } from "./_components/question-filters";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function QuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    topicId?: string;
    source?: string;
    difficulty?: string;
    search?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const [result, topicsData] = await Promise.all([
    getQuestions({
      topicId: params.topicId,
      source: params.source,
      difficulty: params.difficulty,
      search: params.search,
      page: params.page ? parseInt(params.page) : 1,
    }),
    getTopicsWithChildren(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Question Bank</h1>
          <p className="text-muted-foreground">
            {result.totalCount} question{result.totalCount !== 1 ? "s" : ""} in
            the bank
          </p>
        </div>
        <Button render={<Link href="/admin/questions/new" />}>
          <Plus className="mr-2 h-4 w-4" />
          Add Question
        </Button>
      </div>
      <QuestionFilters topics={topicsData} />
      <QuestionTable
        questions={result.data}
        totalCount={result.totalCount}
        page={result.page}
        totalPages={result.totalPages}
      />
    </div>
  );
}
