import {
  CAPTURE_SCHEMA_VERSION,
  type CaptureAssessment,
  type CaptureIssue,
  type CaptureIssueSeverity,
  type DetectionResult,
} from "../domain/contracts";
import type { ImageQualityResult } from "./image-quality";
import { clamp } from "./geometry";

function issue(
  id: string,
  label: string,
  detail: string,
  severity: CaptureIssueSeverity,
): CaptureIssue {
  return { id, label, detail, severity };
}

function faceBounds(detection: DetectionResult) {
  const xs = detection.landmarks.map((point) => point.x);
  const ys = detection.landmarks.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
}

function blendshape(
  detection: DetectionResult,
  name: string,
): number {
  return detection.blendshapes[name] ?? 0;
}

export function assessCapture(
  quality: ImageQualityResult,
  detection: DetectionResult,
): CaptureAssessment {
  const bounds = faceBounds(detection);
  const issues: CaptureIssue[] = [];
  const shortestSide = Math.min(quality.width, quality.height);
  issues.push(
    shortestSide >= 720
      ? issue(
          "resolution",
          "Resolution",
          `${quality.width} × ${quality.height} provides enough detail.`,
          "pass",
        )
      : issue(
          "resolution",
          "Resolution",
          "Use at least 720 px on the shortest side.",
          "error",
        ),
  );
  issues.push(
    quality.brightness >= 55 && quality.brightness <= 210
      ? issue("exposure", "Exposure", "Brightness is in range.", "pass")
      : issue(
          "exposure",
          "Exposure",
          quality.brightness < 55
            ? "The image is too dark."
            : "The image is overexposed.",
          "error",
        ),
  );
  issues.push(
    quality.contrast >= 28
      ? issue("contrast", "Contrast", "Facial edges are distinguishable.", "pass")
      : issue(
          "contrast",
          "Contrast",
          "Use more even, directional light.",
          "warning",
        ),
  );
  issues.push(
    quality.edgeStrength >= 7
      ? issue("sharpness", "Sharpness", "Usable edge detail detected.", "pass")
      : issue(
          "sharpness",
          "Sharpness",
          "The photo appears blurred or heavily smoothed.",
          "error",
        ),
  );
  issues.push(
    detection.faceCount === 1
      ? issue("face-count", "One face", "Exactly one face detected.", "pass")
      : issue(
          "face-count",
          "One face",
          `${detection.faceCount} faces detected. Use a photo containing only one adult.`,
          "error",
        ),
  );

  const coverage = bounds.height;
  issues.push(
    coverage >= 0.4 && coverage <= 0.88
      ? issue("coverage", "Face size", "Face size is in the working range.", "pass")
      : issue(
          "coverage",
          "Face size",
          coverage < 0.4
            ? "Move closer so the face fills more of the frame."
            : "Move back so the full facial outline is visible.",
          "error",
        ),
  );
  const centered =
    Math.abs(bounds.centerX - 0.5) <= 0.12 &&
    Math.abs(bounds.centerY - 0.5) <= 0.16;
  issues.push(
    centered
      ? issue("centering", "Centered", "Face is centered.", "pass")
      : issue(
          "centering",
          "Centered",
          "Center the face and keep the full chin and forehead mesh visible.",
          "error",
        ),
  );

  const { yaw, pitch, roll } = detection.pose;
  const poseAccepted =
    Math.abs(yaw) <= 7 && Math.abs(pitch) <= 7 && Math.abs(roll) <= 5;
  issues.push(
    poseAccepted
      ? issue(
          "pose",
          "Head pose",
          `Yaw ${yaw.toFixed(1)}°, pitch ${pitch.toFixed(1)}°, roll ${roll.toFixed(1)}°.`,
          "pass",
        )
      : issue(
          "pose",
          "Head pose",
          `Face the camera squarely. Current estimate: yaw ${yaw.toFixed(1)}°, pitch ${pitch.toFixed(1)}°, roll ${roll.toFixed(1)}°.`,
          "error",
        ),
  );

  const jawOpen = blendshape(detection, "jawOpen");
  const blink =
    (blendshape(detection, "eyeBlinkLeft") +
      blendshape(detection, "eyeBlinkRight")) /
    2;
  const neutral = jawOpen <= 0.18 && blink <= 0.35;
  issues.push(
    neutral
      ? issue(
          "expression",
          "Neutral expression",
          "Eyes appear open and mouth relaxed.",
          "pass",
        )
      : issue(
          "expression",
          "Neutral expression",
          jawOpen > 0.18
            ? "Relax and close the mouth."
            : "Keep both eyes comfortably open.",
          "error",
        ),
  );

  const errors = issues.filter((candidate) => candidate.severity === "error");
  const warnings = issues.filter(
    (candidate) => candidate.severity === "warning",
  );
  const poseFit =
    1 -
    clamp(
      (Math.abs(yaw) / 7 + Math.abs(pitch) / 7 + Math.abs(roll) / 5) / 3,
      0,
      1,
    );
  const framingFit =
    centered && coverage >= 0.4 && coverage <= 0.88 ? 1 : 0.35;
  const confidence = clamp(
    quality.score * 0.45 +
      poseFit * 30 +
      framingFit * 15 +
      (neutral ? 10 : 2) -
      warnings.length * 4 -
      errors.length * 12,
    0,
    100,
  );

  return {
    schemaVersion: CAPTURE_SCHEMA_VERSION,
    accepted: errors.length === 0,
    confidence,
    qualityScore: quality.score,
    pose: detection.pose,
    faceCoverage: coverage,
    issues,
  };
}

export function captureFailureMessage(
  assessments: ReadonlyArray<CaptureAssessment>,
): string {
  const rejected = assessments.filter((assessment) => !assessment.accepted);
  const blockingLabels = [
    ...new Set(
      rejected.flatMap((assessment) =>
        assessment.issues
          .filter((candidate) => candidate.severity === "error")
          .map((candidate) => candidate.label),
      ),
    ),
  ];
  const subject =
    rejected.length === 1 ? "this photo" : `${rejected.length} photos`;
  const replacement = rejected.length === 1 ? "it" : "them";
  const reasons =
    blockingLabels.length > 0
      ? ` Failed checks: ${blockingLabels.join(", ")}.`
      : "";
  return `Retake ${subject}.${reasons} Follow the detailed checks, then replace ${replacement}.`;
}
