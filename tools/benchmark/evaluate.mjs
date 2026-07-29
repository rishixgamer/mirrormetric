import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  assertRegressionGate,
  evaluateBenchmark,
} from "./metrics.mjs";

function valueAfter(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const inputPath =
  process.argv[2]?.startsWith("--") || !process.argv[2]
    ? "tools/benchmark/fixtures/synthetic-predictions.json"
    : process.argv[2];
const input = JSON.parse(await readFile(resolve(inputPath), "utf8"));
const report = evaluateBenchmark(input);
const baselinePath = valueAfter("--baseline");
if (baselinePath) {
  const baseline = JSON.parse(await readFile(resolve(baselinePath), "utf8"));
  assertRegressionGate(report, baseline);
}
const outputPath = valueAfter("--output");
if (outputPath) {
  await writeFile(resolve(outputPath), `${JSON.stringify(report, null, 2)}\n`);
}
console.log(JSON.stringify(report, null, 2));
