"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { createQuestionAction } from "@/server/actions/question.actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Check } from "lucide-react";
import Link from "next/link";

type QuestionFormInput = {
  topicId: string;
  source: "AI_GENERATED" | "PYQ" | "MANUAL";
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: "A" | "B" | "C" | "D";
  explanation: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  pyqSource?: string;
  pyqYear?: number;
  tags: string[];
};

export default function NewQuestionPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [topics, setTopics] = useState<any[]>([]);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<QuestionFormInput>({
    defaultValues: {
      source: "MANUAL",
      difficulty: "MEDIUM",
      correctOption: "A",
      topicId: "",
      questionText: "",
      optionA: "",
      optionB: "",
      optionC: "",
      optionD: "",
      explanation: "",
      tags: [],
    },
  });

  useEffect(() => {
    fetch("/api/topics")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setTopics(data.data);
      })
      .catch(console.error);
  }, []);

  async function onSubmit(data: QuestionFormInput) {
    setIsSubmitting(true);
    const result = await createQuestionAction(data);
    setIsSubmitting(false);
    if (result.success) {
      router.push("/admin/questions");
    } else {
      alert(result.error || "Failed to create question");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          render={<Link href="/admin/questions" />}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add Question</h1>
          <p className="text-muted-foreground">
            Manually add a question to the bank
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Topic & Metadata */}
        <Card>
          <CardHeader>
            <CardTitle>Question Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="topicId">Topic *</Label>
                <select
                  id="topicId"
                  {...register("topicId")}
                  className="flex h-8 w-full rounded-lg border border-border bg-background px-3 text-sm"
                >
                  <option value="">Select a topic...</option>
                  {topics.map((parent: any) => (
                    <optgroup key={parent.id} label={parent.name}>
                      {parent.children?.map((child: any) => (
                        <option key={child.id} value={child.id}>
                          {child.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {errors.topicId && (
                  <p className="text-sm text-destructive">
                    {errors.topicId.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <div className="flex gap-2">
                  {(["EASY", "MEDIUM", "HARD"] as const).map((d) => (
                    <Badge
                      key={d}
                      variant={watch("difficulty") === d ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => setValue("difficulty", d)}
                    >
                      {d}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Source</Label>
                <div className="flex gap-2">
                  {(["MANUAL", "PYQ"] as const).map((s) => (
                    <Badge
                      key={s}
                      variant={watch("source") === s ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => setValue("source", s)}
                    >
                      {s.replace("_", " ")}
                    </Badge>
                  ))}
                </div>
              </div>
              {watch("source") === "PYQ" && (
                <div className="space-y-2">
                  <Label htmlFor="pyqSource">PYQ Source</Label>
                  <Input
                    id="pyqSource"
                    placeholder="e.g., IBPS PO"
                    {...register("pyqSource")}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Question Content */}
        <Card>
          <CardHeader>
            <CardTitle>Question & Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="questionText">Question Text *</Label>
              <Textarea
                id="questionText"
                rows={3}
                placeholder="Enter the question..."
                {...register("questionText")}
              />
              {errors.questionText && (
                <p className="text-sm text-destructive">
                  {errors.questionText.message}
                </p>
              )}
            </div>
            {(["A", "B", "C", "D"] as const).map((opt) => (
              <div key={opt} className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => setValue("correctOption", opt)}
                  className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm font-medium transition-colors ${
                    watch("correctOption") === opt
                      ? "border-green-500 bg-green-100 text-green-800"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {watch("correctOption") === opt ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    opt
                  )}
                </button>
                <div className="flex-1 space-y-1">
                  <Input
                    placeholder={`Option ${opt}...`}
                    {...register(`option${opt}` as any)}
                  />
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Click the circle to mark the correct answer. Currently: Option{" "}
              {watch("correctOption")}
            </p>
          </CardContent>
        </Card>

        {/* Explanation */}
        <Card>
          <CardHeader>
            <CardTitle>Solution / Explanation</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              rows={4}
              placeholder="Explain the solution step by step..."
              {...register("explanation")}
            />
            {errors.explanation && (
              <p className="text-sm text-destructive">
                {errors.explanation.message}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Question
          </Button>
        </div>
      </form>
    </div>
  );
}
