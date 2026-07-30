import {
  type AnalysisMode,
  type AttractivenessModelManifest,
  type AttractivenessScoreComponent,
  type AttractivenessScoreResult,
  type MeasurementResult,
} from "../domain/contracts";
import { clamp } from "./geometry";

export const REQUIRED_ATTRACTIVENESS_METRIC_IDS = [
  "jaw-cheek",
  "eye-spacing",
  "left-eye-face",
  "right-eye-face",
  "eye-symmetry",
  "mean-canthal-tilt",
  "canthal-symmetry",
  "brow-eye-symmetry",
  "nose-face",
  "mouth-nose",
  "mouth-face",
  "lip-aperture",
  "jaw-side-symmetry",
] as const;

const DISCLAIMER =
  "This optional result is an experimental benchmark estimate from two-dimensional geometry. It is not an objective measure of attractiveness, health, worth, identity, or a population percentile, and it does not represent U.S. women ages 18–21.";
const GEOMETRY_DISCLAIMER =
  "This 0–10 number reports fit to project-defined broad geometry bands. It is not a validated attractiveness rating, preference prediction, or measure of health, identity, worth, or a population percentile, and it does not represent women ages 18–21.";

interface GeometryBalanceTarget {
  readonly measurementId: (typeof REQUIRED_ATTRACTIVENESS_METRIC_IDS)[number];
  readonly minimum: number;
  readonly maximum: number;
  readonly weight: number;
}

/**
 * Broad, project-defined bands keep the fallback inspectable. They are not
 * learned from attractiveness labels and are not population norms.
 */
export const GEOMETRY_BALANCE_TARGETS: ReadonlyArray<GeometryBalanceTarget> = [
  { measurementId: "jaw-cheek", minimum: 0.7, maximum: 0.86, weight: 1 },
  { measurementId: "eye-spacing", minimum: 0.8, maximum: 1.25, weight: 1 },
  { measurementId: "left-eye-face", minimum: 0.14, maximum: 0.25, weight: 0.7 },
  { measurementId: "right-eye-face", minimum: 0.14, maximum: 0.25, weight: 0.7 },
  { measurementId: "eye-symmetry", minimum: 85, maximum: 100, weight: 0.9 },
  { measurementId: "mean-canthal-tilt", minimum: -2, maximum: 12, weight: 0.5 },
  { measurementId: "canthal-symmetry", minimum: 70, maximum: 100, weight: 0.4 },
  { measurementId: "brow-eye-symmetry", minimum: 75, maximum: 100, weight: 0.6 },
  { measurementId: "nose-face", minimum: 0.18, maximum: 0.32, weight: 0.8 },
  { measurementId: "mouth-nose", minimum: 1.2, maximum: 1.9, weight: 0.8 },
  { measurementId: "mouth-face", minimum: 0.28, maximum: 0.48, weight: 0.7 },
  { measurementId: "lip-aperture", minimum: 0.02, maximum: 0.25, weight: 0.3 },
  { measurementId: "jaw-side-symmetry", minimum: 85, maximum: 100, weight: 0.9 },
];

function roundToTenth(value: number): number {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}

function bandSimilarity(
  value: number,
  target: Pick<GeometryBalanceTarget, "minimum" | "maximum">,
): number {
  if (value >= target.minimum && value <= target.maximum) return 1;
  const width = Math.max(target.maximum - target.minimum, Number.EPSILON);
  const distance =
    value < target.minimum
      ? target.minimum - value
      : value - target.maximum;
  return clamp(Math.exp((-2.5 * distance) / width), 0, 1);
}

export function createWithheldAttractivenessScore(
  reason: string,
): AttractivenessScoreResult {
  return {
    version: "unavailable",
    status: "withheld",
    inputConfidence: 0,
    components: [],
    withheldReasons: [reason],
    provenance: {
      basis: "scut-ridge",
      label: "experimental SCUT benchmark estimate",
      modelVersion: "unavailable",
      dataset: "SCUT-FBP5500",
      targetPopulation:
        "self-confirmed adult men; SCUT male-subset volunteer ratings; no audience-age segmentation",
      licenseNotice:
        "No SCUT-derived model pack is distributed until redistribution rights are confirmed.",
    },
    disclaimer: DISCLAIMER,
  };
}

