import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const manifest = await readFile(new URL("../checksums.txt", import.meta.url), "utf8");
const records = manifest
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("#"))
  .map((line) => {
    const [expected, ...parts] = line.split(/\s+/);
    return { expected, path: parts.join(" ") };
  });

for (const record of records) {
  const bytes = await readFile(new URL(`../${record.path}`, import.meta.url));
  const actual = createHash("sha256").update(bytes).digest("hex");
  if (actual !== record.expected) {
    throw new Error(`Checksum mismatch: ${record.path}`);
  }
}

console.log(`Verified ${records.length} pinned asset checksums.`);
