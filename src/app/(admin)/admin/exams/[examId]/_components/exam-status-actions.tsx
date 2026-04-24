"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Play,
  Calendar,
  CheckCircle2,
  Archive,
  MoreVertical,
  Loader2,
  Copy,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { updateExamStatusAction, deleteExamAction } from "@/server/actions/exam.actions";

interface ExamStatusActionsProps {
  examId: string;
  currentStatus: string;
  hasQuestions: boolean;
  questionMode: string;
}

const STATUS_TRANSITIONS: Record<
  string,
  { label: string; target: string; icon: typeof Play; variant: string; description: string }[]
> = {
  DRAFT: [
    {
      label: "Go Live Now",
      target: "LIVE",
      icon: Play,
      variant: "default",
      description: "Make this exam immediately available for participants to take.",
    },
    {
      label: "Schedule",
      target: "SCHEDULED",
      icon: Calendar,
      variant: "outline",
      description: "Schedule this exam for the configured start time.",
    },
  ],
  SCHEDULED: [
    {
      label: "Go Live Now",
      target: "LIVE",
      icon: Play,
      variant: "default",
      description: "Start this exam immediately, regardless of schedule.",
    },
    {
      label: "Back to Draft",
      target: "DRAFT",
      icon: Archive,
      variant: "outline",
      description: "Move back to draft for editing.",
    },
  ],
  LIVE: [
    {
      label: "End Exam",
      target: "COMPLETED",
      icon: CheckCircle2,
      variant: "destructive",
      description: "End the exam now. Participants still taking it will be auto-submitted.",
    },
  ],
  COMPLETED: [
    {
      label: "Archive",
      target: "ARCHIVED",
      icon: Archive,
      variant: "outline",
      description: "Archive this exam. It won't appear in active lists.",
    },
    {
      label: "Reopen as Live",
      target: "LIVE",
      icon: Play,
      variant: "default",
      description: "Reopen this exam for more participants.",
    },
  ],
  ARCHIVED: [
    {
      label: "Restore to Draft",
      target: "DRAFT",
      icon: Archive,
      variant: "outline",
      description: "Restore this exam as a draft.",
    },
  ],
};

export function ExamStatusActions({ examId, currentStatus, hasQuestions, questionMode }: ExamStatusActionsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    label: string;
    target: string;
    description: string;
  } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const router = useRouter();

  const transitions = STATUS_TRANSITIONS[currentStatus] || [];

  async function handleStatusChange(target: string) {
    setIsLoading(true);
    setConfirmAction(null);
    const result = await updateExamStatusAction(examId, target);
    setIsLoading(false);
    if (result.success) {
      router.refresh();
    } else {
      alert(result.error || "Failed to update status");
    }
  }

  async function handleDelete() {
    setIsLoading(true);
    setShowDeleteConfirm(false);
    const result = await deleteExamAction(examId);
    setIsLoading(false);
    if (result.success) {
      router.push("/admin/exams");
    } else {
      alert(result.error || "Failed to delete exam");
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Primary action buttons */}
        {transitions.map((t) => {
          const Icon = t.icon;
          // Dynamic mode doesn't need pre-generated questions — they're generated per user on start
          const needsQuestions = (t.target === "LIVE" || t.target === "SCHEDULED") && !hasQuestions && questionMode !== "DYNAMIC";

          return (
            <Button
              key={t.target}
              variant={t.variant as any}
              size="sm"
              disabled={isLoading || needsQuestions}
              onClick={() => setConfirmAction({ label: t.label, target: t.target, description: t.description })}
              title={needsQuestions ? "Generate questions first" : undefined}
            >
              {isLoading ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Icon className="mr-1.5 h-3.5 w-3.5" />
              )}
              {t.label}
            </Button>
          );
        })}

        {/* More actions dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button variant="ghost" size="icon-sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => router.push(`/admin/exams/${examId}/results`)}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              View Results
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {currentStatus === "DRAFT" && (
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Exam
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Status change confirmation dialog */}
      <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmAction?.label}</DialogTitle>
            <DialogDescription>{confirmAction?.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)}>
              Cancel
            </Button>
            <Button onClick={() => confirmAction && handleStatusChange(confirmAction.target)}>
              {confirmAction?.label}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Exam
            </DialogTitle>
            <DialogDescription>
              Are you sure? This will permanently delete this exam and all its data. This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
