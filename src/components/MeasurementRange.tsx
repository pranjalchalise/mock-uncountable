// MeasurementRange
// -----------------
// This view lets the user pick an output metric (for example tensile strength)
// and a target range for that metric. For each input ingredient we then show
// a small histogram that describes how often that input appears in experiments
// whose output falls inside the chosen window.
//
// The main design goals here are:
//   - run the expensive work (min/max and histograms) only when needed,
//   - handle "empty" cases politely (no experiments, no values, etc.),
//   - keep the state surface small and easy to reason about.

import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { experiments, inputKeys, outputKeys } from '../data/experiments';

// How many input cards we show by default.
// The "View all" button toggles between this subset and the full list.
const INITIAL_VISIBLE_INPUTS = 6;

// Inputs that should appear near the top of the grid; everything else follows.
const INPUT_ORDER_HINTS = [
  'Polymer 1',
  'Polymer 2',
  'Polymer 3',
  'Polymer 4',
  'Silica Filler 1',
  'Silica Filler 2',
  'Carbon Black High Grade',
  'Carbon Black Low Grade',
  'Plasticizer 1',
  'Plasticizer 2',
  'Plasticizer 3',
  'Oven Temperature',
];

// Pre-compute the min and max for each output key exactly once when the module
// is loaded. This avoids recomputing the same summaries on every render.
function computeOutputStats() {
  const stats: Record<string, { min: number; max: number }> = {};

  for (const key of outputKeys) {
    let min = Infinity;
    let max = -Infinity;

    for (const exp of experiments) {
      const value = exp.outputs[key];
      if (value == null || Number.isNaN(value)) continue;
      if (value < min) min = value;
      if (value > max) max = value;
    }

    stats[key] = {
      // If we never saw a real value, fall back to 0 so the UI does not crash.
      min: min === Infinity ? 0 : min,
      max: max === -Infinity ? 0 : max,
    };
  }

  return stats;
}

const OUTPUT_STATS = computeOutputStats();

interface HistogramBin {
  binLabel: string;
  count: number;
}

// Build histogram data for a single input, but only for experiments whose
// chosen output metric falls inside [minOut, maxOut].
function buildHistogramData(
  inputKey: string,
  outputKey: string,
  minOut: number,
  maxOut: number,
  binCount = 6,
): { bins: HistogramBin[]; matchingCount: number } {
  // Filter down to experiments where the chosen output is inside the window.
  const filtered = experiments.filter((exp) => {
    const outVal = exp.outputs[outputKey];
    return (
      outVal != null &&
      !Number.isNaN(outVal) &&
      outVal >= minOut &&
      outVal <= maxOut
    );
  });

  const matchingCount = filtered.length;

  // If nothing matches the chosen window, we return an empty histogram.
  if (matchingCount === 0) {
    return { bins: [], matchingCount: 0 };
  }

  // Collect the selected input values for the matching experiments.
  const values: number[] = [];
  for (const exp of filtered) {
    const v = exp.inputs[inputKey];
    if (v != null && !Number.isNaN(v)) {
      values.push(v);
    }
  }

  // If none of the matching experiments have this input defined, we again
  // bail out with an empty histogram but keep the "matchingCount" information.
  if (values.length === 0) {
    return { bins: [], matchingCount };
  }

  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);

  // If every value is exactly the same, we show a single bar rather than
  // trying to slice into multiple bins that are all identical.
  if (minVal === maxVal) {
    return {
      bins: [
        {
          binLabel: minVal.toFixed(2),
          count: values.length,
        },
      ],
      matchingCount,
    };
  }

  // Standard fixed-width histogram: we split [minVal, maxVal] into bins and
  // count how many values land in each.
  const step = (maxVal - minVal) / binCount;
  const rawBins: HistogramBin[] = [];

  for (let i = 0; i < binCount; i++) {
    const start = minVal + i * step;
    const end = i === binCount - 1 ? maxVal : start + step;
    rawBins.push({
      binLabel: `${start.toFixed(1)}–${end.toFixed(1)}`,
      count: 0,
    });
  }

  for (const v of values) {
    let index = Math.floor((v - minVal) / step);
    if (index >= binCount) index = binCount - 1;
    rawBins[index].count += 1;
  }

  return { bins: rawBins, matchingCount };
}

