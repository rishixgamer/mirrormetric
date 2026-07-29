import { describe, expect, it } from "vitest";
import type { MeasurementResult } from "../domain/contracts";
import { aggregateMeasurements } from "./aggregation";

function measurement(value: number, unit: "ratio" | "degrees" = "ratio") {
  return {
    id: "metric",
    label: "Metric",
    category: "Test",
    value,
    unit,
    description: "Test",
    formula: "test",
    source: "test",
    limitations: "test",
    sensitivity: "medium",
    anchorIndices: [],
    version: "test",
    confidence: 90,
    uncertainty: { lower: value - 0.1, upper: value + 0.1 },
    sensitivityDelta: 0.01,
    stability: "single-capture",
    sampleCount: 1,
    status: "experimental",
  } satisfies MeasurementResult;
}

describe("measurement aggregation", () => {
  it("uses the median and marks repeatable ratios stable", () => {
    const result = aggregateMeasurements([
      [measurement(1)],
      [measurement(1.01)],
      [measurement(0.99)],
    ])[0];
    expect(result.value).toBeCloseTo(1);
    expect(result.stability).toBe("stable");
    expect(result.sampleCount).toBe(3);
  });

  it("marks angles unstable beyond the 1.5 degree threshold", () => {
    const result = aggregateMeasurements([
      [measurement(1, "degrees")],
      [measurement(4, "degrees")],
      [measurement(7, "degrees")],
    ])[0];
    expect(result.stability).toBe("unstable");
  });
});
