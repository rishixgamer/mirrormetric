import {
  SCORE_MODEL_VERSION,
  type GoalMetricTarget,
  type GoalProfile,
  type GoalProfileId,
  type GoalScoreResult,
  type MeasurementResult,
  type ScoreComponent,
} from "../domain/contracts";
import { clamp } from "./geometry";

function targets(
  values: ReadonlyArray<
    readonly [string, number, number, number, string]
  >,
): GoalMetricTarget[] {
  return values.map(
    ([measurementId, minimum, maximum, weight, rationale]) => ({
      measurementId,
      minimum,
      maximum,
      weight,
      rationale,
    }),
  );
}

const COMMON_CAVEAT =
  "This is a project-defined style profile, not a population norm or an objective standard of beauty. The bands are inspectable and intentionally broad.";

export const GOAL_PROFILES: ReadonlyArray<GoalProfile> = [
  {
    version: SCORE_MODEL_VERSION,
    id: "balanced",
    label: "Balanced",
    description:
      "Broad middle bands across a small set of front-view proportions, without maximizing any one trait.",
    caveat: COMMON_CAVEAT,
    targets: targets([
      ["face-aspect", 0.78, 0.94, 1, "Broad overall-proportion band."],
      ["jaw-cheek", 0.7, 0.84, 1, "Moderate jaw-to-cheek relationship."],
      ["eye-spacing", 0.85, 1.15, 1, "Inner-eye gap near one mean eye width."],
      ["nose-face", 0.2, 0.29, 0.8, "Broad central-feature band."],
      ["mouth-nose", 1.3, 1.7, 0.8, "Broad mouth-to-nose relationship."],
      ["mouth-face", 0.3, 0.43, 0.7, "Broad lower-feature band."],
      ["lower-face-height", 0.37, 0.5, 0.7, "Moderate lower-face band."],
      ["mean-canthal-tilt", 1, 9, 0.5, "Wide, non-prescriptive tilt band."],
    ]),
  },
  {
    version: SCORE_MODEL_VERSION,
    id: "angular",
    label: "Angular",
    description:
      "Emphasizes stronger lower-face width and visible line structure while keeping the same transparent inputs.",
    caveat: COMMON_CAVEAT,
    targets: targets([
      ["face-aspect", 0.82, 0.99, 0.9, "Slightly wider projected face band."],
      ["jaw-cheek", 0.8, 0.96, 1.2, "Higher jaw-to-cheek relationship."],
      ["temple-face", 0.82, 0.98, 0.7, "Upper contour remains proportionate."],
      ["eye-spacing", 0.82, 1.15, 0.6, "Broad eye-spacing band."],
      ["lower-face-height", 0.4, 0.53, 0.9, "More lower-face emphasis."],
      ["mean-canthal-tilt", 2, 11, 0.5, "Wide style band, not a quality rule."],
    ]),
  },
  {
    version: SCORE_MODEL_VERSION,
    id: "soft",
    label: "Soft",
    description:
      "Emphasizes gentler contour transitions and a narrower jaw-to-cheek relationship.",
    caveat: COMMON_CAVEAT,
    targets: targets([
      ["face-aspect", 0.72, 0.9, 0.8, "Slightly narrower projected face band."],
      ["jaw-cheek", 0.6, 0.78, 1.2, "Lower jaw-to-cheek relationship."],
      ["temple-face", 0.84, 1.02, 0.8, "Broad upper-contour band."],
      ["eye-spacing", 0.88, 1.22, 0.6, "Broad eye-spacing band."],
      ["mouth-face", 0.31, 0.45, 0.6, "Broad lower-feature band."],
      ["lower-face-height", 0.35, 0.48, 0.8, "Less lower-face emphasis."],
    ]),
  },
  {
    version: SCORE_MODEL_VERSION,
    id: "androgynous",
    label: "Androgynous",
    description:
      "Keeps angular and soft profile weights close together without using gender or ethnicity.",
    caveat: COMMON_CAVEAT,
    targets: targets([
      ["face-aspect", 0.77, 0.94, 1, "Broad middle projected-face band."],
      ["jaw-cheek", 0.7, 0.86, 1, "Middle jaw-to-cheek relationship."],
      ["temple-face", 0.83, 1, 0.8, "Broad upper-contour band."],
      ["eye-spacing", 0.86, 1.2, 0.7, "Broad eye-spacing band."],
      ["nose-face", 0.2, 0.3, 0.6, "Broad central-feature band."],
      ["lower-face-height", 0.37, 0.5, 0.8, "Middle lower-face band."],
      ["mean-canthal-tilt", 1, 10, 0.4, "Wide style band, not a quality rule."],
    ]),
  },
];

export function getGoalProfile(id: GoalProfileId): GoalProfile {
  const profile = GOAL_PROFILES.find((candidate) => candidate.id === id);
  if (!profile) throw new Error(`Unknown goal profile: ${id}`);
  return profile;
}

function similarityFor(value: number, target: GoalMetricTarget): number {
  if (value >= target.minimum && value <= target.maximum) return 100;
  const width = Math.max(target.maximum - target.minimum, Number.EPSILON);
  const distance =
    value < target.minimum
      ? target.minimum - value
      : value - target.maximum;
  return clamp(100 * Math.exp((-2.5 * distance) / width), 0, 100);
}

export function computeGoalScore(
  measurements: ReadonlyArray<MeasurementResult>,
  profileId: GoalProfileId,
): GoalScoreResult {
  const profile = getGoalProfile(profileId);
  const byId = new Map(measurements.map((measurement) => [measurement.id, measurement]));
  const components: ScoreComponent[] = profile.targets.map((target) => {
    const measurement = byId.get(target.measurementId);
    const included = Boolean(
      measurement && measurement.stability !== "unstable",
    );
    return {
      measurementId: target.measurementId,
      label: measurement?.label ?? target.measurementId,
      value: measurement?.value ?? Number.NaN,
      targetMinimum: target.minimum,
      targetMaximum: target.maximum,
      weight: target.weight,
      similarity: measurement ? similarityFor(measurement.value, target) : 0,
      included,
      reason: !measurement
        ? "Measurement unavailable."
        : measurement.stability === "unstable"
          ? "Excluded because repeated captures were unstable."
          : target.rationale,
    };
  });
  const included = components.filter((component) => component.included);
  const totalWeight = included.reduce(
    (sum, component) => sum + component.weight,
    0,
  );
  const score =
    totalWeight > 0
      ? included.reduce(
          (sum, component) =>
            sum + component.similarity * component.weight,
          0,
        ) / totalWeight
      : 0;
  const confidence =
    included.length > 0
      ? included.reduce((sum, component) => {
          const measurement = byId.get(component.measurementId);
          return sum + (measurement?.confidence ?? 0) * component.weight;
        }, 0) / totalWeight
      : 0;
  const margin = clamp(14 - confidence * 0.09, 4, 14);

  return {
    version: SCORE_MODEL_VERSION,
    profileId,
    score,
    confidence,
    uncertainty: {
      lower: clamp(score - margin, 0, 100),
      upper: clamp(score + margin, 0, 100),
    },
    components,
    disclaimer:
      "Goal similarity is a subjective, project-defined comparison—not attractiveness, health, worth, or a population percentile.",
  };
}
