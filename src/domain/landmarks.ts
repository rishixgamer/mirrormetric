export interface Landmark {
  readonly x: number;
  readonly y: number;
  readonly z?: number;
  readonly visibility?: number;
}

export type LandmarkSet = ReadonlyArray<Landmark>;

/**
 * Stable MediaPipe Face Mesh indices used by the initial measurement set.
 * Names describe the rendered image, not anatomical laterality.
 */
export const FACE_INDEX = {
  meshTop: 10,
  chin: 152,
  leftTemple: 127,
  rightTemple: 356,
  leftCheek: 234,
  rightCheek: 454,
  leftJaw: 172,
  rightJaw: 397,
  leftEyeOuter: 33,
  leftEyeInner: 133,
  rightEyeInner: 362,
  rightEyeOuter: 263,
  leftEyeUpper: 159,
  rightEyeUpper: 386,
  leftIris: 468,
  rightIris: 473,
  leftBrow: 105,
  rightBrow: 334,
  noseBridge: 168,
  noseTip: 1,
  noseBase: 2,
  leftNose: 98,
  rightNose: 327,
  leftMouth: 61,
  rightMouth: 291,
  upperLip: 13,
  lowerLip: 14,
} as const;

export type FaceLandmarkName = keyof typeof FACE_INDEX;

export function pointAt(
  landmarks: LandmarkSet,
  index: number,
  label = `landmark ${index}`,
): Landmark {
  const point = landmarks[index];
  if (!point) {
    throw new Error(`Missing ${label}. Expected at least ${index + 1} landmarks.`);
  }
  return point;
}
