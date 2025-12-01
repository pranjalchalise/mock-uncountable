/// <reference types="vite/client" />

/**
 * This interface describes all the environment variables
 * we expect Vite to expose on `import.meta.env`.
 *
 * - Every key must start with `VITE_`
 * - All values are strings at runtime
 */
interface ImportMetaEnv {
    /**
     * OpenAI API key used for the demo LLM features.
     *
     * In development you can set this in a `.env.local` file:
     *   VITE_OPENAI_API_KEY=sk-...
     *
     * In production (e.g. Vercel) you would set it as a
     * project environment variable instead.
     *
     * The question mark (`?`) means this variable is optional,
     * so the app can still compile even if it is missing.
     */
    readonly VITE_OPENAI_API_KEY?: string;
  }
  
  /**
   * This extends Vite's built-in `ImportMeta` type so that
   * TypeScript understands `import.meta.env` and the keys
   * defined above.
   */
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
  