import { describe, expect, it } from "vitest";
import {
  DETECTION_SCHEMA_VERSION,
  type DetectionResult,
} from "../domain/contracts";
import type { Landmark } from "../domain/landmarks";
import { assessCapture } from "./capture-assessment";
import type { ImageQualityResult } from "./image-quality";

const landmarks: Landmark[] = Array.from({ length: 478 }, (_, index) => ({
  x: index % 2 ? 0.2 : 0.8,
  y: index % 3 ? 0.2 : 0.8,
  z: 0,
}));
const quality: ImageQualityResult = {
  score: 100,
  width: 1200,
  height: 1200,
  brightness: 125,
  contrast: 40,
  edgeStrength: 12,
  checks: [],
};
const detection: DetectionResult = {
  schemaVersion: DETECTION_SCHEMA_VERSION,
  faceCount: 1,
  landmarks,
  pose: {
    yaw: 0,
    pitch: 0,
    roll: 0,
    source: "transformation-matrix",
  },
  blendshapes: { jawOpen: 0.02, eyeBlinkLeft: 0.03, eyeBlinkRight: 0.03 },
  modelVersion: "test",
};

describe("capture assessment", () => {
  it("accepts a high-quality single neutral front face", () => {
    const result = assessCapture(quality, detection);
    expect(result.accepted).toBe(true);
    expect(result.issues.every((item) => item.severity === "pass")).toBe(true);
  });

  it("fails closed on multiple faces and excessive pose", () => {
    const result = assessCapture(quality, {
      ...detection,
      faceCount: 2,
      pose: { ...detection.pose, yaw: 8 },
    });
    expect(result.accepted).toBe(false);
    expect(result.issues.find((item) => item.id === "face-count")?.severity).toBe(
      "error",
    );
    expect(result.issues.find((item) => item.id === "pose")?.severity).toBe(
      "error",
    );
  });
});
