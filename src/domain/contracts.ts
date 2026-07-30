import type { LandmarkSet } from "./landmarks";

export const ANALYSIS_SCHEMA_VERSION = 2;
export const DETECTION_SCHEMA_VERSION = 1;
export const CAPTURE_SCHEMA_VERSION = 1;
export const MEASUREMENT_CATALOG_VERSION = "1.0.0-beta.1";
export const SCORE_MODEL_VERSION = "scut-male-geometry-1";
export const LEGACY_SCORE_MODEL_VERSION = "goal-similarity-1";
export const GUIDANCE_SCHEMA_VERSION = "guidance-1";
export const HISTORY_EXPORT_SCHEMA_VERSION = 1;

export type AnalysisMode = "quick" | "precision";
export type MeasurementUnit = "ratio" | "percent" | "degrees";
export type Sensitivity = "low" | "medium" | "high";
export type MeasurementStability = "single-capture" | "stable" | "unstable";
export type LegacyGoalProfileId =
  | "balanced"
  | "angular"
  | "soft"
  | "androgynous";
export type AttractivenessScoreStatus = "available" | "withheld";
export type AttractivenessScoreBasis =
  | "scut-ridge"
  | "geometry-balance";

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

export interface LegacyGoalMetricTarget {
  readonly measurementId: string;
  readonly minimum: number;
  readonly maximum: number;
  readonly weight: number;
  readonly rationale: string;
}

export interface LegacyGoalProfile {
  readonly version: typeof LEGACY_SCORE_MODEL_VERSION;
  readonly id: LegacyGoalProfileId;
  readonly label: string;
  readonly description: string;
  readonly caveat: string;
  readonly targets: ReadonlyArray<LegacyGoalMetricTarget>;
}

export interface LegacyScoreComponent {
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

export interface LegacyGoalScoreResult {
  readonly version: string;
  readonly profileId: LegacyGoalProfileId;
  readonly score: number;
  readonly confidence: number;
  readonly uncertainty: UncertaintyInterval;
  readonly components: ReadonlyArray<LegacyScoreComponent>;
  readonly disclaimer: string;
}

export interface AttractivenessModelFeature {
  readonly measurementId: string;
  readonly mean: number;
  readonly standardDeviation: number;
  readonly coefficient: number;
}

export interface AttractivenessValidationResults {
  readonly sampleCount: number;
  readonly pearson: number;
  readonly mae: number;
  readonly rmse: number;
  readonly absoluteErrorQuantile90: number;
  readonly asianMaleMae: number;
  readonly caucasianMaleMae: number;
  readonly folds: 5;
  readonly nested: true;
  readonly seed: number;
  readonly releaseEligible: boolean;
}

export interface AttractivenessModelManifest {
  readonly schemaVersion: 1;
  readonly modelVersion: string;
  readonly label: "experimental SCUT benchmark estimate";
  readonly intercept: number;
  readonly features: ReadonlyArray<AttractivenessModelFeature>;
  readonly validation: AttractivenessValidationResults;
  readonly provenance: {
    readonly dataset: "SCUT-FBP5500";
    readonly datasetVersion: string;
    readonly trainingSubsets: ReadonlyArray<"Asian male" | "Caucasian male">;
    readonly targetPopulation:
      "self-confirmed adult men; SCUT male-subset volunteer ratings; no audience-age segmentation";
    readonly trainingCodeVersion: string;
    readonly regularization: {
      readonly method: "ridge";
      readonly selectedLambdas: ReadonlyArray<number>;
      readonly finalLambda: number;
    };
  };
  readonly license: {
    readonly code: "MIT";
    readonly modelPack: string;
    readonly notice: string;
    readonly redistributionConfirmed: boolean;
  };
  readonly requiredMetricIds: ReadonlyArray<string>;
}

export interface AttractivenessScoreComponent {
  readonly measurementId: string;
  readonly label: string;
  readonly value: number;
  readonly mean: number;
  readonly standardDeviation: number;
  readonly standardizedValue: number;
  readonly coefficient: number;
  readonly contribution: number;
  readonly included: boolean;
  readonly reason: string;
  readonly targetMinimum?: number;
  readonly targetMaximum?: number;
  readonly similarity?: number;
}

export interface AttractivenessScoreResult {
  readonly version: string;
  readonly status: AttractivenessScoreStatus;
  readonly score?: number;
  readonly rawScore?: number;
  readonly inputConfidence: number;
  readonly uncertainty?: UncertaintyInterval;
  readonly propagatedMeasurementUncertainty?: number;
  readonly rangeLabel?: "90% range" | "Input-sensitivity range";
  readonly components: ReadonlyArray<AttractivenessScoreComponent>;
  readonly withheldReasons: ReadonlyArray<string>;
  readonly provenance: {
    readonly basis?: AttractivenessScoreBasis;
    readonly label: string;
    readonly modelVersion: string;
    readonly dataset: string;
    readonly targetPopulation: string;
    readonly validation?: AttractivenessValidationResults;
    readonly checksum?: string;
    readonly licenseNotice: string;
    readonly modelStatusNote?: string;
  };
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
  readonly scoreRequested: boolean;
  readonly attractivenessScore?: AttractivenessScoreResult;
  readonly attractivenessModel?: AttractivenessModelManifest;
  readonly legacyGoalProfileId?: LegacyGoalProfileId;
  readonly legacyGoalScore?: LegacyGoalScoreResult;
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