export function computeGeometryBalanceScore(
  measurements: ReadonlyArray<MeasurementResult>,
  mode: AnalysisMode,
  modelStatusNote?: string,
): AttractivenessScoreResult {
  const byId = new Map(
    measurements.map((measurement) => [measurement.id, measurement]),
  );
  const withheldReasons: string[] = [];
  const totalWeight = GEOMETRY_BALANCE_TARGETS.reduce(
    (sum, target) => sum + target.weight,
    0,
  );
  let lowerWeightedSimilarity = 0;
  let upperWeightedSimilarity = 0;
  const components: AttractivenessScoreComponent[] =
    GEOMETRY_BALANCE_TARGETS.map((target) => {
      const measurement = byId.get(target.measurementId);
      let reason =
        "Compared with a broad project-defined band; this is not a learned attractiveness coefficient.";
      let included = true;
      if (!measurement) {
        reason = "Required measurement is missing.";
        included = false;
      } else if (!Number.isFinite(measurement.value)) {
        reason = "Required measurement is non-finite.";
        included = false;
      } else if (
        mode === "precision" &&
        measurement.stability === "unstable"
      ) {
        reason = "Required measurement is unstable across precision captures.";
        included = false;
      }
      if (!included) {
        withheldReasons.push(`${target.measurementId}: ${reason}`);
      }
      const value = measurement?.value ?? Number.NaN;
      const midpoint = (target.minimum + target.maximum) / 2;
      const tolerance = (target.maximum - target.minimum) / 2;
      const similarity = included ? bandSimilarity(value, target) : 0;
      if (included && measurement) {
        const intervalMinimum =
          measurement.uncertainty.lower - measurement.sensitivityDelta;
        const intervalMaximum =
          measurement.uncertainty.upper + measurement.sensitivityDelta;
        const endpointSimilarities = [
          bandSimilarity(intervalMinimum, target),
          bandSimilarity(intervalMaximum, target),
        ];
        lowerWeightedSimilarity +=
          Math.min(...endpointSimilarities) * target.weight;
        upperWeightedSimilarity +=
          (intervalMaximum >= target.minimum &&
          intervalMinimum <= target.maximum
            ? 1
            : Math.max(...endpointSimilarities)) * target.weight;
      }
      return {
        measurementId: target.measurementId,
        label: measurement?.label ?? target.measurementId,
        value,
        mean: midpoint,
        standardDeviation: tolerance,
        standardizedValue: included ? (value - midpoint) / tolerance : Number.NaN,
        coefficient: target.weight,
        contribution: (similarity * target.weight * 10) / totalWeight,
        included,
        reason,
        targetMinimum: target.minimum,
        targetMaximum: target.maximum,
        similarity: similarity * 100,
      };
    });
  const inputConfidence =
    GEOMETRY_BALANCE_TARGETS.reduce(
      (sum, target) =>
        sum + (byId.get(target.measurementId)?.confidence ?? 0) * target.weight,
      0,
    ) / totalWeight;
  const base = {
    version: "geometry-balance-1",
    inputConfidence,
    rangeLabel: "Input-sensitivity range" as const,
    components,
    withheldReasons,
    provenance: {
      basis: "geometry-balance" as const,
      label: "experimental geometry balance score",
      modelVersion: "geometry-balance-1",
      dataset: "None; project-defined broad geometry bands",
      targetPopulation:
        "Self-confirmed adult men who explicitly opt in; no demographic inference",
      licenseNotice:
        "The geometry fallback and its inspectable bands are MIT licensed.",
      modelStatusNote,
    },
    disclaimer: GEOMETRY_DISCLAIMER,
  };
  if (withheldReasons.length > 0) {
    return { ...base, status: "withheld" };
  }
  const score = roundToTenth(
    components.reduce(
      (sum, component) => sum + component.contribution,
      0,
    ),
  );
  const lower = roundToTenth((lowerWeightedSimilarity / totalWeight) * 10);
  const upper = roundToTenth((upperWeightedSimilarity / totalWeight) * 10);
  return {
    ...base,
    status: "available",
    score,
    propagatedMeasurementUncertainty: Math.max(score - lower, upper - score),
    uncertainty: {
      lower: clamp(Math.min(lower, score), 0, 10),
      upper: clamp(Math.max(upper, score), 0, 10),
    },
  };
}

