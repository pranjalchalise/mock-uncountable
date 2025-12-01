// src/services/advisor.ts
//
// Lightweight, rule-based advisor that compares an anchor experiment
// to dataset statistics and returns human-readable bullets.
//
// The idea here is to keep the logic very explicit so it is easy to follow
// what each suggestion is doing and why it fired.

import type { Experiment } from '../data/experiments';

export type AdvisorSection = {
  id: string;
  title: string;
  bullets: string[];
  // Optional debug / explanation string for the whole card.
  // Used for the "Why this suggestion?" panel in the UI.
  why?: string;
};

type Stats = {
  mean: number;
  min: number;
  max: number;
};

// Basic statistics helper.
// It throws away non-numeric and NaN values so weird entries do not skew things.
function computeStats(values: number[]): Stats {
  const valid = values.filter(
    (v) => typeof v === 'number' && Number.isFinite(v),
  );

  if (!valid.length) {
    // No data at all – fall back to zeros so the rest of the logic
    // still has something to work with.
    return { mean: 0, min: 0, max: 0 };
  }

  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const mean = valid.reduce((sum, v) => sum + v, 0) / valid.length;

  return { mean, min, max };
}

// Extract a single field as a list of values and compute stats for it.
// `kind` tells us whether to read from inputs or outputs.
function statsForField(
  experiments: Experiment[],
  field: string,
  kind: 'input' | 'output',
): Stats {
  const values = experiments.map((e) =>
    kind === 'input' ? e.inputs[field] : e.outputs[field],
  );
  return computeStats(values as number[]);
}

/**
 * Build heuristic advisor sections (cost, cure time, field performance)
 * for a given anchor experiment.
 *
 * This function never throws – if the dataset is missing some fields,
 * we just get fairly neutral suggestions instead of crashing.
 */
