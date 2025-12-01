// Simple top header for the mock Uncountable app.
// Shows the logo, a small "Demo sandbox" pill, the title, and a short tagline.
// On larger screens it also shows a small "Features" callout card on the right.

export function Header() {
  return (
    <header className="border-b border-border bg-white">
      <div className="mx-auto flex max-w-6xl items-start justify-between gap-6 px-4 py-5 sm:px-6 sm:py-6">
        {/* Left side: logo + pill + main title + description */}
        <div className="flex flex-1 items-start gap-3 sm:gap-4">
          {/* Logo circle. The actual image file lives in /public/logo.png. */}
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/30 bg-white shadow-sm">
            <img
              src="/logo.png"
              alt="Uncountable logo"
              className="h-7 w-7 object-contain"
            />
          </div>

          {/* Text block: pill, title, tagline */}
          <div className="space-y-1 sm:space-y-2">
            {/* Small pill that makes it clear this is a sandbox, not production */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-primary px-3 py-0.5 text-xs font-medium text-primary">
                Demo sandbox
              </span>
            </div>

            {/* Main title: uses the Uncountable blue */}
            <h1 className="text-2xl font-semibold tracking-tight text-primary sm:text-3xl">
              Mock Uncountable
            </h1>

            {/* One-sentence explanation of what this page is for */}
            <p className="max-w-2xl text-sm leading-relaxed text-muted">
              Minimal sandbox to explore formulation experiments, visualise
              structure–property relationships, and surface optimisation ideas.
            </p>
          </div>
        </div>

        {/* Right side: feature list card (hidden on very small screens) */}
        <aside className="hidden shrink-0 rounded-xl bg-surface px-4 py-3 text-xs text-muted shadow-card ring-1 ring-border sm:block sm:px-5 sm:py-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-primary">
            Features
          </h2>
          <ul className="mt-1.5 space-y-1">
            {/* Each list item is a simple bullet + short phrase.
               The bullet uses the same blue as the rest of the UI. */}
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
              <span>Interactive data explorer</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
              <span>Range-based input insights</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
              <span>Optimization advisor (GPT-powered)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
              <span>Light, accessible UI</span>
            </li>
          </ul>
        </aside>
      </div>
    </header>
  );
}
