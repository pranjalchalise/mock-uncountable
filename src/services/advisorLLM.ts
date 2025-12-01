// src/services/advisorLLM.ts
//
// Small helper that knows how to:
//   1. Build a compact, readable prompt for the optimization advisor.
//   2. Estimate a rough token usage so the UI can be honest about call size.
//   3. Call the OpenAI Responses API and return the model's text.

import type { Experiment } from '../data/experiments';
import { getOpenAiClient, hasOpenAiKey } from './openaiClient';

export type LlmPromptPreview = {
  prompt: string;
  estimatedTokens: number;
};

const MODEL_NAME = 'gpt-4.1-mini';
const MAX_OUTPUT_TOKENS = 350;

/**
 * Build the text prompt sent to the model for a given anchor experiment
 * and the overall dataset.
 */
function buildLlmAdvisorPrompt(
  anchor: Experiment,
  dataset: Experiment[],
): string {
  const inputsSummary = Object.entries(anchor.inputs)
    .map(([name, value]) => `${name}: ${value.toFixed(2)}`)
    .join('\n');

  const outputsSummary = Object.entries(anchor.outputs)
    .map(([name, value]) => `${name}: ${value.toFixed(2)}`)
    .join('\n');

  const n = dataset.length;
  const outputNames = Object.keys(anchor.outputs);

  // Very small stats block per output so the model has some rough structure
  // of the dataset, not just a single run.
  const outputStatsLines = outputNames.map((name) => {
    const rawValues = dataset
      .map((e) => e.outputs[name])
      .filter(
        (v): v is number => typeof v === 'number' && Number.isFinite(v),
      );

    if (rawValues.length === 0) {
      return `${name}: no historical data available`;
    }

    const sorted = [...rawValues].sort((a, b) => a - b);
    const mean =
      rawValues.reduce((acc, v) => acc + v, 0) / rawValues.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const min = sorted[0];
    const max = sorted[sorted.length - 1];

    return `${name}: mean=${mean.toFixed(
      2,
    )}, median=${median.toFixed(2)}, min=${min.toFixed(
      2,
    )}, max=${max.toFixed(2)}`;
  });

  return [
    `You are helping a formulations engineer working on an elastomer system.`,
    `They are looking at a *single* experimental run ("anchor experiment") in the context of a small historical dataset.`,
    ``,
    `Your job:`,
    `- Identify cost levers (cheaper raw materials, lower expensive inputs, etc.)`,
    `- Identify levers for cure time and oven utilisation`,
    `- Comment on field performance & scrap risk (compression set, tensile, elongation)`,
    `- Make **specific, numbered suggestions** that they can try next, not vague advice.`,
    ``,
    `Anchor experiment ID: ${anchor.id}`,
    ``,
    `Inputs (phr):`,
    inputsSummary,
    ``,
    `Outputs (performance):`,
    outputsSummary,
    ``,
    `Dataset summary:`,
    `Number of experiments: ${n}`,
    ...outputStatsLines,
    ``,
    `Format your response as three markdown sections:`,
    `### 1) Cost Levers`,
    `### 2) Cure Time & Oven Utilization`,
    `### 3) Field Performance & Scrap`,
    ``,
    `Within each section, provide 2–4 short, concrete, numbered ideas that:`,
    `- Refer to specific inputs (e.g. "Co-Agent 1", "Silica Filler 2", "Oven Temperature")`,
    `- Briefly justify *why* the change might help compared to the dataset statistics`,
    `- Avoid changing everything at once; suggest small, testable moves.`,
  ].join('\n');
}

/**
 * Very rough token estimate so the UI can show the user how big the call is.
 * (We just assume ~4 characters per token and add some budget for output.)
 */
function estimateTokens(prompt: string): number {
  const inputTokens = Math.ceil(prompt.length / 4);
  const total = inputTokens + MAX_OUTPUT_TOKENS;
  return total;
}

/**
 * Return the prompt + token estimate for display in the UI.
 */
export function getLlmAdvisorPromptPreview(
  anchor: Experiment,
  dataset: Experiment[],
): LlmPromptPreview {
  const prompt = buildLlmAdvisorPrompt(anchor, dataset);
  const estimatedTokens = estimateTokens(prompt);
  return { prompt, estimatedTokens };
}

/**
 * Call the OpenAI model and return the markdown text with ideas.
 */
export async function getLlmAdvisorSummary(
  anchor: Experiment,
  dataset: Experiment[],
): Promise<string> {
  if (!hasOpenAiKey) {
    // We throw a clear error here; the caller will catch it and show
    // a friendly message instead of leaving the UI in a weird state.
    throw new Error(
      'VITE_OPENAI_API_KEY is not configured. Add it to your .env.local file to enable LLM insights.',
    );
  }

  const client = getOpenAiClient();
  const prompt = buildLlmAdvisorPrompt(anchor, dataset);

  const response = await client.responses.create({
    model: MODEL_NAME,
    input: prompt,
    max_output_tokens: MAX_OUTPUT_TOKENS,
  });

  // The SDK returns a structured `output` array. We defensively grab the first
  // text-like chunk we can find, and fall back to a generic message if the
  // shape looks different than expected.
  const anyResponse = response as any;
  const firstOutput = anyResponse.output?.[0];
  const firstContent = firstOutput?.content?.[0];

  const text =
    firstContent?.text ??
    firstContent?.value ??
    'Model returned an unexpected response shape.';

  return String(text);
}
