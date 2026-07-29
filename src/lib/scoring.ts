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

function roundToTenth(value: number): number {
  return Math.round((value + Number.EPSILON) * 10) / 10;
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
      label: model.label,
      modelVersion: model.modelVersion,
      dataset: model.provenance.dataset,
      targetPopulation: model.provenance.targetPopulation,
      validation: model.validation,
      checksum,
      licenseNotice: model.license.notice,
    },
    disclaimer: DISCLAIMER,
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
