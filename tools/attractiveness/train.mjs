import { readFile, readdir, writeFile } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";
import {
  extractCrossTopologyFeatures,
  parsePts,
  REQUIRED_METRIC_IDS,
} from "./features.mjs";
import { trainNestedRidge } from "./ridge.mjs";

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function parseCsvLine(line) {
  const cells = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < line.length; index++) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        cell += '"';
        index++;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      cells.push(cell.trim());
      cell = "";
    } else {
      cell += character;
    }
  }
  cells.push(cell.trim());
  return cells;
}

function subgroupFor(fileName, provided) {
  if (provided === "Asian male" || provided === "Caucasian male") return provided;
  const stem = basename(fileName, extname(fileName));
  if (/^AM/i.test(stem)) return "Asian male";
  if (/^CM/i.test(stem)) return "Caucasian male";
  throw new Error(`Cannot identify male SCUT subgroup for ${fileName}.`);
}

async function loadRows(landmarkDirectory, ratingsPath) {
  const lines = (await readFile(ratingsPath, "utf8"))
    .split(/\r?\n/)
    .filter((line) => line.trim());
  const headers = parseCsvLine(lines.shift()).map((header) =>
    header.toLowerCase(),
  );
  const fileColumn = headers.findIndex((header) =>
    ["file", "filename", "image"].includes(header),
  );
  const scoreColumn = headers.findIndex((header) =>
    ["score", "rating", "mean_rating"].includes(header),
  );
  const subgroupColumn = headers.indexOf("subgroup");
  if (fileColumn < 0 || scoreColumn < 0) {
    throw new Error("Ratings CSV needs file and score columns.");
  }
  const available = new Map(
    (await readdir(landmarkDirectory))
      .filter((file) => extname(file).toLowerCase() === ".pts")
      .map((file) => [basename(file, extname(file)), file]),
  );
  const rows = [];
  for (const line of lines) {
    const cells = parseCsvLine(line);
    const fileName = cells[fileColumn];
    const stem = basename(fileName, extname(fileName));
    const pointFile = available.get(stem);
    if (!pointFile || !/^(AM|CM)/i.test(stem)) continue;
    const score = Number(cells[scoreColumn]);
    if (!Number.isFinite(score) || score < 1 || score > 5) {
      throw new Error(`Invalid 1–5 SCUT rating for ${fileName}.`);
    }
    const points = parsePts(
      await readFile(join(landmarkDirectory, pointFile), "utf8"),
    );
    rows.push({
      id: stem,
      score,
      subgroup: subgroupFor(fileName, cells[subgroupColumn]),
      features: extractCrossTopologyFeatures(points),
    });
  }
  return rows;
}

const landmarkDirectory = argument("--landmarks");
const ratingsPath = argument("--ratings");
const outputPath = argument("--out");
if (!landmarkDirectory || !ratingsPath || !outputPath) {
  throw new Error(
    "Usage: node train.mjs --landmarks <SCUT pts dir> --ratings <file,score CSV> --out <model.json>",
  );
}
const seed = Number(argument("--seed", "20260729"));
const rows = await loadRows(resolve(landmarkDirectory), resolve(ratingsPath));
const training = trainNestedRidge(rows, { seed });
const redistributionConfirmed =
  argument("--redistribution-confirmed", "false") === "true";
const manifest = {
  schemaVersion: 1,
  modelVersion: argument("--model-version", "scut-male-geometry-1"),
  label: "experimental SCUT benchmark estimate",
  intercept: training.model.intercept,
  features: training.model.features,
  validation: training.validation,
  provenance: {
    dataset: "SCUT-FBP5500",
    datasetVersion: argument("--dataset-version", "user-supplied-release"),
    trainingSubsets: ["Asian male", "Caucasian male"],
    targetPopulation:
      "self-confirmed adult men; SCUT male-subset volunteer ratings; no audience-age segmentation",
    trainingCodeVersion: "attractiveness-training-1",
    regularization: {
      method: "ridge",
      selectedLambdas: training.selectedLambdas,
      finalLambda: training.finalLambda,
    },
  },
  license: {
    code: "MIT",
    modelPack: "SCUT-FBP5500 non-commercial research terms",
    notice:
      "Application and training code are MIT. SCUT data and any derived model pack retain separate non-commercial research restrictions.",
    redistributionConfirmed,
  },
  requiredMetricIds: REQUIRED_METRIC_IDS,
};
if (!training.validation.releaseEligible) {
  throw new Error(
    `Release gates failed: ${JSON.stringify(training.validation, null, 2)}`,
  );
}
await writeFile(resolve(outputPath), `${JSON.stringify(manifest, null, 2)}\n`, {
  flag: "wx",
});
console.log(
  JSON.stringify(
    {
      output: resolve(outputPath),
      redistributionConfirmed,
      validation: training.validation,
    },
    null,
    2,
  ),
);
