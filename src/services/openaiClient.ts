// src/services/openaiClient.ts
// Small helper around the OpenAI JS SDK so the rest of the app
// doesn't have to worry about env vars or client init.

import OpenAI from 'openai';

/**
 * Tiny helper type describing just the environment variables
 * we care about for this demo.
 */
type OpenAiEnv = {
  VITE_OPENAI_API_KEY?: string;
};


const env = (import.meta as unknown as { env?: OpenAiEnv }).env ?? {};

// If the key is not set we fall back to an empty string.
// The rest of the app uses `hasOpenAiKey` to decide whether
// to show LLM features or the “disabled” message.
const apiKey = env.VITE_OPENAI_API_KEY ?? '';

/**
 * Flag that tells the UI whether LLM features are available.
 * This keeps the code simple: components can just check this
 * boolean instead of poking at env vars directly.
 */
export const hasOpenAiKey = Boolean(apiKey);

// We keep a single OpenAI client instance for the whole app.
// This avoids re-creating the client on every call and makes
// it easy to stub in tests if needed.
let client: OpenAI | null = null;

export function getOpenAiClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true,
    });
  }
  return client;
}
