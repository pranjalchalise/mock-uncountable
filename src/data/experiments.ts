// src/data/experiments.ts
//
// This file turns the raw JSON-like object into a friendlier array of
// experiments, and exposes a couple of helper lists and functions so the
// components do not have to keep re-deriving the same information.

import { rawExperimentsData } from './experimentData';

// Maps of "property name" -> numeric value.
export type Inputs = Record<string, number>;
export type Outputs = Record<string, number>;

export interface Experiment {
  id: string;
  inputs: Inputs;
  outputs: Outputs;
}

// Turn the JSON dictionary into a nice array we can map over in React.
// We are careful here:
//
// - If rawExperimentsData is empty, we simply get an empty array.
// - If some experiment is missing inputs/outputs, we fall back to {} so the
//   rest of the app does not crash when it tries to read keys.
export const experiments: Experiment[] = Object.entries(
  rawExperimentsData ?? {},
).map(([id, value]) => {
  const inputs = (value as any)?.inputs ?? {};
  const outputs = (value as any)?.outputs ?? {};

  return {
    id,
    inputs: inputs as Inputs,
    outputs: outputs as Outputs,
  };
});

// Convenience: list of input and output keys.
// We derive these from the *first* experiment, but we guard against the case
// where the experiments array is empty so we do not throw an error.
const first = experiments[0];

export const inputKeys: string[] = first ? Object.keys(first.inputs) : [];
export const outputKeys: string[] = first ? Object.keys(first.outputs) : [];

// allKeys = every input and every output, with duplicates removed.
// This is handy for the scatter plot where we just want “all numeric choices”.
export const allKeys: string[] = Array.from(
  new Set<string>([...inputKeys, ...outputKeys]),
);

// Helper to get a value from either inputs or outputs by name.
// If the key does not exist we return NaN on purpose, so callers can use
// Number.isFinite() (or similar) to filter out missing values.
export function getValue(exp: Experiment, key: string): number {
  if (key in exp.inputs) return exp.inputs[key];
  if (key in exp.outputs) return exp.outputs[key];
  return NaN;
}
