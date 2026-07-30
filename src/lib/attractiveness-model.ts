import type {
  AttractivenessModelManifest,
  AttractivenessValidationResults,
} from "../domain/contracts";
import { REQUIRED_ATTRACTIVENESS_METRIC_IDS } from "./scoring";

declare const __ATTRACTIVENESS_MODEL_SHA256__: string;

export const ATTRACTIVENESS_MODEL_PATH =
  "/models/attractiveness/scut-male-geometry-v1.json";
export const E2E_MODEL_STORAGE_KEY =
  "mirrormetric:e2e-attractiveness-model";

export interface LoadedAttractivenessModel {
  readonly manifest: AttractivenessModelManifest;
  readonly checksum: string;
}

export interface AttractivenessModelLoadOptions {
  readonly expectedChecksum?: string;
  readonly fetcher?: typeof fetch;
  readonly useDevelopmentFixture?: boolean;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function validationPassesReleaseGates(
  validation: AttractivenessValidationResults,
): boolean {
  return (
    validation.pearson >= 0.6 &&
    validation.mae <= 0.45 &&
    validation.rmse <= 0.6 &&
    validation.asianMaleMae <= validation.mae * 1.5 &&
    validation.caucasianMaleMae <= validation.mae * 1.5
  );
}

export function validateAttractivenessModel(
  value: unknown,
): AttractivenessModelManifest {
  if (!value || typeof value !== "object") {
    throw new Error("The attractiveness model pack is not an object.");
  }
  const candidate = value as Record<string, unknown>;
  const validation = candidate.validation as
    | AttractivenessValidationResults
    | undefined;
  const provenance = candidate.provenance as
    | AttractivenessModelManifest["provenance"]
    | undefined;
  const license = candidate.license as
    | AttractivenessModelManifest["license"]
    | undefined;
  if (
    candidate.schemaVersion !== 1 ||
    typeof candidate.modelVersion !== "string" ||
    candidate.label !== "experimental SCUT benchmark estimate" ||
    !isFiniteNumber(candidate.intercept) ||
    !Array.isArray(candidate.features) ||
    !Array.isArray(candidate.requiredMetricIds) ||
    !validation ||
    !provenance ||
    !license
  ) {
    throw new Error("The attractiveness model manifest is incomplete.");
  }

  const required = [...REQUIRED_ATTRACTIVENESS_METRIC_IDS];
  if (
    candidate.requiredMetricIds.length !== required.length ||
    candidate.requiredMetricIds.some(
      (id, index) => id !== required[index],
    ) ||
    candidate.features.length !== required.length
  ) {
    throw new Error("The model requires an unexpected measurement set.");
  }
  const seen = new Set<string>();
  for (
    const [featureIndex, feature] of (
      candidate.features as Array<Record<string, unknown>>
    ).entries()
  ) {
    if (
      typeof feature.measurementId !== "string" ||
      feature.measurementId !== required[featureIndex] ||
      !required.includes(
        feature.measurementId as (typeof REQUIRED_ATTRACTIVENESS_METRIC_IDS)[number],
      ) ||
      seen.has(feature.measurementId) ||
      !isFiniteNumber(feature.mean) ||
      !isFiniteNumber(feature.standardDeviation) ||
      feature.standardDeviation <= 0 ||
      !isFiniteNumber(feature.coefficient)
    ) {
      throw new Error("The model contains an invalid or duplicate feature.");
    }
    seen.add(feature.measurementId);
  }

  const validationNumbers = [
    validation.sampleCount,
    validation.pearson,
    validation.mae,
    validation.rmse,
    validation.absoluteErrorQuantile90,
    validation.asianMaleMae,
    validation.caucasianMaleMae,
    validation.seed,
  ];
  if (
    validation.folds !== 5 ||
    validation.nested !== true ||
    validation.releaseEligible !== true ||
    validationNumbers.some((number) => !isFiniteNumber(number)) ||
    !Number.isInteger(validation.sampleCount) ||
    validation.sampleCount <= 0 ||
    validation.pearson > 1 ||
    validation.mae < 0 ||
    validation.rmse < 0 ||
    validation.absoluteErrorQuantile90 < 0 ||
    validation.asianMaleMae < 0 ||
    validation.caucasianMaleMae < 0 ||
    !validationPassesReleaseGates(validation)
  ) {
    throw new Error("The model did not pass the published release gates.");
  }
  if (
    provenance.dataset !== "SCUT-FBP5500" ||
    provenance.targetPopulation !==
      "self-confirmed adult men; SCUT male-subset volunteer ratings; no audience-age segmentation" ||
    provenance.trainingSubsets.length !== 2 ||
    !provenance.trainingSubsets.includes("Asian male") ||
    !provenance.trainingSubsets.includes("Caucasian male") ||
    typeof provenance.datasetVersion !== "string" ||
    typeof provenance.trainingCodeVersion !== "string" ||
    provenance.regularization?.method !== "ridge" ||
    !Array.isArray(provenance.regularization.selectedLambdas) ||
    provenance.regularization.selectedLambdas.length !== 5 ||
    provenance.regularization.selectedLambdas.some(
      (lambda) => !isFiniteNumber(lambda) || lambda < 0,
    ) ||
    !isFiniteNumber(provenance.regularization.finalLambda) ||
    provenance.regularization.finalLambda < 0 ||
    license.code !== "MIT" ||
    license.redistributionConfirmed !== true ||
    typeof license.notice !== "string" ||
    typeof license.modelPack !== "string"
  ) {
    throw new Error("The model provenance or license notice is invalid.");
  }

  return value as AttractivenessModelManifest;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const digest = await crypto.subtle.digest("SHA-256", copy.buffer);
  return bytesToHex(new Uint8Array(digest));
}

export async function loadAttractivenessModel(
  options: AttractivenessModelLoadOptions = {},
): Promise<LoadedAttractivenessModel> {
  if (
    (import.meta.env.DEV || import.meta.env.VITE_E2E === "true") &&
    options.useDevelopmentFixture !== false &&
    typeof sessionStorage !== "undefined"
  ) {
    const fixture = sessionStorage.getItem(E2E_MODEL_STORAGE_KEY);
    if (fixture) {
      return {
        manifest: validateAttractivenessModel(JSON.parse(fixture)),
        checksum: "development-e2e-fixture",
      };
    }
  }

  const expectedChecksum = (
    options.expectedChecksum ?? __ATTRACTIVENESS_MODEL_SHA256__
  )
    .trim()
    .toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(expectedChecksum)) {
    throw new Error(
      "No release-eligible benchmark model is configured for this build.",
    );
  }
  const response = await (options.fetcher ?? fetch)(ATTRACTIVENESS_MODEL_PATH, {
    method: "GET",
    credentials: "same-origin",
    cache: "force-cache",
  });
  if (!response.ok) {
    throw new Error(`The benchmark model could not be loaded (${response.status}).`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  const checksum = await sha256Hex(bytes);
  if (checksum !== expectedChecksum) {
    throw new Error("The benchmark model checksum did not match this build.");
  }
  const manifest = validateAttractivenessModel(
    JSON.parse(new TextDecoder().decode(bytes)),
  );
  return { manifest, checksum };
}
