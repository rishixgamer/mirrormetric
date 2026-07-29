import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { REQUIRED_METRIC_IDS } from "./features.mjs";

const modelUrl = new URL(
  "../../public/models/attractiveness/scut-male-geometry-v1.json",
  import.meta.url,
);
try {
  await access(modelUrl);
} catch {
  console.log(
    "No public SCUT-derived model pack is bundled; the application will fail closed.",
  );
  process.exit(0);
}

const bytes = await readFile(modelUrl);
const manifest = JSON.parse(bytes.toString("utf8"));
const validation = manifest.validation ?? {};
const releaseGatesPass =
  Number.isFinite(validation.pearson) &&
  validation.pearson >= 0.6 &&
  Number.isFinite(validation.mae) &&
  validation.mae <= 0.45 &&
  Number.isFinite(validation.rmse) &&
  validation.rmse <= 0.6 &&
  Number.isFinite(validation.absoluteErrorQuantile90) &&
  validation.absoluteErrorQuantile90 >= 0 &&
  Number.isFinite(validation.asianMaleMae) &&
  validation.asianMaleMae <= validation.mae * 1.5 &&
  Number.isFinite(validation.caucasianMaleMae) &&
  validation.caucasianMaleMae <= validation.mae * 1.5 &&
  validation.folds === 5 &&
  validation.nested === true;
const featureIds = Array.isArray(manifest.features)
  ? manifest.features.map((feature) => feature.measurementId)
  : [];
const featuresValid =
  JSON.stringify(featureIds) === JSON.stringify(REQUIRED_METRIC_IDS) &&
  manifest.features.every(
    (feature) =>
      Number.isFinite(feature.mean) &&
      Number.isFinite(feature.standardDeviation) &&
      feature.standardDeviation > 0 &&
      Number.isFinite(feature.coefficient),
  );
if (
  manifest.schemaVersion !== 1 ||
  manifest.label !== "experimental SCUT benchmark estimate" ||
  manifest.provenance?.dataset !== "SCUT-FBP5500" ||
  manifest.provenance?.regularization?.method !== "ridge" ||
  manifest.license?.redistributionConfirmed !== true ||
  manifest.validation?.releaseEligible !== true ||
  !releaseGatesPass ||
  !featuresValid
) {
  throw new Error(
    "A bundled model pack needs the exact feature contract, passing benchmark gates, provenance, and confirmed redistribution rights.",
  );
}
const checksum = createHash("sha256").update(bytes).digest("hex");
const pinned = process.env.VITE_ATTRACTIVENESS_MODEL_SHA256;
if (checksum !== pinned) {
  throw new Error(
    "VITE_ATTRACTIVENESS_MODEL_SHA256 does not pin the bundled model pack.",
  );
}
console.log(`Verified public attractiveness model pack ${checksum}.`);
