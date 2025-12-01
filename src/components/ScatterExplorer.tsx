// ScatterExplorer
// ----------------
// Simple scatter plot that lets the user choose any two properties
// (inputs or outputs) and see how they relate to one another.
//
// We lean on a small helper to convert the raw experiments into chart points,
// and we protect against empty datasets or missing keys.

import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  experiments,
  allKeys,
  getValue,
  type Experiment,
} from '../data/experiments';

interface ScatterPoint {
  id: string;
  x: number;
  y: number;
}

// Convert experiments into a flat list of {id, x, y} points.
// Points with missing or non-numeric values are dropped.
function buildScatterData(
  exps: Experiment[],
  xKey: string,
  yKey: string,
): ScatterPoint[] {
  return exps
    .map((exp) => ({
      id: exp.id,
      x: getValue(exp, xKey),
      y: getValue(exp, yKey),
    }))
    .filter((pt) => Number.isFinite(pt.x) && Number.isFinite(pt.y));
}

export function ScatterExplorer() {
  const datasetEmpty = experiments.length === 0 || allKeys.length === 0;

  // Choose safe defaults for the axes.
  // We prefer "Silica Filler 1" vs "Tensile Strength" where available,
  // but we always fall back to the first available key.
  const preferredX = 'Silica Filler 1';
  const preferredY = 'Tensile Strength';

  const defaultXKey =
    allKeys.includes(preferredX) && !datasetEmpty
      ? preferredX
      : allKeys[0] ?? '';

  const defaultYKey =
    allKeys.includes(preferredY) && !datasetEmpty
      ? preferredY
      : allKeys[0] ?? '';

  const [xKey, setXKey] = useState<string>(defaultXKey);
  const [yKey, setYKey] = useState<string>(defaultYKey);

  const data = useMemo(
    () =>
      datasetEmpty || !xKey || !yKey
        ? []
        : buildScatterData(experiments, xKey, yKey),
    [datasetEmpty, xKey, yKey],
  );

  // If there is no data at all, we again show a simple explanatory card.
  if (datasetEmpty) {
    return (
      <div className="rounded-xl bg-surface p-4 text-sm text-slate-700 ring-1 ring-border">
        The dataset does not contain any numeric properties yet, so the scatter
        explorer cannot draw a chart.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls row: pick which properties to use for each axis */}
      <div className="flex flex-wrap gap-4" aria-label="Scatter configuration">
        <div className="flex flex-col gap-1">
          <label
            htmlFor="x-select"
            className="text-xs font-medium text-slate-700"
          >
            X-axis property
          </label>
          <select
            id="x-select"
            className="min-w-[200px] rounded-md border border-border bg-white px-2 py-1 text-xs text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            value={xKey}
            onChange={(e) => setXKey(e.target.value)}
          >
            {allKeys.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="y-select"
            className="text-xs font-medium text-slate-700"
          >
            Y-axis property
          </label>
          <select
            id="y-select"
            className="min-w-[200px] rounded-md border border-border bg-white px-2 py-1 text-xs text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            value={yKey}
            onChange={(e) => setYKey(e.target.value)}
          >
            {allKeys.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </div>

        <p className="self-end text-xs text-muted">
          Showing {data.length} experiments with valid values for both axes.
        </p>
      </div>

      {/* Main chart area */}
      <div className="h-[360px] w-full rounded-lg bg-surface/80 p-2 ring-1 ring-border">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="x"
              name={xKey}
              label={{
                value: xKey,
                position: 'insideBottom',
                offset: -20,
              }}
              tick={{ fontSize: 10 }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name={yKey}
              label={{
                value: yKey,
                angle: -90,
                position: 'insideLeft',
              }}
              tick={{ fontSize: 10 }}
            />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              formatter={(value: unknown) =>
                typeof value === 'number'
                  ? value.toFixed(2)
                  : String(value ?? '')
              }
              labelFormatter={() => ''}
              contentStyle={{ fontSize: 12 }}
            />
            {/* The dots themselves use the Uncountable blue */}
            <Scatter name="Experiments" data={data} fill="#231FD5" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <p className="text-xs text-muted">
        Use this view to quickly see how formulation knobs (polymers, fillers,
        plasticizers) relate to key performance metrics like tensile strength,
        viscosity, and compression set.
      </p>
    </div>
  );
}
