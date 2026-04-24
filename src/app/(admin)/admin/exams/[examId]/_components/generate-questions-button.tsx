"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, AlertCircle, CheckCircle2 } from "lucide-react";
import { generateQuestionsAction } from "@/server/actions/generate.actions";

interface GenerateQuestionsButtonProps {
  examId: string;
  examStatus: string;
}

export function GenerateQuestionsButton({
  examId,
  examStatus,
}: GenerateQuestionsButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<{
    totalGenerated: number;
    totalFailed: number;
    errors: string[];
  } | null>(null);
  const router = useRouter();

  if (examStatus !== "DRAFT") return null;

  async function handleGenerate() {
    setIsGenerating(true);
    setResult(null);
    try {
      const res = await generateQuestionsAction(examId);
      if (res.success && res.data) {
        setResult({
          totalGenerated: res.data.totalGenerated,
          totalFailed: res.data.totalFailed,
          errors: res.data.errors,
        });
        // Force full page reload to show new questions
        window.location.reload();
      } else {
        setResult({
          totalGenerated: 0,
          totalFailed: 0,
          errors: [res.error || "Generation failed"],
        });
      }
    } catch (err) {
      setResult({
        totalGenerated: 0,
        totalFailed: 0,
        errors: [err instanceof Error ? err.message : "Unexpected error"],
      });
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        {result && result.totalGenerated > 0 && (
          <span className="flex items-center gap-1 text-sm text-green-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {result.totalGenerated} generated
          </span>
        )}
        <Button onClick={handleGenerate} disabled={isGenerating} variant="outline">
          {isGenerating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          {isGenerating ? "Generating (this may take a minute)..." : "Generate with AI"}
        </Button>
      </div>
      {result && result.errors.length > 0 && (
        <div className="max-h-32 overflow-y-auto rounded-md border border-red-200 bg-red-50 p-2">
          {result.errors.map((err, i) => (
            <p key={i} className="flex items-start gap-1 text-xs text-red-700">
              <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
              {err}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
