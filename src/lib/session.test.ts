import { describe, expect, it } from "vitest";
import { migrateAnalysisSession } from "./session";

describe("analysis schema migration", () => {
  it("migrates the pre-release sensitivity field into schema version 1", () => {
    const legacy = {
      schemaVersion: 0,
      id: "legacy",
      createdAt: "2026-01-01T00:00:00.000Z",
      mode: "quick",
      captures: [],
      measurements: [{ id: "face-aspect" }],
      guidance: [],
      measurementCatalogVersion: "legacy",
    };
    const migrated = migrateAnalysisSession(legacy);
    expect(migrated.schemaVersion).toBe(1);
    expect(migrated.measurements[0].sensitivityDelta).toBe(0);
  });

  it("rejects unknown future schema versions", () => {
    expect(() => migrateAnalysisSession({ schemaVersion: 99 })).toThrow(
      /unsupported/i,
    );
  });
});