export function computeAttractivenessScore(
  measurements: ReadonlyArray<MeasurementResult>,
  mode: AnalysisMode,
  model: AttractivenessModelManifest,
  checksum?: string,
): AttractivenessScoreResult {
  const byId = new Map(measurements.map((measurement) => [measurement.id, measurement]));
  const withheldReasons: string[] = [];
  const uncertaintyTerms: number[] = [];
  const components: AttractivenessScoreComponent[] = model.features.map((feature) => {
    const measurement = byId.get(feature.measurementId);
    let reason = "Included in the published ridge-regression model.";
    let included = true;
    if (!measurement) {
      reason = "Required measurement is missing.";
      included = false;
    } else if (!Number.isFinite(measurement.value)) {
      reason = "Required measurement is non-finite.";
      included = false;
    } else if (mode === "precision" && measurement.stability === "unstable") {
      reason = "Required measurement is unstable across precision captures.";
      included = false;
    }
    if (!included) {
      withheldReasons.push(`${feature.measurementId}: ${reason}`);
    }
    const value = measurement?.value ?? Number.NaN;
    const standardizedValue = included
      ? (value - feature.mean) / feature.standardDeviation
      : Number.NaN;
    const contribution = included
      ? standardizedValue * feature.coefficient
      : 0;
    if (included && measurement) {
      const intervalHalfWidth =
        Math.abs(measurement.uncertainty.upper - measurement.uncertainty.lower) /
        2;
      const standardizedUncertainty =
        Math.hypot(intervalHalfWidth, measurement.sensitivityDelta) /
        feature.standardDeviation;
      uncertaintyTerms.push(
        feature.coefficient * standardizedUncertainty,
      );
    }
    return {
      measurementId: feature.measurementId,
      label: measurement?.label ?? feature.measurementId,
      value,
      mean: feature.mean,
      standardDeviation: feature.standardDeviation,
      standardizedValue,
      coefficient: feature.coefficient,
      contribution,
      included,
      reason,
    };
  });

  const inputConfidence =
    model.features.length > 0
      ? model.features.reduce(
          (sum, feature) => sum + (byId.get(feature.measurementId)?.confidence ?? 0),
          0,
        ) / model.features.length
      : 0;
  const base = {
    version: model.modelVersion,
    inputConfidence,
    components,
    withheldReasons,
    provenance: {
      basis: "scut-ridge",
      label: model.label,
      modelVersion: model.modelVersion,
      dataset: model.provenance.dataset,
      targetPopulation: model.provenance.targetPopulation,
      validation: model.validation,
      checksum,
      licenseNotice: model.license.notice,
    },
    disclaimer: DISCLAIMER,
    rangeLabel: "90% range" as const,
  } satisfies Omit<
    AttractivenessScoreResult,
    "status" | "score" | "rawScore" | "uncertainty" | "propagatedMeasurementUncertainty"
  >;

  if (withheldReasons.length > 0) {
    return { ...base, status: "withheld" };
  }

  const prediction =
    model.intercept +
    components.reduce((sum, component) => sum + component.contribution, 0);
  const rawScore = clamp(prediction, 1, 5);
  const score = roundToTenth(((rawScore - 1) / 4) * 10);
  const propagatedMeasurementUncertainty = Math.hypot(...uncertaintyTerms);
  const rawMargin =
    model.validation.absoluteErrorQuantile90 +
    propagatedMeasurementUncertainty;
  const rawLower = clamp(rawScore - rawMargin, 1, 5);
  const rawUpper = clamp(rawScore + rawMargin, 1, 5);

  return {
    ...base,
    status: "available",
    rawScore,
    score,
    propagatedMeasurementUncertainty,
    uncertainty: {
      lower: roundToTenth(((rawLower - 1) / 4) * 10),
      upper: roundToTenth(((rawUpper - 1) / 4) * 10),
    },
  };
}
