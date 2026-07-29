import { describe, expect, it } from "vitest";
import { migrateAnalysisSession } from "./session";

describe("analysis schema migration", () => {
  it("migrates the pre-release sensitivity field into schema version 2", () => {
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
    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.measurements[0].sensitivityDelta).toBe(0);
    expect(migrated.scoreRequested).toBe(false);
  });

  it("preserves schema-one goal scores as read-only legacy data", () => {
    const legacyScore = {
      version: "goal-similarity-1",
      profileId: "balanced",
      score: 82,
      confidence: 90,
      uncertainty: { lower: 76, upper: 88 },
      components: [],
      disclaimer: "Legacy score.",
    };
    const migrated = migrateAnalysisSession({
      schemaVersion: 1,
      id: "legacy-score",
      createdAt: "2026-01-01T00:00:00.000Z",
      mode: "quick",
      captures: [],
      measurements: [],
      guidance: [],
      measurementCatalogVersion: "legacy",
      goalProfileId: "balanced",
      score: legacyScore,
    });
    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.legacyGoalProfileId).toBe("balanced");
    expect(migrated.legacyGoalScore).toEqual(legacyScore);
    expect(migrated.attractivenessScore).toBeUndefined();
  });

  it("rejects unknown future schema versions", () => {
    expect(() => migrateAnalysisSession({ schemaVersion: 99 })).toThrow(
      /unsupported/i,
    );
  });
});
