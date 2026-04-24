import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";

// ─── Provider Setup ──────────────────────────────────────────────────────────

function getAnthropicProvider() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return createAnthropic({ apiKey });
}

function getOpenAIProvider() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return createOpenAI({ apiKey });
}

function getGoogleProvider() {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return null;
  return createGoogleGenerativeAI({ apiKey });
}

function getOpenRouterProvider() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;
  return createOpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
  });
}

// ─── Model Configuration ─────────────────────────────────────────────────────

export type AITask =
  | "question_generation"
  | "solution_generation"
  | "question_validation";

interface ModelConfig {
  provider: "anthropic" | "openai" | "google" | "openrouter";
  modelId: string;
}

// Claude Sonnet 4 (Anthropic direct) as PRIMARY for all question generation
// Fallback chain: Claude -> GPT-4o -> Gemini
const MODEL_CONFIGS: Record<AITask, ModelConfig[]> = {
  question_generation: [
    { provider: "anthropic", modelId: "claude-sonnet-4-20250514" },
    { provider: "openai", modelId: "gpt-4o" },
    { provider: "google", modelId: "gemini-2.0-flash" },
  ],
  solution_generation: [
    { provider: "anthropic", modelId: "claude-sonnet-4-20250514" },
    { provider: "openai", modelId: "gpt-4o-mini" },
    { provider: "google", modelId: "gemini-2.0-flash" },
  ],
  question_validation: [
    { provider: "anthropic", modelId: "claude-sonnet-4-20250514" },
    { provider: "openai", modelId: "gpt-4o-mini" },
  ],
};

function getModel(config: ModelConfig) {
  switch (config.provider) {
    case "anthropic": {
      const provider = getAnthropicProvider();
      if (!provider) return null;
      return provider(config.modelId);
    }
    case "openai": {
      const provider = getOpenAIProvider();
      if (!provider) return null;
      return provider(config.modelId);
    }
    case "google": {
      const provider = getGoogleProvider();
      if (!provider) return null;
      return provider(config.modelId);
    }
    case "openrouter": {
      const provider = getOpenRouterProvider();
      if (!provider) return null;
      return provider(config.modelId);
    }
  }
}

// ─── Generation Functions ────────────────────────────────────────────────────

export async function generateWithFallback<T>({
  task,
  prompt,
  system,
  schema,
}: {
  task: AITask;
  prompt: string;
  system?: string;
  schema: z.ZodSchema<T>;
}): Promise<{ data: T; model: string; provider: string }> {
  const configs = MODEL_CONFIGS[task];

  for (const config of configs) {
    const model = getModel(config);
    if (!model) continue;

    try {
      console.log(`[AI] Trying ${config.provider}/${config.modelId}...`);
      const result = await generateObject({
        model,
        mode: config.provider === "anthropic" ? "tool" : undefined,
        prompt,
        system,
        schema,
      });

      console.log(`[AI] Success with ${config.provider}/${config.modelId}`);
      return {
        data: result.object,
        model: config.modelId,
        provider: config.provider,
      };
    } catch (error) {
      console.error(
        `[AI] Failed with ${config.provider}/${config.modelId}:`,
        error instanceof Error ? error.message : error,
      );
      continue;
    }
  }

  throw new Error(
    "All AI providers failed. Check your API keys and try again.",
  );
}

export async function generateTextWithFallback({
  task,
  prompt,
  system,
}: {
  task: AITask;
  prompt: string;
  system?: string;
}): Promise<{ text: string; model: string; provider: string }> {
  const { generateText } = await import("ai");
  const configs = MODEL_CONFIGS[task];

  for (const config of configs) {
    const model = getModel(config);
    if (!model) continue;

    try {
      const result = await generateText({ model, prompt, system });
      return {
        text: result.text,
        model: config.modelId,
        provider: config.provider,
      };
    } catch (error) {
      console.error(
        `[AI] Text gen failed with ${config.provider}/${config.modelId}:`,
        error instanceof Error ? error.message : error,
      );
      continue;
    }
  }

  throw new Error("All AI providers failed for text generation.");
}
