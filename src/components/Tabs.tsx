// Tabs + Panel
// ------------
// Simple pill-style tab navigation used at the top of the main content.
// The component is intentionally very small: it only handles visual state
// and delegates which tab is active up to the parent (App.tsx).

import type { ReactNode } from 'react';

export type TabId = 'scatter' | 'range' | 'advisor';

interface TabDef {
  id: TabId;
  label: string;
}

const tabs: TabDef[] = [
  { id: 'advisor', label: 'Optimization Advisor' },
  { id: 'range', label: 'Measurement Range' },
  { id: 'scatter', label: 'Scatter Explorer' },
];

interface TabsProps {
  activeTab: TabId;
  onChange: (id: TabId) => void;
}

// Top pill-style tab navigation.
// We keep this stateless so it is easy to reuse and test.
export function Tabs({ activeTab, onChange }: TabsProps) {
  return (
    <nav
      className="inline-flex rounded-full bg-slate-100 p-1"
      aria-label="Primary data views"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            className={`px-3 py-1 text-xs font-medium rounded-full border focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
              ${
                isActive
                  ? 'bg-white text-primary border-primary shadow-sm'
                  : 'border-transparent text-slate-600 hover:text-primary'
              }
            `}
            aria-pressed={isActive}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}

interface PanelProps {
  title: string;
  children: ReactNode;
}

// Generic card/section wrapper for the tab content.
// This keeps the padding and border treatment consistent across all three views.
export function Panel({ title, children }: PanelProps) {
  return (
    <section
      aria-label={title}
      className="rounded-xl bg-surface p-4 shadow-sm ring-1 ring-border"
    >
      {children}
    </section>
  );
}
