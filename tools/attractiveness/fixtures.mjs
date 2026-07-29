import { SCUT_TO_MEDIAPIPE_ANCHORS } from "./features.mjs";

export const FIXTURE_ANCHORS = Object.freeze({
  chin: { x: 50, y: 92 },
  leftCheek: { x: 15, y: 52 },
  rightCheek: { x: 85, y: 52 },
  leftJaw: { x: 24, y: 75 },
  rightJaw: { x: 76, y: 75 },
  leftEyeOuter: { x: 25, y: 38 },
  leftEyeInner: { x: 40, y: 39 },
  rightEyeInner: { x: 60, y: 39 },
  rightEyeOuter: { x: 75, y: 38 },
  leftEyeUpper: { x: 33, y: 36 },
  rightEyeUpper: { x: 67, y: 36 },
  leftBrow: { x: 33, y: 29 },
  rightBrow: { x: 67, y: 29 },
  leftNose: { x: 43, y: 56 },
  rightNose: { x: 57, y: 56 },
  leftMouth: { x: 37, y: 69 },
  rightMouth: { x: 63, y: 69 },
  upperLip: { x: 50, y: 67 },
  lowerLip: { x: 50, y: 71 },
});

export function syntheticScutLandmarks(offset = 0) {
  const points = Array.from({ length: 86 }, (_, index) => ({
    x: 10 + ((index * 17) % 80) + offset,
    y: 10 + ((index * 29) % 80) + offset,
  }));
  for (const [name, mapping] of Object.entries(SCUT_TO_MEDIAPIPE_ANCHORS)) {
    points[mapping.scutIndex - 1] = {
      x: FIXTURE_ANCHORS[name].x + offset,
      y: FIXTURE_ANCHORS[name].y + offset,
    };
  }
  return points;
}
