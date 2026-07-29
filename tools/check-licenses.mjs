import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = JSON.parse(await readFile(resolve("package.json"), "utf8"));
const names = [
  ...Object.keys(root.dependencies ?? {}),
  ...Object.keys(root.devDependencies ?? {}),
];
const allowed = new Set([
  "0BSD",
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "ISC",
  "MIT",
  "MPL-2.0",
]);
const failures = [];

for (const name of names) {
  const manifest = JSON.parse(
    await readFile(resolve("node_modules", name, "package.json"), "utf8"),
  );
  const licenses = String(manifest.license ?? "")
    .replace(/[()]/g, "")
    .split(/\s+(?:OR|AND)\s+/);
  if (!licenses.some((license) => allowed.has(license))) {
    failures.push(`${name}: ${manifest.license ?? "missing"}`);
  }
}

if (failures.length) {
  throw new Error(`Unreviewed direct dependency licenses:\n${failures.join("\n")}`);
}
console.log(`Reviewed ${names.length} direct dependency licenses.`);
