import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getExams } from "@/server/data-access/exams";
import { ExamTable } from "./_components/exam-table";
import { ExamFilters } from "./_components/exam-filters";

export default async function ExamsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; page?: string }>;
}) {
  const params = await searchParams;
  const result = await getExams({
    status: params.status,
    search: params.search,
    page: params.page ? parseInt(params.page) : 1,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Exams</h1>
          <p className="text-muted-foreground">Create and manage your exams</p>
        </div>
        <Button render={<Link href="/admin/exams/new" />}>
          <Plus className="mr-2 h-4 w-4" />
          Create Exam
        </Button>
      </div>
      <ExamFilters />
      <ExamTable
        exams={result.data}
        totalCount={result.totalCount}
        page={result.page}
        totalPages={result.totalPages}
      />
    </div>
  );
}
