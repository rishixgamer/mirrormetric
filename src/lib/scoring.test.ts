import { describe, expect, it } from "vitest";
import type { MeasurementResult } from "../domain/contracts";
import { computeGoalScore, GOAL_PROFILES } from "./scoring";

function result(
  id: string,
  value: number,
  stability: MeasurementResult["stability"] = "stable",
): MeasurementResult {
  return {
    id,
    label: id,
    category: "Test",
    value,
    unit: "ratio",
    description: "Test",
    formula: "test",
    source: "test",
    limitations: "test",
    sensitivity: "medium",
    anchorIndices: [],
    version: "test",
    confidence: 90,
    uncertainty: { lower: value - 0.01, upper: value + 0.01 },
    sensitivityDelta: 0.01,
    stability,
    sampleCount: 3,
    status: "experimental",
  };
}

describe("goal similarity", () => {
  it("scores in-band values highly and exposes every component", () => {
    const profile = GOAL_PROFILES[0];
    const measurements = profile.targets.map((target) =>
      result(
        target.measurementId,
        (target.minimum + target.maximum) / 2,
      ),
    );
    const score = computeGoalScore(measurements, "balanced");
    expect(score.score).toBeCloseTo(100);
    expect(score.components).toHaveLength(profile.targets.length);
    expect(score.disclaimer).toMatch(/not attractiveness/i);
  });

  it("excludes unstable measurements", () => {
    const score = computeGoalScore(
      [result("face-aspect", 0.86, "unstable")],
      "balanced",
    );
    expect(score.components[0].included).toBe(false);
  });
});
