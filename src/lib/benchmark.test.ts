import { describe, expect, it } from "vitest";
import {
  assertRegressionGate,
  evaluateBenchmark,
  normalizedMeanError,
} from "../../tools/benchmark/metrics.mjs";

const sample = {
  id: "sample",
  normalizedBy: 100,
  groundTruth: [[0, 0], [100, 0]],
  prediction: [[1, 0], [99, 0]],
  tags: ["pose"],
};

describe("benchmark metrics", () => {
  it("computes normalized mean error and difficult subsets", () => {
    expect(normalizedMeanError(sample)).toBeCloseTo(0.01);
    const report = evaluateBenchmark({
      dataset: "fixture",
      normalization: "interocular",
      failureThreshold: 0.1,
      samples: [sample],
    });
    expect(report.overall.nme).toBeCloseTo(0.01);
    expect(report.overall.auc).toBeCloseTo(0.9);
    expect(report.subsets.pose.sampleCount).toBe(1);
  });

  it("rejects a greater-than-five-percent NME regression", () => {
    const baseline = { overall: { nme: 0.01, failureRate: 0 } };
    expect(() =>
      assertRegressionGate(
        { overall: { nme: 0.011, failureRate: 0 } },
        baseline,
      ),
    ).toThrow(/regression gate failed/i);
  });
});
