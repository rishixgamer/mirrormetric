import type {
  MeasurementResult,
  MeasurementStability,
  MeasurementUnit,
  UncertaintyInterval,
} from "../domain/contracts";
import { clamp } from "./geometry";

function median(values: ReadonlyArray<number>): number {
  const sorted = [...values].sort((a, b) => a - b);
  const midpoint = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[midpoint]
    : (sorted[midpoint - 1] + sorted[midpoint]) / 2;
}

function standardDeviation(values: ReadonlyArray<number>): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    (values.length - 1);
  return Math.sqrt(variance);
}

function variation(
  values: ReadonlyArray<number>,
  unit: MeasurementUnit,
): number {
  const deviation = standardDeviation(values);
  if (unit === "degrees") return deviation;
  const center = Math.abs(median(values));
  return center < Number.EPSILON ? 0 : (deviation / center) * 100;
}

function stabilityFor(
  unit: MeasurementUnit,
  variationValue: number,
): MeasurementStability {
  return unit === "degrees"
    ? variationValue <= 1.5
      ? "stable"
      : "unstable"
    : variationValue <= 5
      ? "stable"
      : "unstable";
}

function aggregateInterval(
  value: number,
  values: ReadonlyArray<number>,
  fallback: UncertaintyInterval,
): UncertaintyInterval {
  if (values.length < 2) return fallback;
  const margin = Math.max(
    standardDeviation(values) * 1.96,
    (fallback.upper - fallback.lower) / 4,
  );
  return { lower: value - margin, upper: value + margin };
}

export function aggregateMeasurements(
  captures: ReadonlyArray<ReadonlyArray<MeasurementResult>>,
): MeasurementResult[] {
  if (captures.length === 0) return [];
  const first = captures[0];

  return first.map((definition, index) => {
    const samples = captures
      .map((capture) => capture[index])
      .filter(
        (candidate): candidate is MeasurementResult =>
          candidate?.id === definition.id,
      );
    const values = samples.map((sample) => sample.value);
    const value = median(values);
    const variationValue = variation(values, definition.unit);
    const stability =
      samples.length === 1
        ? "single-capture"
        : stabilityFor(definition.unit, variationValue);
    const averageConfidence =
      samples.reduce((sum, sample) => sum + sample.confidence, 0) /
      samples.length;
    const stabilityPenalty =
      stability === "unstable"
        ? definition.unit === "degrees"
          ? Math.min(35, variationValue * 5)
          : Math.min(35, variationValue * 2)
        : 0;

    return {
      ...definition,
      value,
      confidence: clamp(averageConfidence - stabilityPenalty, 0, 100),
      uncertainty: aggregateInterval(
        value,
        values,
        definition.uncertainty,
      ),
      stability,
      sampleCount: samples.length,
      variation: samples.length > 1 ? variationValue : undefined,
    };
  });
}
