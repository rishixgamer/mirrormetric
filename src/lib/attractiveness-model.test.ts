import { describe, expect, it } from "vitest";
import type { AttractivenessModelManifest } from "../domain/contracts";
import {
  ATTRACTIVENESS_MODEL_PATH,
  loadAttractivenessModel,
  sha256Hex,
  validateAttractivenessModel,
} from "./attractiveness-model";
import { REQUIRED_ATTRACTIVENESS_METRIC_IDS } from "./scoring";

function validModel(): AttractivenessModelManifest {
  return {
    schemaVersion: 1,
    modelVersion: "test-v1",
    label: "experimental SCUT benchmark estimate",
    intercept: 3,
    features: REQUIRED_ATTRACTIVENESS_METRIC_IDS.map((measurementId) => ({
      measurementId,
      mean: 1,
      standardDeviation: 0.2,
      coefficient: 0.01,
    })),
    validation: {
      sampleCount: 1000,
      pearson: 0.61,
      mae: 0.4,
      rmse: 0.55,
      absoluteErrorQuantile90: 0.8,
      asianMaleMae: 0.5,
      caucasianMaleMae: 0.5,
      folds: 5,
      nested: true,
      seed: 42,
      releaseEligible: true,
    },
    provenance: {
      dataset: "SCUT-FBP5500",
      datasetVersion: "release",
      trainingSubsets: ["Asian male", "Caucasian male"],
      targetPopulation:
        "self-confirmed adult men; SCUT male-subset volunteer ratings; no audience-age segmentation",
      trainingCodeVersion: "test",
      regularization: {
        method: "ridge",
        selectedLambdas: [1, 1, 1, 1, 1],
        finalLambda: 1,
      },
    },
    license: {
      code: "MIT",
      modelPack: "SCUT non-commercial research terms",
      notice: "Test fixture only.",
      redistributionConfirmed: true,
    },
    requiredMetricIds: REQUIRED_ATTRACTIVENESS_METRIC_IDS,
  };
}

describe("attractiveness model manifest", () => {
  it("accepts the exact required feature set and release evidence", () => {
    expect(validateAttractivenessModel(validModel()).modelVersion).toBe(
      "test-v1",
    );
  });

  it("rejects invalid features and failed release gates", () => {
    const base = validModel();
    const duplicate = {
      ...base,
      features: [base.features[0], base.features[0], ...base.features.slice(2)],
    };
    expect(() => validateAttractivenessModel(duplicate)).toThrow(/feature/i);

    const failed = {
      ...base,
      validation: { ...base.validation, pearson: 0.59 },
    };
    expect(() => validateAttractivenessModel(failed)).toThrow(/release gates/i);
  });

  it("computes a deterministic SHA-256 digest", async () => {
    await expect(
      sha256Hex(new TextEncoder().encode("abc")),
    ).resolves.toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("loads only with a pinned checksum using a same-origin GET without a body", async () => {
    const bytes = new TextEncoder().encode(JSON.stringify(validModel()));
    const checksum = await sha256Hex(bytes);
    let request:
      | { input: RequestInfo | URL; init?: RequestInit }
      | undefined;
    const fetcher: typeof fetch = async (input, init) => {
      request = { input, init };
      return new Response(bytes, { status: 200 });
    };
    const loaded = await loadAttractivenessModel({
      expectedChecksum: checksum,
      fetcher,
      useDevelopmentFixture: false,
    });
    expect(loaded.checksum).toBe(checksum);
    expect(request?.input).toBe(ATTRACTIVENESS_MODEL_PATH);
    expect(request?.init?.method).toBe("GET");
    expect(request?.init?.credentials).toBe("same-origin");
    expect(request?.init?.body).toBeUndefined();
  });

  it("rejects a checksum mismatch before parsing a model", async () => {
    const fetcher: typeof fetch = async () =>
      new Response(JSON.stringify(validModel()), { status: 200 });
    await expect(
      loadAttractivenessModel({
        expectedChecksum: "0".repeat(64),
        fetcher,
        useDevelopmentFixture: false,
      }),
    ).rejects.toThrow(/checksum/i);
  });
});
