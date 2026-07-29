import {
  ANALYSIS_SCHEMA_VERSION,
  MEASUREMENT_CATALOG_VERSION,
  type AnalysisMode,
  type AnalysisSession,
  type CaptureAnalysis,
  type GoalProfileId,
} from "../domain/contracts";
import { aggregateMeasurements } from "./aggregation";
import { buildGuidance } from "./guidance";
import { computeGoalScore } from "./scoring";

export function createAnalysisSession(
  mode: AnalysisMode,
  captures: ReadonlyArray<CaptureAnalysis>,
  goalProfileId?: GoalProfileId,
): AnalysisSession {
  const measurements = aggregateMeasurements(
    captures.map((capture) => capture.measurements),
  );
  const score = goalProfileId
    ? computeGoalScore(measurements, goalProfileId)
    : undefined;
  return {
    schemaVersion: ANALYSIS_SCHEMA_VERSION,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    mode,
    measurementCatalogVersion: MEASUREMENT_CATALOG_VERSION,
    captures,
    measurements,
    goalProfileId,
    score,
    guidance: buildGuidance(
      measurements,
      goalProfileId ?? "balanced",
    ),
  };
}

export function updateSessionGoal(
  session: AnalysisSession,
  goalProfileId: GoalProfileId | undefined,
): AnalysisSession {
  return {
    ...session,
    goalProfileId,
    score: goalProfileId
      ? computeGoalScore(session.measurements, goalProfileId)
      : undefined,
    guidance: buildGuidance(
      session.measurements,
      goalProfileId ?? "balanced",
    ),
  };
}

export function replaceCapture(
  session: AnalysisSession,
  captureIndex: number,
  capture: CaptureAnalysis,
): AnalysisSession {
  const captures = session.captures.map((candidate, index) =>
    index === captureIndex ? capture : candidate,
  );
  const measurements = aggregateMeasurements(
    captures.map((candidate) => candidate.measurements),
  );
  return {
    ...session,
    captures,
    measurements,
    score: session.goalProfileId
      ? computeGoalScore(measurements, session.goalProfileId)
      : undefined,
    guidance: buildGuidance(
      measurements,
      session.goalProfileId ?? "balanced",
    ),
  };
}

export function migrateAnalysisSession(value: unknown): AnalysisSession {
  if (!value || typeof value !== "object") {
    throw new Error("This record is not a valid MirrorMetric analysis.");
  }
  const candidate = value as Record<string, unknown>;
  const schemaVersion = candidate.schemaVersion;
  if (schemaVersion !== 0 && schemaVersion !== ANALYSIS_SCHEMA_VERSION) {
    throw new Error(`Unsupported analysis schema version: ${String(schemaVersion)}.`);
  }
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.createdAt !== "string" ||
    (candidate.mode !== "quick" && candidate.mode !== "precision") ||
    !Array.isArray(candidate.captures) ||
    !Array.isArray(candidate.measurements) ||
    !Array.isArray(candidate.guidance)
  ) {
    throw new Error("This local record is missing required analysis fields.");
  }
  if (schemaVersion === ANALYSIS_SCHEMA_VERSION) {
    return candidate as unknown as AnalysisSession;
  }

  const migrateMeasurement = (measurement: unknown) => {
    const result = measurement as Record<string, unknown>;
    return {
      ...result,
      sensitivityDelta:
        typeof result.sensitivityDelta === "number"
          ? result.sensitivityDelta
          : 0,
    };
  };
  const captures = candidate.captures.map((capture) => {
    const record = capture as Record<string, unknown>;
    return {
      ...record,
      measurements: Array.isArray(record.measurements)
        ? record.measurements.map(migrateMeasurement)
        : [],
    };
  });
  return {
    ...candidate,
    schemaVersion: ANALYSIS_SCHEMA_VERSION,
    captures,
    measurements: candidate.measurements.map(migrateMeasurement),
  } as unknown as AnalysisSession;
}