export function buildAdvisorSections(
  anchor: Experiment,
  allExperiments: Experiment[],
): AdvisorSection[] {
  // Pre-compute a few stats we care about up front, so we do not keep
  // recomputing them inside each conditional.
  const coAgent1Stats = statsForField(allExperiments, 'Co-Agent 1', 'input');
  const coAgent2Stats = statsForField(allExperiments, 'Co-Agent 2', 'input');
  const carbonBlackHighStats = statsForField(
    allExperiments,
    'Carbon Black High Grade',
    'input',
  );
  const ovenStats = statsForField(allExperiments, 'Oven Temperature', 'input');

  const cureTimeStats = statsForField(allExperiments, 'Cure Time', 'output');
  const compressionStats = statsForField(
    allExperiments,
    'Compression Set',
    'output',
  );
  const elongationStats = statsForField(
    allExperiments,
    'Elongation',
    'output',
  );

  const bulletsCost: string[] = [];
  const bulletsCure: string[] = [];
  const bulletsField: string[] = [];

  // Lines that feed the “Why this suggestion?” debug text per card.
  const whyCostLines: string[] = [];
  const whyCureLines: string[] = [];
  const whyFieldLines: string[] = [];

  const anchorInputs = anchor.inputs;
  const anchorOutputs = anchor.outputs;

  // Helper functions to decide if a value looks "high" or "low"
  // relative to the dataset mean. 15% is an arbitrary but easy-to-explain band.
  const high = (value: number, stats: Stats) => value > stats.mean * 1.15;
  const low = (value: number, stats: Stats) => value < stats.mean * 0.85;

  const highThreshold = (stats: Stats) => stats.mean * 1.15;
  const lowThreshold = (stats: Stats) => stats.mean * 0.85;

  // --- Cost levers ---------------------------------------------------------

  if (anchorInputs['Co-Agent 1'] !== undefined) {
    const v = anchorInputs['Co-Agent 1'];
    if (high(v, coAgent1Stats)) {
      bulletsCost.push(
        `Co-Agent 1 is relatively high here (${v.toFixed(
          1,
        )} vs dataset mean ${coAgent1Stats.mean.toFixed(
          1,
        )} phr). You could explore mixes that trade some of this for cheaper fillers while staying within the ${coAgent1Stats.min.toFixed(
          1,
        )}–${coAgent1Stats.max.toFixed(
          1,
        )} phr window observed in past runs.`,
      );
      whyCostLines.push(
        `Co-Agent 1: value = ${v.toFixed(
          2,
        )} phr, mean = ${coAgent1Stats.mean.toFixed(
          2,
        )} phr, range = ${coAgent1Stats.min.toFixed(
          2,
        )}–${coAgent1Stats.max.toFixed(
          2,
        )} phr. Rule: "high" if value > 1.15×mean (${highThreshold(
          coAgent1Stats,
        ).toFixed(2)}).`,
      );
    } else if (low(v, coAgent1Stats)) {
      bulletsCost.push(
        `Co-Agent 1 is on the low side (${v.toFixed(
          1,
        )} phr). If you need more performance headroom, there is room to increase up towards the historical mean ${coAgent1Stats.mean.toFixed(
          1,
        )} phr.`,
      );
      whyCostLines.push(
        `Co-Agent 1: value = ${v.toFixed(
          2,
        )} phr, mean = ${coAgent1Stats.mean.toFixed(
          2,
        )} phr. Rule: "low" if value < 0.85×mean (${lowThreshold(
          coAgent1Stats,
        ).toFixed(2)}).`,
      );
    }
  }

  if (anchorInputs['Co-Agent 2'] !== undefined) {
    const v = anchorInputs['Co-Agent 2'];
    if (high(v, coAgent2Stats)) {
      bulletsCost.push(
        `Co-Agent 2 is also high (${v.toFixed(
          1,
        )} vs dataset mean ${coAgent2Stats.mean.toFixed(
          1,
        )} phr). Experiments that substitute some of this for cheaper filler systems may reduce cost while staying within the ${coAgent2Stats.min.toFixed(
          1,
        )}–${coAgent2Stats.max.toFixed(1)} phr historical band.`,
      );
      whyCostLines.push(
        `Co-Agent 2: value = ${v.toFixed(
          2,
        )} phr, mean = ${coAgent2Stats.mean.toFixed(
          2,
        )} phr, range = ${coAgent2Stats.min.toFixed(
          2,
        )}–${coAgent2Stats.max.toFixed(
          2,
        )} phr. Rule: "high" if value > 1.15×mean (${highThreshold(
          coAgent2Stats,
        ).toFixed(2)}).`,
      );
    }
  }

  if (anchorInputs['Carbon Black High Grade'] !== undefined) {
    const v = anchorInputs['Carbon Black High Grade'];
    if (high(v, carbonBlackHighStats)) {
      bulletsCost.push(
        `Carbon Black High Grade is near the top of the historical range (${v.toFixed(
          1,
        )} vs mean ${carbonBlackHighStats.mean.toFixed(
          1,
        )} phr). If cost is driving, you could search for runs that partially replace this with lower grade carbon black or silica filler while watching mechanical properties.`,
      );
      whyCostLines.push(
        `Carbon Black High Grade: value = ${v.toFixed(
          2,
        )} phr, mean = ${carbonBlackHighStats.mean.toFixed(
          2,
        )} phr, range = ${carbonBlackHighStats.min.toFixed(
          2,
        )}–${carbonBlackHighStats.max.toFixed(
          2,
        )} phr. Rule: "high" if value > 1.15×mean (${highThreshold(
          carbonBlackHighStats,
        ).toFixed(2)}).`,
      );
    }
  }

  // If nothing fired, we still want a gentle "no big cost flags" message.
  if (!bulletsCost.length) {
    bulletsCost.push(
      'The current run sits close to typical loadings for the main co-agents and fillers. Cost levers are likely to come from incremental filler substitutions rather than large stoichiometric changes.',
    );
    whyCostLines.push(
      'No major cost outliers detected for the tracked co-agents and fillers (all within ±15% of historical means).',
    );
  }

  // --- Cure time & oven utilisation ---------------------------------------

  if (anchorOutputs['Cure Time'] !== undefined) {
    const v = anchorOutputs['Cure Time'];
    if (high(v, cureTimeStats)) {
      bulletsCure.push(
        `Cure time (${v.toFixed(
          2,
        )} min) is slower than the dataset mean (${cureTimeStats.mean.toFixed(
          2,
        )} min). You could prioritise designs with slightly higher oven temperatures or co-agent loadings that move you back towards the lower half of the observed cure-time window.`,
      );
      whyCureLines.push(
        `Cure Time: value = ${v.toFixed(
          2,
        )} min, mean = ${cureTimeStats.mean.toFixed(
          2,
        )} min. Rule: "slow" if value > 1.15×mean (${highThreshold(
          cureTimeStats,
        ).toFixed(2)}).`,
      );
    } else {
      bulletsCure.push(
        `Cure time (${v.toFixed(
          2,
        )} min) is already at or better than the dataset mean (${cureTimeStats.mean.toFixed(
          2,
        )} min). This run can act as a reference when optimising cost without sacrificing turn-around.`,
      );
      whyCureLines.push(
        `Cure Time: value = ${v.toFixed(
          2,
        )} min, mean = ${cureTimeStats.mean.toFixed(
          2,
        )} min. Rule: considered "acceptable" if within ±15% of mean.`,
      );
    }
  }

  if (anchorInputs['Oven Temperature'] !== undefined) {
    const v = anchorInputs['Oven Temperature'];
    if (high(v, ovenStats)) {
      bulletsCure.push(
        `Oven temperature is at the upper part of the historical range (${v.toFixed(
          0,
        )} °F vs ${ovenStats.min.toFixed(
          0,
        )}–${ovenStats.max.toFixed(
          0,
        )} °F). If energy usage is a concern, you could explore nearby recipes that operate slightly cooler while confirming they preserve cure time and performance.`,
      );
      whyCureLines.push(
        `Oven Temperature: value = ${v.toFixed(
          0,
        )} °F, range = ${ovenStats.min.toFixed(
          0,
        )}–${ovenStats.max.toFixed(
          0,
        )} °F. Rule: "high" if value > 1.15×mean (${highThreshold(
          ovenStats,
        ).toFixed(0)}).`,
      );
    } else {
      bulletsCure.push(
        `Oven temperature is moderate (${v.toFixed(
          0,
        )} °F). There may be room to push temperature up slightly for faster cure when cycle-time pressure is high.`,
      );
      whyCureLines.push(
        `Oven Temperature: value = ${v.toFixed(
          0,
        )} °F, mean = ${ovenStats.mean.toFixed(
          0,
        )} °F. Rule: considered "moderate" if within historical min–max.`,
      );
    }
  }

  // --- Field performance & scrap ------------------------------------------

  if (anchorOutputs['Compression Set'] !== undefined) {
    const v = anchorOutputs['Compression Set'];
    if (v <= compressionStats.mean) {
      bulletsField.push(
        `Compression set (${v.toFixed(
          1,
        )} %) is at or below the dataset mean (${compressionStats.mean.toFixed(
          1,
        )} %), which is favourable for long-term sealing and lower scrap risk.`,
      );
      whyFieldLines.push(
        `Compression Set: value = ${v.toFixed(
          1,
        )} %, mean = ${compressionStats.mean.toFixed(
          1,
        )} %. Rule: "favourable" if value ≤ mean.`,
      );
    } else {
      bulletsField.push(
        `Compression set (${v.toFixed(
          1,
        )} %) is higher than typical (mean ${compressionStats.mean.toFixed(
          1,
        )} %). When changing formulation, you may want to bias towards regions where compression set trends lower, even if it costs a small amount of elongation.`,
      );
      whyFieldLines.push(
        `Compression Set: value = ${v.toFixed(
          1,
        )} %, mean = ${compressionStats.mean.toFixed(
          1,
        )} %. Rule: "high" if value > mean.`,
      );
    }
  }

  if (anchorOutputs['Elongation'] !== undefined) {
    const v = anchorOutputs['Elongation'];
    if (high(v, elongationStats)) {
      bulletsField.push(
        `Elongation (${v.toFixed(
          1,
        )} %) is in the upper half of the dataset (mean ${elongationStats.mean.toFixed(
          1,
        )} %). That gives some headroom to trade a little elongation for cost or compression-set improvements.`,
      );
      whyFieldLines.push(
        `Elongation: value = ${v.toFixed(
          1,
        )} %, mean = ${elongationStats.mean.toFixed(
          1,
        )} %. Rule: "high" if value > 1.15×mean (${highThreshold(
          elongationStats,
        ).toFixed(1)}).`,
      );
    } else if (low(v, elongationStats)) {
      bulletsField.push(
        `Elongation (${v.toFixed(
          1,
        )} %) is lower than typical. When pushing cost down, it will be important to watch this metric so it does not erode further.`,
      );
      whyFieldLines.push(
        `Elongation: value = ${v.toFixed(
          1,
        )} %, mean = ${elongationStats.mean.toFixed(
          1,
        )} %. Rule: "low" if value < 0.85×mean (${lowThreshold(
          elongationStats,
        ).toFixed(1)}).`,
      );
    }
  }

  if (!bulletsField.length) {
    bulletsField.push(
      'Mechanical performance sits near the centre of the historical cloud. Future trials can explore small movements along the cost / cure-time axes while monitoring compression set and elongation.',
    );
    whyFieldLines.push(
      'No major performance outliers detected for Compression Set or Elongation (both within ±15% of historical means).',
    );
  }

  return [
    {
      id: 'cost',
      title: 'Cost levers',
      bullets: bulletsCost,
      why: whyCostLines.join('\n'),
    },
    {
      id: 'cure',
      title: 'Cure time & oven utilisation',
      bullets: bulletsCure,
      why: whyCureLines.join('\n'),
    },
    {
      id: 'field',
      title: 'Field performance & scrap',
      bullets: bulletsField,
      why: whyFieldLines.join('\n'),
    },
  ];
}
