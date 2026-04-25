"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Pencil, Copy, Trash2 } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { deleteExamAction } from "@/server/actions/exam.actions";

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  SCHEDULED: "bg-blue-100 text-blue-800",
  LIVE: "bg-green-100 text-green-800",
  COMPLETED: "bg-indigo-100 text-indigo-800",
  ARCHIVED: "bg-red-100 text-red-800",
};

interface ExamTableProps {
  exams: any[];
  totalCount: number;
  page: number;
  totalPages: number;
}

export function ExamTable({
  exams,
  totalCount,
  page,
  totalPages,
}: ExamTableProps) {
  const router = useRouter();

  if (exams.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-muted-foreground">No exams found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Questions</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Difficulty</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {exams.map((exam) => (
              <TableRow
                key={exam.id}
                className="cursor-pointer"
                onClick={() => router.push(`/admin/exams/${exam.id}`)}
              >
                <TableCell className="font-medium">{exam.title}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={statusColors[exam.status] || ""}
                  >
                    {exam.status}
                  </Badge>
                </TableCell>
                <TableCell>{exam.totalQuestions}</TableCell>
                <TableCell>{exam.durationMinutes} min</TableCell>
                <TableCell>
                  <Badge variant="outline">{exam.targetDifficulty}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDateTime(exam.createdAt)}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon-sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/admin/exams/${exam.id}`);
                        }}
                      >
                        <Eye className="mr-2 h-4 w-4" /> View
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/admin/exams/${exam.id}?edit=true`);
                        }}
                      >
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (
                            confirm(
                              "Are you sure you want to delete this exam?",
                            )
                          ) {
                            await deleteExamAction(exam.id);
                          }
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {totalCount} exam{totalCount !== 1 ? "s" : ""} total
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const params = new URLSearchParams(window.location.search);
              params.set("page", String(Math.max(1, page - 1)));
              window.location.search = params.toString();
            }}
            disabled={page <= 1}
            className="rounded-md border px-3 py-1 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-40 disabled:pointer-events-none"
          >
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => {
              const params = new URLSearchParams(window.location.search);
              params.set("page", String(Math.min(totalPages, page + 1)));
              window.location.search = params.toString();
            }}
            disabled={page >= totalPages}
            className="rounded-md border px-3 py-1 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-40 disabled:pointer-events-none"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
