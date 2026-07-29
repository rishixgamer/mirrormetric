import type { CaptureAssessment, DetectionResult } from "../domain/contracts";
import { assessCapture } from "./capture-assessment";
import { detectFace } from "./face-landmarker";
import {
  assessImageQuality,
  type ImageQualityResult,
} from "./image-quality";

export type CaptureEvaluationPhase = "quality" | "landmarks";

export interface CaptureEvaluation {
  readonly quality: ImageQualityResult;
  readonly detection: DetectionResult;
  readonly assessment: CaptureAssessment;
}

export async function evaluateCapture(
  file: File,
  onPhase?: (phase: CaptureEvaluationPhase) => void,
): Promise<CaptureEvaluation> {
  onPhase?.("quality");
  const quality = await assessImageQuality(file);
  onPhase?.("landmarks");
  const detection = await detectFace(file);
  return {
    quality,
    detection,
    assessment: assessCapture(quality, detection),
  };
}
