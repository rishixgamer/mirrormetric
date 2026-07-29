import type { LandmarkSet } from "./landmarks";

export const ANALYSIS_SCHEMA_VERSION = 1;
export const DETECTION_SCHEMA_VERSION = 1;
export const CAPTURE_SCHEMA_VERSION = 1;
export const MEASUREMENT_CATALOG_VERSION = "1.0.0-beta.1";
export const SCORE_MODEL_VERSION = "goal-similarity-1";
export const GUIDANCE_SCHEMA_VERSION = "guidance-1";
export const HISTORY_EXPORT_SCHEMA_VERSION = 1;

export type AnalysisMode = "quick" | "precision";
export type MeasurementUnit = "ratio" | "percent" | "degrees";
export type Sensitivity = "low" | "medium" | "high";
export type MeasurementStability = "single-capture" | "stable" | "unstable";
export type GoalProfileId = "balanced" | "angular" | "soft" | "androgynous";

export interface PoseEstimate {
  readonly yaw: number;
  readonly pitch: number;
  readonly roll: number;
  readonly source: "transformation-matrix" | "landmark-estimate";
}

export interface DetectionResult {
  readonly schemaVersion: typeof DETECTION_SCHEMA_VERSION;
  readonly faceCount: number;
  readonly landmarks: LandmarkSet;
  readonly pose: PoseEstimate;
  readonly blendshapes: Readonly<Record<string, number>>;
  readonly transformationMatrix?: ReadonlyArray<number>;
  readonly modelVersion: string;
}

export type CaptureIssueSeverity = "error" | "warning" | "pass";

export interface CaptureIssue {
  readonly id: string;
  readonly label: string;
  readonly detail: string;
  readonly severity: CaptureIssueSeverity;
}

export interface CaptureAssessment {
  readonly schemaVersion: typeof CAPTURE_SCHEMA_VERSION;
  readonly accepted: boolean;
  readonly confidence: number;
  readonly qualityScore: number;
  readonly pose: PoseEstimate;
  readonly faceCoverage: number;
  readonly issues: ReadonlyArray<CaptureIssue>;
}

export interface UncertaintyInterval {
  readonly lower: number;
  readonly upper: number;
}

export interface MeasurementDefinition {
  readonly id: string;
  readonly label: string;
  readonly category: string;
  readonly unit: MeasurementUnit;
  readonly description: string;
  readonly formula: string;
  readonly source: string;
  readonly limitations: string;
  readonly sensitivity: Sensitivity;
  readonly anchorIndices: ReadonlyArray<number>;
  readonly version: string;
}

export interface MeasurementResult extends MeasurementDefinition {
  readonly value: number;
  readonly confidence: number;
  readonly uncertainty: UncertaintyInterval;
  readonly sensitivityDelta: number;
  readonly stability: MeasurementStability;
  readonly sampleCount: number;
  readonly variation?: number;
  readonly status: "experimental";
}

export interface CaptureAnalysis {
  readonly id: string;
  readonly createdAt: string;
  readonly fileName: string;
  readonly width: number;
  readonly height: number;
  readonly assessment: CaptureAssessment;
  readonly landmarks: LandmarkSet;
  readonly measurements: ReadonlyArray<MeasurementResult>;
}

export interface GoalMetricTarget {
  readonly measurementId: string;
  readonly minimum: number;
  readonly maximum: number;
  readonly weight: number;
  readonly rationale: string;
}

export interface GoalProfile {
  readonly version: typeof SCORE_MODEL_VERSION;
  readonly id: GoalProfileId;
  readonly label: string;
  readonly description: string;
  readonly caveat: string;
  readonly targets: ReadonlyArray<GoalMetricTarget>;
}

export interface ScoreComponent {
  readonly measurementId: string;
  readonly label: string;
  readonly value: number;
  readonly targetMinimum: number;
  readonly targetMaximum: number;
  readonly weight: number;
  readonly similarity: number;
  readonly included: boolean;
  readonly reason: string;
}

export interface GoalScoreResult {
  readonly version: string;
  readonly profileId: GoalProfileId;
  readonly score: number;
  readonly confidence: number;
  readonly uncertainty: UncertaintyInterval;
  readonly components: ReadonlyArray<ScoreComponent>;
  readonly disclaimer: string;
}

export type EvidenceLevel =
  | "capture-standard"
  | "reversible-experiment"
  | "professional-education";

export interface GuidanceItem {
  readonly version: typeof GUIDANCE_SCHEMA_VERSION;
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly why: string;
  readonly evidenceLevel: EvidenceLevel;
  readonly reversible: boolean;
  readonly sourceLabel: string;
  readonly sourceUrl?: string;
  readonly safetyNote?: string;
}

export interface AnalysisSession {
  readonly schemaVersion: typeof ANALYSIS_SCHEMA_VERSION;
  readonly id: string;
  readonly createdAt: string;
  readonly mode: AnalysisMode;
  readonly measurementCatalogVersion: string;
  readonly captures: ReadonlyArray<CaptureAnalysis>;
  readonly measurements: ReadonlyArray<MeasurementResult>;
  readonly goalProfileId?: GoalProfileId;
  readonly score?: GoalScoreResult;
  readonly guidance: ReadonlyArray<GuidanceItem>;
}

export interface EncryptedEnvelope {
  readonly version: 1;
  readonly algorithm: "AES-GCM";
  readonly kdf: "PBKDF2-SHA-256";
  readonly iterations: number;
  readonly salt: string;
  readonly iv: string;
  readonly ciphertext: string;
}

export interface EncryptedHistoryExport {
  readonly schemaVersion: typeof HISTORY_EXPORT_SCHEMA_VERSION;
  readonly product: "MirrorMetric";
  readonly format: "mirrormetric-encrypted-export";
  readonly exportedAt: string;
  readonly sessions: ReadonlyArray<AnalysisSession>;
}
