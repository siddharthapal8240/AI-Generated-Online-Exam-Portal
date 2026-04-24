"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createExamSchema,
  type CreateExamInput,
  type CreateExamFormInput,
} from "@/lib/validations/exam.schema";
import { createExamAction, saveExamTopicConfigsAction } from "@/server/actions/exam.actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Loader2, Plus, Minus, X } from "lucide-react";

const steps = [
  { title: "Basic Info", description: "Exam name and schedule" },
  { title: "Topics", description: "Subjects and topics" },
  { title: "Scoring", description: "Marks and grading" },
  { title: "Settings", description: "Behavior options" },
];

interface TopicSelection {
  topicId: string;
  topicName: string;
  parentName: string;
  questionCount: number;
  difficulty: "EASY" | "MEDIUM" | "HARD";
}

interface TopicData {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  children: { id: string; name: string; slug: string }[];
}

export default function CreateExamPage() {
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [topics, setTopics] = useState<TopicData[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<TopicSelection[]>([]);
  const router = useRouter();

  const form = useForm<CreateExamFormInput, unknown, CreateExamInput>({
    resolver: zodResolver(createExamSchema),
    defaultValues: {
      title: "",
      description: "",
      instructions: "",
      durationMinutes: 60,
      totalQuestions: 30,
      targetDifficulty: "MEDIUM",
      questionMode: "PRE_GENERATED",
      poolMultiplier: 3,
      useAiGeneration: true,
      usePyqBank: true,
      shuffleQuestions: true,
      marksPerQuestion: 1,
      negativeMarking: 0.25,
      showResultInstantly: false,
      allowTabSwitch: false,
      maxTabSwitches: 3,
    },
  });

  const { register, handleSubmit, formState: { errors }, watch, setValue } = form;

  // Load topics
  useEffect(() => {
    fetch("/api/topics")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setTopics(data.data);
      })
      .catch(console.error);
  }, []);

  // Auto-update totalQuestions from selected topics
  useEffect(() => {
    if (selectedTopics.length > 0) {
      const total = selectedTopics.reduce((sum, t) => sum + t.questionCount, 0);
      setValue("totalQuestions", total);
    }
  }, [selectedTopics, setValue]);

  function addTopic(topicId: string, topicName: string, parentName: string) {
    if (selectedTopics.find((t) => t.topicId === topicId)) return;
    setSelectedTopics((prev) => [
      ...prev,
      {
        topicId,
        topicName,
        parentName,
        questionCount: 5,
        difficulty: (watch("targetDifficulty") as "EASY" | "MEDIUM" | "HARD") || "MEDIUM",
      },
    ]);
  }

  function removeTopic(topicId: string) {
    setSelectedTopics((prev) => prev.filter((t) => t.topicId !== topicId));
  }

  function updateTopicCount(topicId: string, count: number) {
    setSelectedTopics((prev) =>
      prev.map((t) => (t.topicId === topicId ? { ...t, questionCount: Math.max(1, count) } : t)),
    );
  }

  function updateTopicDifficulty(topicId: string, difficulty: "EASY" | "MEDIUM" | "HARD") {
    setSelectedTopics((prev) =>
      prev.map((t) => (t.topicId === topicId ? { ...t, difficulty } : t)),
    );
  }

  async function onSubmit(data: CreateExamInput) {
    if (selectedTopics.length === 0) {
      alert("Please select at least one topic in Step 2");
      setStep(1);
      return;
    }

    setIsSubmitting(true);
    try {
      // Create the exam
      const result = await createExamAction(data);
      if (!result.success || !result.data) {
        alert(result.error || "Failed to create exam");
        return;
      }

      // Save topic configs
      const examId = result.data.id;
      await saveExamTopicConfigsAction(
        examId,
        selectedTopics.map((t) => ({
          topicId: t.topicId,
          questionCount: t.questionCount,
          difficulty: t.difficulty,
          pyqPercentage: watch("usePyqBank") ? 50 : 0,
          marksPerQuestion: data.marksPerQuestion,
        })),
      );

      router.push(`/admin/exams/${examId}`);
    } catch (err) {
      console.error("Submit error:", err);
      alert("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  function onError(errs: any) {
    console.error("Validation errors:", errs);
    const firstError = Object.values(errs)[0] as any;
    if (firstError?.message) {
      alert(`Validation error: ${firstError.message}`);
    }
  }

  const totalSelectedQuestions = selectedTopics.reduce((sum, t) => sum + t.questionCount, 0);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Exam</h1>
        <p className="text-muted-foreground">Set up a new exam in 4 steps</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => i < step && setStep(i)}
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                i === step
                  ? "bg-primary text-primary-foreground"
                  : i < step
                    ? "bg-primary/20 text-primary cursor-pointer"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {i + 1}
            </button>
            <span className={`hidden text-sm sm:block ${i === step ? "font-medium" : "text-muted-foreground"}`}>
              {s.title}
            </span>
            {i < steps.length - 1 && <div className="h-px w-4 bg-border sm:w-8" />}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit, onError)}>
        {/* Step 1: Basic Info */}
        {step === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Exam Title *</Label>
                <Input id="title" placeholder="e.g., SSC CGL Mock Test #1" {...register("title")} />
                {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" placeholder="Brief description of the exam..." {...register("description")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instructions">Instructions for Participants</Label>
                <Textarea id="instructions" placeholder="Read all questions carefully..." rows={4} {...register("instructions")} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="durationMinutes">Duration (minutes) *</Label>
                  <Input id="durationMinutes" type="number" {...register("durationMinutes")} />
                  {errors.durationMinutes && <p className="text-sm text-destructive">{errors.durationMinutes.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scheduledStartTime">Scheduled Start (optional)</Label>
                  <Input id="scheduledStartTime" type="datetime-local" {...register("scheduledStartTime")} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Topics */}
        {step === 1 && (
          <div className="space-y-4">
            {/* Question Mode Selector */}
            <Card>
              <CardHeader>
                <CardTitle>Question Generation Mode</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {([
                  {
                    value: "PRE_GENERATED" as const,
                    label: "Pre-Generated",
                    desc: "Generate all questions before the exam goes live. All participants get the same question set (shuffled order).",
                    badge: "Standard",
                  },
                  {
                    value: "DYNAMIC" as const,
                    label: "Dynamic Per-User",
                    desc: "AI generates unique questions for each participant when they start the exam. No two users get the same paper. ~10s loading on start.",
                    badge: "Most Private",
                  },
                  {
                    value: "POOL_BASED" as const,
                    label: "Pool-Based",
                    desc: "Pre-generate a large pool (3-5x questions). Each participant gets a random subset. Different papers, instant start.",
                    badge: "Recommended",
                  },
                ] as const).map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => setValue("questionMode", mode.value)}
                    className={`w-full rounded-lg border p-3 text-left transition-all ${
                      watch("questionMode") === mode.value
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">{mode.label}</span>
                      <Badge variant="outline" className="text-xs">{mode.badge}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{mode.desc}</p>
                  </button>
                ))}
                {watch("questionMode") === "POOL_BASED" && (
                  <div className="flex items-center gap-3 pl-2">
                    <Label className="text-xs whitespace-nowrap">Pool size multiplier:</Label>
                    <div className="flex gap-1">
                      {[2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setValue("poolMultiplier", n)}
                          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                            watch("poolMultiplier") === n
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {n}x
                        </button>
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      = {totalSelectedQuestions * (watch("poolMultiplier") || 3)} questions in pool
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Select Subjects & Topics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Pick the topics to include in this exam and set how many questions per topic.
                </p>

                {/* Topic selector grouped by subject */}
                <div className="space-y-4">
                  {topics.map((subject) => (
                    <div key={subject.id} className="rounded-lg border p-3">
                      <p className="mb-2 text-sm font-semibold">{subject.name}</p>
                      <div className="flex flex-wrap gap-2">
                        {subject.children?.map((child) => {
                          const isSelected = selectedTopics.some((t) => t.topicId === child.id);
                          return (
                            <button
                              key={child.id}
                              type="button"
                              onClick={() =>
                                isSelected
                                  ? removeTopic(child.id)
                                  : addTopic(child.id, child.name, subject.name)
                              }
                              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                                isSelected
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground hover:bg-muted/80"
                              }`}
                            >
                              {isSelected ? "✓ " : ""}
                              {child.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Selected topics with question counts */}
            {selectedTopics.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Question Distribution</CardTitle>
                    <Badge variant="outline">{totalSelectedQuestions} total questions</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedTopics.map((t) => (
                    <div key={t.topicId} className="flex items-center justify-between rounded-md border p-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{t.topicName}</p>
                        <p className="text-xs text-muted-foreground">{t.parentName}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Difficulty */}
                        <div className="flex gap-1">
                          {(["EASY", "MEDIUM", "HARD"] as const).map((d) => (
                            <button
                              key={d}
                              type="button"
                              onClick={() => updateTopicDifficulty(t.topicId, d)}
                              className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                                t.difficulty === d
                                  ? d === "EASY"
                                    ? "bg-green-100 text-green-800"
                                    : d === "MEDIUM"
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-red-100 text-red-800"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {d[0]}
                            </button>
                          ))}
                        </div>
                        {/* Count */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => updateTopicCount(t.topicId, t.questionCount - 1)}
                            className="flex h-6 w-6 items-center justify-center rounded border text-muted-foreground hover:bg-muted"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <Input
                            type="number"
                            value={t.questionCount}
                            onChange={(e) => updateTopicCount(t.topicId, parseInt(e.target.value) || 1)}
                            className="h-6 w-12 px-1 text-center text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => updateTopicCount(t.topicId, t.questionCount + 1)}
                            className="flex h-6 w-6 items-center justify-center rounded border text-muted-foreground hover:bg-muted"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        {/* Remove */}
                        <button
                          type="button"
                          onClick={() => removeTopic(t.topicId)}
                          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Options */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="useAiGeneration"
                        checked={watch("useAiGeneration")}
                        onCheckedChange={(c) => setValue("useAiGeneration", !!c)}
                      />
                      <Label htmlFor="useAiGeneration" className="text-sm font-normal">AI-Generated Questions</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="usePyqBank"
                        checked={watch("usePyqBank")}
                        onCheckedChange={(c) => setValue("usePyqBank", !!c)}
                      />
                      <Label htmlFor="usePyqBank" className="text-sm font-normal">Include PYQ (Previous Year Questions)</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="shuffleQuestions"
                        checked={watch("shuffleQuestions")}
                        onCheckedChange={(c) => setValue("shuffleQuestions", !!c)}
                      />
                      <Label htmlFor="shuffleQuestions" className="text-sm font-normal">Shuffle question order per participant</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedTopics.length === 0 && (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                Click on topics above to add them to this exam
              </div>
            )}
          </div>
        )}

        {/* Step 3: Scoring */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Scoring Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Target Difficulty</Label>
                <div className="flex gap-2">
                  {(["EASY", "MEDIUM", "HARD"] as const).map((d) => (
                    <Badge
                      key={d}
                      variant={watch("targetDifficulty") === d ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => setValue("targetDifficulty", d)}
                    >
                      {d}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="marksPerQuestion">Marks per Question</Label>
                  <Input id="marksPerQuestion" type="number" step="0.25" {...register("marksPerQuestion")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="negativeMarking">Negative Marking</Label>
                  <Input id="negativeMarking" type="number" step="0.25" {...register("negativeMarking")} />
                  <p className="text-xs text-muted-foreground">Marks deducted per wrong answer (0 = none)</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="passingPercentage">Passing Percentage (optional)</Label>
                <Input id="passingPercentage" type="number" placeholder="e.g., 40" {...register("passingPercentage")} />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="showResultInstantly"
                  checked={watch("showResultInstantly")}
                  onCheckedChange={(c) => setValue("showResultInstantly", !!c)}
                />
                <Label htmlFor="showResultInstantly" className="font-normal">
                  Show results immediately after submission
                </Label>
              </div>
              <div className="rounded-lg bg-muted p-4 text-sm">
                <p className="font-medium">Score Preview</p>
                <p className="text-muted-foreground">
                  Total Marks: {totalSelectedQuestions * (watch("marksPerQuestion") || 0)} |
                  Questions: {totalSelectedQuestions} |
                  Per Question: +{watch("marksPerQuestion") || 0} / -{watch("negativeMarking") || 0}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Settings */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Exam Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="allowTabSwitch"
                  checked={watch("allowTabSwitch")}
                  onCheckedChange={(c) => setValue("allowTabSwitch", !!c)}
                />
                <Label htmlFor="allowTabSwitch" className="font-normal">
                  Allow tab switching (disable for strict proctoring)
                </Label>
              </div>
              {!watch("allowTabSwitch") && (
                <div className="space-y-2 pl-6">
                  <Label htmlFor="maxTabSwitches">Max tab switches before auto-submit</Label>
                  <Input id="maxTabSwitches" type="number" className="w-32" {...register("maxTabSwitches")} />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => (step === 0 ? router.back() : setStep(step - 1))}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {step === 0 ? "Cancel" : "Previous"}
          </Button>
          {step < steps.length - 1 ? (
            <Button
              type="button"
              onClick={() => setStep(step + 1)}
              disabled={step === 1 && selectedTopics.length === 0}
            >
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Exam
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
