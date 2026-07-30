import { describe, expect, it } from "vitest";
import type {
  AttractivenessModelManifest,
  MeasurementResult,
} from "../domain/contracts";
import {
  computeAttractivenessScore,
  computeGeometryBalanceScore,
  GEOMETRY_BALANCE_TARGETS,
  REQUIRED_ATTRACTIVENESS_METRIC_IDS,
} from "./scoring";

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
    uncertainty: { lower: value - 0.02, upper: value + 0.02 },
    sensitivityDelta: 0.01,
    stability,
    sampleCount: 3,
    status: "experimental",
  };
}

function model(
  options: { intercept?: number; coefficient?: number } = {},
): AttractivenessModelManifest {
  return {
    schemaVersion: 1,
    modelVersion: "fixture-v1",
    label: "experimental SCUT benchmark estimate",
    intercept: options.intercept ?? 2,
    features: REQUIRED_ATTRACTIVENESS_METRIC_IDS.map((measurementId) => ({
      measurementId,
      mean: 0,
      standardDeviation: 1,
      coefficient: options.coefficient ?? 0.1,
    })),
    validation: {
      sampleCount: 100,
      pearson: 0.7,
      mae: 0.3,
      rmse: 0.4,
      absoluteErrorQuantile90: 0.5,
      asianMaleMae: 0.4,
      caucasianMaleMae: 0.4,
      folds: 5,
      nested: true,
      seed: 20260729,
      releaseEligible: true,
    },
    provenance: {
      dataset: "SCUT-FBP5500",
      datasetVersion: "release",
      trainingSubsets: ["Asian male", "Caucasian male"],
      targetPopulation:
        "self-confirmed adult men; SCUT male-subset volunteer ratings; no audience-age segmentation",
      trainingCodeVersion: "fixture",
      regularization: {
        method: "ridge",
        selectedLambdas: [1, 1, 1, 1, 1],
        finalLambda: 1,
      },
    },
    license: {
      code: "MIT",
      modelPack: "SCUT non-commercial research terms",
      notice: "Fixture only.",
      redistributionConfirmed: true,
    },
    requiredMetricIds: REQUIRED_ATTRACTIVENESS_METRIC_IDS,
  };
}

function completeMeasurements(
  value: number,
  stability: MeasurementResult["stability"] = "stable",
) {
  return REQUIRED_ATTRACTIVENESS_METRIC_IDS.map((id) =>
    result(id, value, stability),
  );
}

describe("experimental benchmark score", () => {
  it("uses the exact standardized ridge arithmetic and exposes contributions", () => {
    const score = computeAttractivenessScore(
      completeMeasurements(1),
      "precision",
      model(),
      "fixture-checksum",
    );
    expect(score.status).toBe("available");
    expect(score.rawScore).toBeCloseTo(3.3, 12);
    expect(score.score).toBe(5.8);
    expect(score.components).toHaveLength(13);
    expect(
      score.components.reduce(
        (sum, component) => sum + component.contribution,
        0,
      ),
    ).toBeCloseTo(1.3, 12);
    expect(score.provenance.checksum).toBe("fixture-checksum");
    expect(score.disclaimer).toMatch(/does not represent U\.S\. women/i);
  });

  it("clamps the raw prediction before mapping to zero through ten", () => {
    expect(
      computeAttractivenessScore(
        completeMeasurements(1),
        "quick",
        model({ intercept: 9 }),
      ).score,
    ).toBe(10);
    expect(
      computeAttractivenessScore(
        completeMeasurements(1),
        "quick",
        model({ intercept: -9 }),
      ).score,
    ).toBe(0);
  });

  it("combines held-out residual error with propagated input uncertainty", () => {
    const score = computeAttractivenessScore(
      completeMeasurements(1),
      "precision",
      model({ coefficient: 0.2 }),
    );
    const expectedPropagation = Math.sqrt(13) * 0.2 * Math.hypot(0.02, 0.01);
    expect(score.propagatedMeasurementUncertainty).toBeCloseTo(
      expectedPropagation,
      12,
    );
    expect(score.uncertainty?.lower).toBeLessThan(score.score ?? 0);
    expect(score.uncertainty?.upper).toBeGreaterThan(score.score ?? 0);
  });

  it("withholds missing and non-finite required inputs", () => {
    const missing = computeAttractivenessScore(
      completeMeasurements(1).slice(1),
      "quick",
      model(),
    );
    expect(missing.status).toBe("withheld");
    expect(missing.withheldReasons[0]).toMatch(/missing/i);

    const nonFinite = completeMeasurements(1);
    nonFinite[0] = result(REQUIRED_ATTRACTIVENESS_METRIC_IDS[0], Number.NaN);
    expect(
      computeAttractivenessScore(nonFinite, "quick", model()).withheldReasons[0],
    ).toMatch(/non-finite/i);
  });

  it("withholds unstable precision inputs but permits single-capture scoring", () => {
    const inputs = completeMeasurements(1);
    inputs[0] = result(
      REQUIRED_ATTRACTIVENESS_METRIC_IDS[0],
      1,
      "unstable",
    );
    expect(
      computeAttractivenessScore(inputs, "precision", model()).status,
    ).toBe("withheld");
    expect(computeAttractivenessScore(inputs, "quick", model()).status).toBe(
      "available",
    );
  });
});

describe("transparent geometry fallback score", () => {
  const midpointMeasurements = () =>
    GEOMETRY_BALANCE_TARGETS.map((target) =>
      result(
        target.measurementId,
        (target.minimum + target.maximum) / 2,
      ),
    );

  it("returns an available inspectable score without claiming a preference model", () => {
    const score = computeGeometryBalanceScore(
      midpointMeasurements(),
      "quick",
      "Validated preference model unavailable.",
    );
    expect(score.status).toBe("available");
    expect(score.score).toBe(10);
    expect(score.rangeLabel).toBe("Input-sensitivity range");
    expect(score.components).toHaveLength(13);
    expect(score.provenance.basis).toBe("geometry-balance");
    expect(score.provenance.dataset).toMatch(/none/i);
    expect(score.disclaimer).toMatch(/not a validated attractiveness rating/i);
    expect(
      score.components.reduce(
        (sum, component) => sum + component.contribution,
        0,
      ),
    ).toBeCloseTo(10, 12);
  });

  it("reduces the score outside the broad bands and exposes target math", () => {
    const inputs = midpointMeasurements();
    const target = GEOMETRY_BALANCE_TARGETS[0];
    inputs[0] = result(
      target.measurementId,
      target.minimum - (target.maximum - target.minimum) * 2,
    );
    const score = computeGeometryBalanceScore(inputs, "quick");
    expect(score.status).toBe("available");
    expect(score.score).toBeLessThan(10);
    expect(score.components[0].targetMinimum).toBe(target.minimum);
    expect(score.components[0].targetMaximum).toBe(target.maximum);
    expect(score.components[0].similarity).toBeLessThan(1);
  });

  it("withholds only for unusable required inputs", () => {
    expect(
      computeGeometryBalanceScore(midpointMeasurements().slice(1), "quick")
        .status,
    ).toBe("withheld");
    const unstable = midpointMeasurements();
    unstable[0] = result(
      GEOMETRY_BALANCE_TARGETS[0].measurementId,
      unstable[0].value,
      "unstable",
    );
    expect(computeGeometryBalanceScore(unstable, "precision").status).toBe(
      "withheld",
    );
    expect(computeGeometryBalanceScore(unstable, "quick").status).toBe(
      "available",
    );
  });
});
