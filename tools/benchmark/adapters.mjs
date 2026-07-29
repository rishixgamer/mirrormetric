import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

export function parseWflwLine(line) {
  const values = line.trim().split(/\s+/);
  if (values.length < 207) {
    throw new Error("WFLW line must contain 98 point pairs and metadata.");
  }
  const points = [];
  for (let index = 0; index < 196; index += 2) {
    points.push([Number(values[index]), Number(values[index + 1])]);
  }
  return {
    groundTruth: points,
    boundingBox: values.slice(196, 200).map(Number),
    tags: [
      "pose",
      "expression",
      "illumination",
      "makeup",
      "occlusion",
      "blur",
    ].filter((_, index) => values[200 + index] === "1"),
    imagePath: values.slice(206).join(" "),
  };
}

export function parse300wPts(text) {
  const body = text.slice(text.indexOf("{") + 1, text.lastIndexOf("}"));
  return body
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.trim().split(/\s+/).map(Number))
    .filter((point) => point.length === 2 && point.every(Number.isFinite));
}

if (process.argv[1]?.endsWith("adapters.mjs")) {
  const format = process.argv[2];
  const input = process.argv[3];
  const output = process.argv[4];
  if (!format || !input || !output) {
    throw new Error(
      "Usage: node adapters.mjs wflw|300w input output.json",
    );
  }
  const text = await readFile(resolve(input), "utf8");
  const records =
    format === "wflw"
      ? text.trim().split(/\r?\n/).map(parseWflwLine)
      : format === "300w"
        ? [{ groundTruth: parse300wPts(text), imagePath: input, tags: [] }]
        : (() => {
            throw new Error(`Unsupported format: ${format}`);
          })();
  await writeFile(resolve(output), `${JSON.stringify(records, null, 2)}\n`);
}
