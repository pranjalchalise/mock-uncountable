// OptimizationAdvisor
// This view takes a single "anchor" experiment and compares it against the
// entire dataset. It surfaces heuristics (cost levers, cure time, etc.) and
// optionally calls out to a small language model for more creative ideas.
//
// The code here tries to keep three things tidy:
//   1. heavy computations (advisor sections and LLM parsing) are memoised,
//   2. error states are explicit and friendly,
//   3. the UI logic is split into small, readable pieces.

import { useEffect, useMemo, useState } from 'react';
import { experiments, type Experiment } from '../data/experiments';
import { buildAdvisorSections } from '../services/advisor';
import {
  getLlmAdvisorSummary,
  getLlmAdvisorPromptPreview,
} from '../services/advisorLLM';
import { hasOpenAiKey } from '../services/openaiClient';

type AdvisorSection = {
  id: string;
  title: string;
  bullets: string[];
  // Optional free-form explanation of why this card appeared.
  why?: string;
};

type LlmSection = {
  title: string;
  bullets: string[];
};

// Parse a structured Markdown-ish string returned by the LLM into
// a list of sections with titles and bullet points.
// The expected format is:
//
//   ### Section title
//   1. First bullet
//   2. Second bullet
//
// If the text does not perfectly match this format, we still do our best
// to recover something readable instead of crashing.
function parseLlmSections(text: string): LlmSection[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  // Normalise the very first header and then split on "###".
  const normalised = trimmed.replace(/^###\s*/, '');
  const rawSections = normalised.split(/\n###\s*/);

  const sections: LlmSection[] = [];

  for (const raw of rawSections) {
    const lines = raw.split('\n').map((l) => l.trim());
    if (!lines[0]) continue;

    const title = lines[0];
    const bodyLines = lines.slice(1);

    const bullets: string[] = [];
    for (const line of bodyLines) {
      if (!line) continue;

      // Strip off list markers like "1. " or "2. ".
      const cleaned = line.replace(/^\d+\.\s*/, '').trim();
      if (cleaned) bullets.push(cleaned);
    }

    // If the model gave us plain paragraphs instead of numbered bullets,
    // we fall back to a single "bullet" that contains the whole text.
    if (bullets.length === 0 && bodyLines.join(' ').trim()) {
      bullets.push(bodyLines.join(' ').trim());
    }

    sections.push({ title, bullets });
  }

  return sections;
}

export function OptimizationAdvisor() {
  // Anchor experiment selection.
  // We pick the first experiment by default; if the dataset is empty,
  // anchorId starts as an empty string and we handle that case below.
  const [anchorId, setAnchorId] = useState<string>(experiments[0]?.id ?? '');

  // Look up the anchor experiment based on the selected ID.
  const anchorExperiment = useMemo<Experiment | undefined>(
    () => experiments.find((e) => e.id === anchorId),
    [anchorId],
  );

  // Build the three heuristic sections (cost, cure time, field performance)
  // using a small stats helper. We wrap this in a try/catch so that a bug
  // in the heuristic logic never breaks the whole page.
  const heuristicSections: AdvisorSection[] = useMemo(() => {
    if (!anchorExperiment) return [];

    try {
      return buildAdvisorSections(anchorExperiment, experiments) as AdvisorSection[];
    } catch (err) {
      // In a real app we might log this to an error tracker.
      console.error('Failed to build advisor sections', err);
      return [];
    }
  }, [anchorExperiment]);

  // Which section's "Why these suggestions?" panel is expanded.
  const [debugSectionId, setDebugSectionId] = useState<string | null>(null);

  // --- LLM state -------------------------------------------------------------
  const [llmStatus, setLlmStatus] = useState<
    'idle' | 'loading' | 'ready' | 'error'
  >('idle');
  const [llmText, setLlmText] = useState<string>('');
  const [llmError, setLlmError] = useState<string>('');

  const [llmPrompt, setLlmPrompt] = useState<string>('');
  const [llmTokenEstimate, setLlmTokenEstimate] =
    useState<number | null>(null);
  const [showPrompt, setShowPrompt] = useState<boolean>(false);

  // Whenever the anchor experiment changes we rebuild a fresh "prompt preview"
  // so the user can see exactly what would be sent to the model.
  useEffect(() => {
    if (!anchorExperiment) return;

    const { prompt, estimatedTokens } = getLlmAdvisorPromptPreview(
      anchorExperiment,
      experiments,
    );
    setLlmPrompt(prompt);
    setLlmTokenEstimate(estimatedTokens);
  }, [anchorExperiment]);

  // Trigger the call to the LLM. We protect this with error handling so that
  // network failures or invalid API keys show up as a clear message rather
  // than leaving the UI in a broken state.
  const handleAskLlm = async () => {
    if (!anchorExperiment) return;

    try {
      setLlmStatus('loading');
      setLlmError('');
      const text = await getLlmAdvisorSummary(anchorExperiment, experiments);
      setLlmText(text);
      setLlmStatus('ready');
    } catch (err: unknown) {
      console.error(err);
      setLlmStatus('error');
      setLlmText('');
      setLlmError(
        err instanceof Error
          ? err.message
          : 'Failed to fetch LLM suggestions.',
      );
    }
  };

  // Convert the free-form LLM text into small cards that match the UI.
  const parsedLlmSections: LlmSection[] = useMemo(
    () => (llmStatus === 'ready' ? parseLlmSections(llmText) : []),
    [llmStatus, llmText],
  );

  // If there are no experiments at all, we keep this very simple.
  if (!anchorExperiment) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
        The dataset does not contain any experiments yet, so the optimization
        advisor has nothing to analyse.
      </div>
    );
  }

  return (
    <section
      aria-label="Optimization advisor"
      className="flex flex-col gap-4"
    >
      {/* Top row: anchor selection */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1 space-y-2">
            <label
              htmlFor="anchor-experiment"
              className="block text-xs font-medium uppercase tracking-wide text-slate-500"
            >
              Anchor experiment
            </label>

            <select
              id="anchor-experiment"
              className="mt-1 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none ring-blue-200 focus:bg-white focus:ring"
              value={anchorId}
              onChange={(e) => {
                setAnchorId(e.target.value);
                setDebugSectionId(null); // collapse any open debug when switching
              }}
            >
              {experiments.map((exp) => (
                <option key={exp.id} value={exp.id}>
                  {exp.id}
                </option>
              ))}
            </select>

            <p className="text-xs text-slate-600">
              Pick a real experiment as an anchor. The advisor compares it
              against the dataset and calls out levers for cost, cure time,
              and long-term performance.
            </p>
          </div>
        </div>
      </div>

      {/* Middle section: inputs + outputs for the selected experiment */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Inputs (phr)
          </h2>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-3">
            {Object.entries(anchorExperiment.inputs).map(([name, value]) => (
              <div key={name} className="flex flex-col">
                <dt className="truncate text-slate-500">{name}</dt>
                <dd className="font-mono text-slate-900">
                  {Number.isFinite(value) ? value.toFixed(2) : '—'}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Outputs (performance)
          </h2>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-3">
            {Object.entries(anchorExperiment.outputs).map(([name, value]) => (
              <div key={name} className="flex flex-col">
                <dt className="truncate text-slate-500">{name}</dt>
                <dd className="font-mono text-slate-900">
                  {Number.isFinite(value) ? value.toFixed(2) : '—'}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* Heuristic advisor explainer */}
      <article className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700 sm:px-5 sm:py-4">
        <h2 className="text-sm font-semibold text-slate-900">
          Heuristic advisor : how this run compares to history
        </h2>
        <p className="mt-2">
          The three panels below use simple statistics (means, minima, maxima,
          and medians across all {experiments.length} experiments) to highlight:
        </p>
        <ul className="ml-4 mt-1 list-disc space-y-0.5">
          <li>
            which ingredients are unusually expensive or heavy (
            <span className="font-medium">Cost levers</span>),
          </li>
          <li>
            how aggressively you are using oven temperature and curing time (
            <span className="font-medium">
              Cure time &amp; oven utilisation
            </span>
            ),
          </li>
          <li>
            and whether the run looks robust in the field (
            <span className="font-medium">
              Field performance &amp; scrap
            </span>
            ).
          </li>
        </ul>
        <p className="mt-2">
          Click the{' '}
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-primary/40 bg-primary/5 text-[10px] font-semibold text-primary">
            ?
          </span>{' '}
          icon on each card to see the exact value, dataset mean, and threshold
          check that triggered the suggestions.
        </p>
      </article>

      {/* Heuristic sections: cost / cure / field performance */}
      <div className="grid gap-4 md:grid-cols-3">
        {heuristicSections.map((section) => (
          <article
            key={section.id}
            className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5"
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">
                {section.title}
              </h3>
              {section.why && (
                <button
                  type="button"
                  className="inline-flex h-5 w-5 flex-none items-center justify-center rounded-full border border-primary/40 bg-primary/5 text-[11px] font-semibold text-primary hover:bg-primary/10"
                  onClick={() =>
                    setDebugSectionId((prev) =>
                      prev === section.id ? null : section.id,
                    )
                  }
                  aria-label="Show why these suggestions fired"
                >
                  ?
                </button>
              )}
            </div>
            <ul className="space-y-1.5 text-xs text-slate-700">
              {section.bullets.map((bullet, index) => (
                <li key={index} className="flex gap-2">
                  <span
                    className="mt-1 inline-block h-1.5 w-1.5 flex-none rounded-full bg-primary"
                    aria-hidden="true"
                  />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>

            {/* Debug / "Why this suggestion?" panel */}
            {section.why && debugSectionId === section.id && (
              <div className="mt-3 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2">
                <p className="mb-1 text-[11px] font-semibold text-slate-800">
                  Why these suggestions?
                </p>
                <pre className="whitespace-pre-wrap break-words font-mono text-[11px] text-slate-700">
                  {section.why}
                </pre>
              </div>
            )}
          </article>
        ))}
      </div>

      {/* LLM section */}
      <article className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-900">
              LLM-generated ideas
            </h3>
            <p className="text-xs text-slate-600">
              Ask a small language model to propose concrete next steps for this
              anchor run. This never leaves your browser except for the call to
              OpenAI.
            </p>

            {/* Toggle showing the raw prompt we send to the model */}
            {llmPrompt && (
              <button
                type="button"
                onClick={() => setShowPrompt((v) => !v)}
                className="text-xs font-medium text-primary underline underline-offset-2"
              >
                {showPrompt
                  ? 'Hide prompt & token estimate'
                  : 'Show prompt & token estimate'}
              </button>
            )}
          </div>

          {/* Call-to-action button for the model. Hidden if no API key is set. */}
          {hasOpenAiKey && (
            <button
              type="button"
              onClick={handleAskLlm}
              disabled={llmStatus === 'loading'}
              className="inline-flex items-center justify-center rounded-md border border-primary bg-primary px-3 py-1.5 text-xs font-medium text-white shadow-sm outline-none ring-primary/30 hover:bg-primary/90 focus:ring disabled:cursor-not-allowed disabled:opacity-60"
            >
              {llmStatus === 'loading'
                ? 'Asking model…'
                : llmStatus === 'ready'
                ? 'Refresh ideas'
                : 'Ask model for ideas'}
            </button>
          )}
        </div>

        {/* Prompt preview and token estimate */}
        {showPrompt && llmPrompt && (
          <div className="mt-3 rounded-md bg-slate-900 px-3 py-2 text-xs text-slate-100">
            <p className="mb-1 font-semibold">Prompt sent to the model</p>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px]">
              {llmPrompt}
            </pre>
            {llmTokenEstimate != null && (
              <p className="mt-2 text-[11px] text-slate-300">
                Rough token estimate (input + output budget):{' '}
                <span className="font-mono">
                  ~{llmTokenEstimate} tokens
                </span>{' '}
                using model{' '}
                <code className="rounded bg-slate-800 px-1 py-0.5">
                  gpt-4.1-mini
                </code>
                .
              </p>
            )}
          </div>
        )}

        {/* LLM output / status messages */}
        <div className="mt-3 border-t border-slate-200 pt-3 text-xs text-slate-800">
          {!hasOpenAiKey && (
            <p className="text-slate-600">
              LLM insights are disabled because{' '}
              <code className="rounded bg-slate-200 px-1 py-0.5 text-[11px]">
                VITE_OPENAI_API_KEY
              </code>{' '}
              is not configured. For the assignment, keep this local-only if you
              choose to enable it.
            </p>
          )}

          {hasOpenAiKey && llmStatus === 'idle' && (
            <p className="text-slate-600">
              When you click the button, the model receives a compact summary of
              this experiment and dataset statistics, and returns 3–5 numbered
              suggestions grouped by cost, cure time, and field performance.
            </p>
          )}

          {hasOpenAiKey && llmStatus === 'loading' && (
            <p className="font-mono text-slate-700">
              Buffering model response…
            </p>
          )}

          {hasOpenAiKey && llmStatus === 'error' && (
            <p className="text-red-600">
              {llmError || 'Something went wrong fetching LLM suggestions.'}
            </p>
          )}

          {hasOpenAiKey && llmStatus === 'ready' && (
            <>
              {parsedLlmSections.length > 0 ? (
                <div className="mt-2 grid gap-3 md:grid-cols-3">
                  {parsedLlmSections.map((section, idx) => (
                    <article
                      key={idx}
                      className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
                    >
                      <h4 className="mb-1 text-xs font-semibold text-slate-900">
                        {section.title}
                      </h4>
                      <ul className="space-y-1 text-[11px] text-slate-800">
                        {section.bullets.map((b, bi) => (
                          <li key={bi} className="flex gap-2">
                            <span
                              className="mt-1 inline-block h-1.5 w-1.5 flex-none rounded-full bg-primary"
                              aria-hidden="true"
                            />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
              ) : (
                // If parsing fails we fall back to the raw text so the user
                // still sees the ideas instead of an empty area.
                <div className="prose prose-sm max-w-none text-slate-800">
                  <pre className="whitespace-pre-wrap break-words font-sans text-xs">
                    {llmText}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>
      </article>
    </section>
  );
}