export function MeasurementRange() {
  // If there are no outputs or no experiments at all, there is nothing
  // meaningful to draw. We still render a friendly explanatory message.
  const datasetEmpty = experiments.length === 0 || outputKeys.length === 0;

  // We bias the default output toward "Tensile Strength" because that is an
  // intuitive starting point. If it is not present we fall back to whatever
  // the first output key is, or an empty string if there really is none.
  const defaultOutput =
    outputKeys.includes('Tensile Strength') && !datasetEmpty
      ? 'Tensile Strength'
      : outputKeys[0] ?? '';

  // The initial stats are used purely to seed the min/max inputs.
  const initialStats = defaultOutput
    ? OUTPUT_STATS[defaultOutput]
    : { min: 0, max: 0 };

  // State: which output metric is selected, and what numeric range the
  // user has typed in. We also track whether all inputs should be shown.
  const [measurementKey, setMeasurementKey] = useState<string>(defaultOutput);
  const [minValue, setMinValue] = useState<number>(initialStats.min);
  const [maxValue, setMaxValue] = useState<number>(initialStats.max);
  const [showAllInputs, setShowAllInputs] = useState<boolean>(false);

  // The input cards are ordered so that "obvious" levers appear first,
  // but we still include every input as long as it exists in the dataset.
  const orderedInputs = useMemo(() => {
    const hinted = INPUT_ORDER_HINTS.filter((k) => inputKeys.includes(k));
    const remaining = inputKeys.filter((k) => !hinted.includes(k));
    return [...hinted, ...remaining];
  }, []);

  // Safely look up the stats for the currently selected measurement.
  const currentStats = OUTPUT_STATS[measurementKey] ?? {
    min: 0,
    max: 0,
  };

  // Clamp the user-entered range so it always stays inside the dataset bounds.
  // This protects us from weird values (for example, someone typing 9999).
  const clampedMin = Math.min(
    Math.max(minValue, currentStats.min),
    currentStats.max,
  );
  const clampedMax = Math.max(
    Math.min(maxValue, currentStats.max),
    currentStats.min,
  );

  // Decide how many inputs to show in the grid at once.
  const visibleInputs = showAllInputs
    ? orderedInputs
    : orderedInputs.slice(0, INITIAL_VISIBLE_INPUTS);

  const canToggleInputs = orderedInputs.length > INITIAL_VISIBLE_INPUTS;

  // If the dataset is empty we show a single, clear message.
  if (datasetEmpty) {
    return (
      <div className="rounded-xl bg-surface p-4 text-sm text-slate-700 ring-1 ring-border">
        There are no experiments or output measurements available in the dataset
        yet, so the measurement range view cannot draw any distributions.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls row: choose the output metric and the numeric window */}
      <div
        className="flex flex-wrap gap-4"
        aria-label="Measurement range configuration"
      >
        {/* Output selector */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="measurement-select"
            className="text-xs font-medium text-slate-700"
          >
            Measurement (output)
          </label>
          <select
            id="measurement-select"
            className="min-w-[220px] rounded-md border border-border bg-white px-2 py-1 text-xs text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            value={measurementKey}
            onChange={(e) => {
              const nextKey = e.target.value;
              const s = OUTPUT_STATS[nextKey];

              setMeasurementKey(nextKey);

              // Reset the numeric range to the full dataset window for the new
              // metric so the user always starts from a sensible default.
              if (s) {
                setMinValue(s.min);
                setMaxValue(s.max);
              }
            }}
          >
            {outputKeys.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-muted">
            Pick which performance metric you care about (for example tensile
            strength, cure time, or compression set).
          </p>
        </div>

        {/* Numeric range inputs */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-700">
            Target range for {measurementKey || 'selected measurement'}
          </span>
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-muted" htmlFor="min-val">
              Min
            </label>
            <input
              id="min-val"
              type="number"
              step="0.1"
              className="w-24 rounded-md border border-border bg-white px-2 py-1 text-xs text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              value={minValue}
              onChange={(e) => {
                const next = Number(e.target.value);
                // We treat non-numeric input as "no update" instead of NaN.
                if (!Number.isNaN(next)) setMinValue(next);
              }}
            />
            <span className="text-xs text-slate-500">–</span>
            <label className="text-[11px] text-muted" htmlFor="max-val">
              Max
            </label>
            <input
              id="max-val"
              type="number"
              step="0.1"
              className="w-24 rounded-md border border-border bg-white px-2 py-1 text-xs text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              value={maxValue}
              onChange={(e) => {
                const next = Number(e.target.value);
                if (!Number.isNaN(next)) setMaxValue(next);
              }}
            />
          </div>
          <p className="text-[11px] text-muted">
            Dataset range: {currentStats.min.toFixed(2)} –{' '}
            {currentStats.max.toFixed(2)}.
          </p>
        </div>
      </div>

      {/* Histograms – one card per input ingredient */}
      <div
        className="grid gap-4 md:grid-cols-3"
        aria-label="Input distributions within range"
      >
        {visibleInputs.map((inputKey) => {
          const { bins, matchingCount } = buildHistogramData(
            inputKey,
            measurementKey,
            clampedMin,
            clampedMax,
          );

          // If there is no data for this input in the chosen window, we still
          // render a card but make it clear why the chart is missing.
          if (bins.length === 0) {
            return (
              <div
                key={inputKey}
                className="rounded-lg bg-surface/80 p-3 ring-1 ring-border"
              >
                <h3 className="text-xs font-medium text-slate-800">
                  {inputKey}
                </h3>
                <p className="mt-2 text-[11px] text-muted">
                  No experiments in this measurement range have a recorded value
                  for this input.
                </p>
              </div>
            );
          }

          return (
            <div
              key={inputKey}
              className="rounded-lg bg-surface/80 p-3 ring-1 ring-border"
            >
              <h3 className="text-xs font-medium text-slate-800">
                {inputKey}
              </h3>
              <p className="mb-2 text-[11px] text-muted">
                Distribution of {inputKey} among experiments with{' '}
                {measurementKey} in {clampedMin.toFixed(2)}–
                {clampedMax.toFixed(2)} ({matchingCount} runs).
              </p>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={bins}
                    margin={{ top: 4, right: 4, left: -10, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="binLabel"
                      tick={{ fontSize: 9 }}
                      angle={-45}
                      textAnchor="end"
                      height={40}
                    />
                    <YAxis tick={{ fontSize: 9 }} allowDecimals={false} />
                    <Tooltip
                      formatter={(value: unknown) =>
                        typeof value === 'number'
                          ? `${value} experiments`
                          : String(value ?? '')
                      }
                      labelFormatter={(label) => `Range: ${label}`}
                      contentStyle={{ fontSize: 11 }}
                    />
                    {/* Use the Uncountable blue for the bars */}
                    <Bar dataKey="count" fill="#231FD5" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>

      {/* View more / View less toggle for the input cards */}
      {canToggleInputs && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setShowAllInputs((v) => !v)}
            className="text-xs font-medium text-primary hover:underline"
          >
            {showAllInputs
              ? 'Show fewer inputs'
              : `View all ${orderedInputs.length} inputs`}
          </button>
        </div>
      )}

      {/* Short explanation text under the main grid */}
      <p className="text-xs text-muted">
        This view answers a practical question: when a performance metric is
        inside a desired window, which bands of input usage tend to show up?
        That helps reduce scrap and experimental time by steering future runs
        into regions that already look promising.
      </p>
    </div>
  );
}
