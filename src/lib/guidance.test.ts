import { describe, expect, it } from "vitest";
import type { MeasurementResult } from "../domain/contracts";
import { buildGuidance } from "./guidance";

function measurement(
  stability: MeasurementResult["stability"],
  confidence: number,
): MeasurementResult {
  return {
    id: "face-aspect",
    label: "Face aspect",
    category: "Test",
    unit: "ratio",
    value: 0.8,
    description: "Test",
    formula: "test",
    source: "test",
    limitations: "test",
    sensitivity: "medium",
    sensitivityDelta: 0.01,
    anchorIndices: [],
    version: "test",
    confidence,
    uncertainty: { lower: 0.75, upper: 0.85 },
    stability,
    sampleCount: 3,
    status: "experimental",
  };
}

describe("guidance safety rules", () => {
  it("explains unstable and low-confidence triggers", () => {
    const guidance = buildGuidance([measurement("unstable", 60)]);
    expect(guidance.find((item) => item.id === "repeatable-capture")?.why).toMatch(
      /unstable/i,
    );
    expect(guidance.some((item) => item.id === "confidence-first")).toBe(true);
  });

  it("keeps clinical material universal and non-personalized", () => {
    const guidance = buildGuidance([measurement("stable", 95)]);
    const professional = guidance.filter(
      (item) => item.evidenceLevel === "professional-education",
    );
    expect(professional).toHaveLength(3);
    expect(professional.every((item) => !item.reversible && item.sourceUrl)).toBe(
      true,
    );
    expect(professional.every((item) => item.why.match(/every|general|universal/i))).toBe(
      true,
    );
  });
});
