import type { PoseEstimate } from "../domain/contracts";
import { FACE_INDEX, pointAt, type LandmarkSet } from "../domain/landmarks";

const RAD_TO_DEG = 180 / Math.PI;

export function estimatePoseFromMatrix(
  matrix?: ReadonlyArray<number>,
): PoseEstimate | undefined {
  if (!matrix || matrix.length < 11) return undefined;
  const m00 = matrix[0];
  const m10 = matrix[4];
  const m20 = matrix[8];
  const m21 = matrix[9];
  const m22 = matrix[10];
  const horizontal = Math.hypot(m00, m10);
  return {
    pitch: Math.atan2(m21, m22) * RAD_TO_DEG,
    yaw: Math.atan2(-m20, horizontal) * RAD_TO_DEG,
    roll: Math.atan2(m10, m00) * RAD_TO_DEG,
    source: "transformation-matrix",
  };
}

export function estimatePoseFromLandmarks(
  landmarks: LandmarkSet,
): PoseEstimate {
  const leftOuter = pointAt(
    landmarks,
    FACE_INDEX.leftEyeOuter,
    "left eye outer",
  );
  const rightOuter = pointAt(
    landmarks,
    FACE_INDEX.rightEyeOuter,
    "right eye outer",
  );
  const nose = pointAt(landmarks, FACE_INDEX.noseTip, "nose tip");
  const leftCheek = pointAt(landmarks, FACE_INDEX.leftCheek, "left cheek");
  const rightCheek = pointAt(landmarks, FACE_INDEX.rightCheek, "right cheek");
  const meshTop = pointAt(landmarks, FACE_INDEX.meshTop, "mesh top");
  const chin = pointAt(landmarks, FACE_INDEX.chin, "chin");

  const roll =
    Math.atan2(rightOuter.y - leftOuter.y, rightOuter.x - leftOuter.x) *
    RAD_TO_DEG;
  const leftWidth = Math.abs(nose.x - leftCheek.x);
  const rightWidth = Math.abs(rightCheek.x - nose.x);
  const yaw =
    ((leftWidth - rightWidth) /
      Math.max((leftWidth + rightWidth) / 2, Number.EPSILON)) *
    22;
  const verticalCenter = (meshTop.y + chin.y) / 2;
  const pitch =
    ((nose.y - verticalCenter) /
      Math.max(Math.abs(chin.y - meshTop.y), Number.EPSILON)) *
    35;

  return { yaw, pitch, roll, source: "landmark-estimate" };
}

export function estimatePose(
  landmarks: LandmarkSet,
  matrix?: ReadonlyArray<number>,
): PoseEstimate {
  const matrixPose = estimatePoseFromMatrix(matrix);
  if (
    matrixPose &&
    [matrixPose.yaw, matrixPose.pitch, matrixPose.roll].every(Number.isFinite)
  ) {
    return matrixPose;
  }
  return estimatePoseFromLandmarks(landmarks);
}
