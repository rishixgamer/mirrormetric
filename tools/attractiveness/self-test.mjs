import assert from "node:assert/strict";
import {
  extractCrossTopologyFeatures,
  mapScutAnchors,
  parsePts,
  REQUIRED_METRIC_IDS,
  SCUT_TO_MEDIAPIPE_ANCHORS,
} from "./features.mjs";
import { FIXTURE_ANCHORS, syntheticScutLandmarks } from "./fixtures.mjs";
import { trainNestedRidge } from "./ridge.mjs";

const points = syntheticScutLandmarks();
const mapped = mapScutAnchors(points);
for (const [name, mapping] of Object.entries(SCUT_TO_MEDIAPIPE_ANCHORS)) {
  assert.deepEqual(mapped[name], FIXTURE_ANCHORS[name]);
  assert.equal(Number.isInteger(mapping.mediaPipeIndex), true);
}
assert.deepEqual(
  Object.keys(extractCrossTopologyFeatures(points)),
  REQUIRED_METRIC_IDS,
);
assert.deepEqual(
  extractCrossTopologyFeatures(syntheticScutLandmarks(100)),
  extractCrossTopologyFeatures(points),
  "translation normalization must be deterministic",
);
const binaryFixture = new Uint8Array(4 + points.length * 8);
const binaryView = new DataView(binaryFixture.buffer);
binaryView.setUint32(0, points.length, true);
points.forEach((point, index) => {
  binaryView.setFloat32(4 + index * 8, point.x, true);
  binaryView.setFloat32(8 + index * 8, point.y, true);
});
assert.deepEqual(
  parsePts(binaryFixture),
  points,
  "the official binary SCUT landmark format must parse deterministically",
);
const textFixture = `version: 1\nn_points: 86\n{\n${points
  .map((point) => `${point.x} ${point.y}`)
  .join("\n")}\n}`;
assert.deepEqual(
  parsePts(new TextEncoder().encode(textFixture)),
  points,
  "text landmark bytes must remain supported",
);

const rows = Array.from({ length: 60 }, (_, index) => {
  const features = Object.fromEntries(
    REQUIRED_METRIC_IDS.map((id, featureIndex) => [
      id,
      0.25 +
        Math.sin((index + 1) * (featureIndex + 2)) * 0.07 +
        index * 0.001,
    ]),
  );
  const score =
    3 +
    (features["jaw-cheek"] - 0.25) * 1.8 +
    (features["eye-spacing"] - 0.25) * 1.2 -
    (features["lip-aperture"] - 0.25) * 0.8;
  return {
    id: `${index % 2 ? "CM" : "AM"}-${String(index).padStart(3, "0")}`,
    subgroup: index % 2 ? "Caucasian male" : "Asian male",
    score,
    features,
  };
});
const first = trainNestedRidge(rows, { seed: 117 });
const second = trainNestedRidge([...rows].reverse(), { seed: 117 });
assert.deepEqual(first, second, "training output must be order-independent");
assert.equal(first.validation.folds, 5);
assert.equal(first.validation.nested, true);
assert.equal(first.predictions.length, rows.length);
console.log(
  `Verified ${Object.keys(SCUT_TO_MEDIAPIPE_ANCHORS).length} landmark mappings and deterministic nested training.`,
);
