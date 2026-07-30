import {
  ANALYSIS_SCHEMA_VERSION,
  MEASUREMENT_CATALOG_VERSION,
  type AnalysisMode,
  type AnalysisSession,
  type AttractivenessModelManifest,
  type CaptureAnalysis,
} from "../domain/contracts";
import { aggregateMeasurements } from "./aggregation";
import { buildGuidance } from "./guidance";
import {
  computeAttractivenessScore,
  computeGeometryBalanceScore,
} from "./scoring";

export interface ScoreRequest {
  readonly requested: boolean;
  readonly model?: AttractivenessModelManifest;
  readonly checksum?: string;
  readonly modelError?: string;
}

export function createAnalysisSession(
  mode: AnalysisMode,
  captures: ReadonlyArray<CaptureAnalysis>,
  scoreRequest: ScoreRequest = { requested: false },
): AnalysisSession {
  const measurements = aggregateMeasurements(
    captures.map((capture) => capture.measurements),
  );
  const attractivenessScore = scoreRequest.requested
    ? scoreRequest.model
      ? computeAttractivenessScore(
          measurements,
          mode,
          scoreRequest.model,
          scoreRequest.checksum,
        )
      : computeGeometryBalanceScore(
          measurements,
          mode,
          scoreRequest.modelError ??
            "A validated benchmark model is unavailable; the transparent geometry fallback was used.",
        )
    : undefined;
  return {
    schemaVersion: ANALYSIS_SCHEMA_VERSION,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    mode,
    measurementCatalogVersion: MEASUREMENT_CATALOG_VERSION,
    captures,
    measurements,
    scoreRequested: scoreRequest.requested,
    attractivenessScore,
    attractivenessModel: scoreRequest.model,
    guidance: buildGuidance(measurements),
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
    attractivenessScore: session.scoreRequested
      ? session.attractivenessModel
        ? computeAttractivenessScore(
            measurements,
            session.mode,
            session.attractivenessModel,
            session.attractivenessScore?.provenance.checksum,
          )
        : computeGeometryBalanceScore(
            measurements,
            session.mode,
            session.attractivenessScore?.provenance.modelStatusNote,
          )
      : undefined,
    guidance: buildGuidance(measurements),
  };
}

export function migrateAnalysisSession(value: unknown): AnalysisSession {
  if (!value || typeof value !== "object") {
    throw new Error("This record is not a valid MirrorMetric analysis.");
  }
  const candidate = value as Record<string, unknown>;
  const schemaVersion = candidate.schemaVersion;
  if (
    schemaVersion !== 0 &&
    schemaVersion !== 1 &&
    schemaVersion !== ANALYSIS_SCHEMA_VERSION
  ) {
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
    scoreRequested: false,
    attractivenessScore: undefined,
    attractivenessModel: undefined,
    legacyGoalProfileId:
      schemaVersion === 1 ? candidate.goalProfileId : undefined,
    legacyGoalScore: schemaVersion === 1 ? candidate.score : undefined,
    goalProfileId: undefined,
    score: undefined,
  } as unknown as AnalysisSession;
}
