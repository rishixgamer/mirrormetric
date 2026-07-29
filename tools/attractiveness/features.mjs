/**
 * SCUT indices are one-based, matching the official 86-point diagram.
 * Names describe the rendered image, not anatomical laterality.
 */
export const SCUT_TO_MEDIAPIPE_ANCHORS = Object.freeze({
  chin: { scutIndex: 12, mediaPipeIndex: 152 },
  leftCheek: { scutIndex: 8, mediaPipeIndex: 234 },
  rightCheek: { scutIndex: 16, mediaPipeIndex: 454 },
  leftJaw: { scutIndex: 10, mediaPipeIndex: 172 },
  rightJaw: { scutIndex: 14, mediaPipeIndex: 397 },
  leftEyeOuter: { scutIndex: 47, mediaPipeIndex: 33 },
  leftEyeInner: { scutIndex: 44, mediaPipeIndex: 133 },
  rightEyeInner: { scutIndex: 55, mediaPipeIndex: 362 },
  rightEyeOuter: { scutIndex: 51, mediaPipeIndex: 263 },
  leftEyeUpper: { scutIndex: 45, mediaPipeIndex: 159 },
  rightEyeUpper: { scutIndex: 53, mediaPipeIndex: 386 },
  leftBrow: { scutIndex: 30, mediaPipeIndex: 105 },
  rightBrow: { scutIndex: 39, mediaPipeIndex: 334 },
  leftNose: { scutIndex: 65, mediaPipeIndex: 98 },
  rightNose: { scutIndex: 69, mediaPipeIndex: 327 },
  leftMouth: { scutIndex: 80, mediaPipeIndex: 61 },
  rightMouth: { scutIndex: 74, mediaPipeIndex: 291 },
  upperLip: { scutIndex: 77, mediaPipeIndex: 13 },
  lowerLip: { scutIndex: 83, mediaPipeIndex: 14 },
});

export const REQUIRED_METRIC_IDS = Object.freeze([
  "jaw-cheek",
  "eye-spacing",
  "left-eye-face",
  "right-eye-face",
  "eye-symmetry",
  "mean-canthal-tilt",
  "canthal-symmetry",
  "brow-eye-symmetry",
  "nose-face",
  "mouth-nose",
  "mouth-face",
  "lip-aperture",
  "jaw-side-symmetry",
]);

function finitePoint(point, label) {
  if (
    !point ||
    !Number.isFinite(point.x) ||
    !Number.isFinite(point.y)
  ) {
    throw new Error(`Missing or non-finite SCUT point: ${label}.`);
  }
  return point;
}

function distance(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function ratio(numerator, denominator, label) {
  if (!Number.isFinite(numerator) || denominator <= Number.EPSILON) {
    throw new Error(`Cannot compute ${label}.`);
  }
  return numerator / denominator;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function symmetry(left, right) {
  const mean = (Math.abs(left) + Math.abs(right)) / 2;
  return mean <= Number.EPSILON
    ? 100
    : clamp(100 - (Math.abs(left - right) / mean) * 100, 0, 100);
}

function canthalTilt(outer, inner) {
  const horizontal = Math.abs(inner.x - outer.x);
  return horizontal <= Number.EPSILON
    ? 0
    : (Math.atan2(inner.y - outer.y, horizontal) * 180) / Math.PI;
}

export function parsePts(text) {
  const lines = text.split(/\r?\n/);
  const points = [];
  let inside = !lines.some((line) => line.trim() === "{");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "{") {
      inside = true;
      continue;
    }
    if (trimmed === "}") break;
    if (!inside || !trimmed || /^[a-z_]+\s*:/i.test(trimmed)) continue;
    const [x, y, ...rest] = trimmed.split(/\s+/).map(Number);
    if (rest.length > 0 || !Number.isFinite(x) || !Number.isFinite(y)) {
      throw new Error(`Invalid point line: ${trimmed}`);
    }
    points.push({ x, y });
  }
  if (points.length !== 86) {
    throw new Error(`Expected 86 SCUT landmarks, received ${points.length}.`);
  }
  return points;
}

export function mapScutAnchors(points) {
  if (!Array.isArray(points) || points.length !== 86) {
    throw new Error("SCUT landmark input must contain exactly 86 points.");
  }
  return Object.fromEntries(
    Object.entries(SCUT_TO_MEDIAPIPE_ANCHORS).map(([name, mapping]) => [
      name,
      finitePoint(points[mapping.scutIndex - 1], name),
    ]),
  );
}

/**
 * Removes translation, scale, and in-plane eye-line roll before features are
 * extracted. The transformation is fit only from mapped SCUT points.
 */
export function normalizeScutLandmarks(points) {
  const anchors = mapScutAnchors(points);
  const leftEyeCenter = {
    x: (anchors.leftEyeOuter.x + anchors.leftEyeInner.x) / 2,
    y: (anchors.leftEyeOuter.y + anchors.leftEyeInner.y) / 2,
  };
  const rightEyeCenter = {
    x: (anchors.rightEyeInner.x + anchors.rightEyeOuter.x) / 2,
    y: (anchors.rightEyeInner.y + anchors.rightEyeOuter.y) / 2,
  };
  const center = {
    x: (anchors.leftCheek.x + anchors.rightCheek.x) / 2,
    y: (anchors.leftCheek.y + anchors.rightCheek.y) / 2,
  };
  const scale = distance(anchors.leftCheek, anchors.rightCheek);
  if (scale <= Number.EPSILON) {
    throw new Error("SCUT cheek anchors cannot define a normalization scale.");
  }
  const angle = Math.atan2(
    rightEyeCenter.y - leftEyeCenter.y,
    rightEyeCenter.x - leftEyeCenter.x,
  );
  const cosine = Math.cos(-angle);
  const sine = Math.sin(-angle);
  return points.map((point, index) => {
    const checked = finitePoint(point, `point ${index + 1}`);
    const x = (checked.x - center.x) / scale;
    const y = (checked.y - center.y) / scale;
    return {
      x: x * cosine - y * sine,
      y: x * sine + y * cosine,
    };
  });
}

export function extractCrossTopologyFeatures(points) {
  const a = mapScutAnchors(normalizeScutLandmarks(points));
  const faceWidth = distance(a.leftCheek, a.rightCheek);
  const jawWidth = distance(a.leftJaw, a.rightJaw);
  const leftEyeWidth = distance(a.leftEyeOuter, a.leftEyeInner);
  const rightEyeWidth = distance(a.rightEyeInner, a.rightEyeOuter);
  const meanEyeWidth = (leftEyeWidth + rightEyeWidth) / 2;
  const eyeGap = distance(a.leftEyeInner, a.rightEyeInner);
  const noseWidth = distance(a.leftNose, a.rightNose);
  const mouthWidth = distance(a.leftMouth, a.rightMouth);
  const lipAperture = distance(a.upperLip, a.lowerLip);
  const leftTilt = canthalTilt(a.leftEyeOuter, a.leftEyeInner);
  const rightTilt = canthalTilt(a.rightEyeOuter, a.rightEyeInner);

  const result = {
    "jaw-cheek": ratio(jawWidth, faceWidth, "jaw-cheek"),
    "eye-spacing": ratio(eyeGap, meanEyeWidth, "eye-spacing"),
    "left-eye-face": ratio(leftEyeWidth, faceWidth, "left-eye-face"),
    "right-eye-face": ratio(rightEyeWidth, faceWidth, "right-eye-face"),
    "eye-symmetry": symmetry(leftEyeWidth, rightEyeWidth),
    "mean-canthal-tilt": (leftTilt + rightTilt) / 2,
    "canthal-symmetry": symmetry(leftTilt, rightTilt),
    "brow-eye-symmetry": symmetry(
      distance(a.leftBrow, a.leftEyeUpper),
      distance(a.rightBrow, a.rightEyeUpper),
    ),
    "nose-face": ratio(noseWidth, faceWidth, "nose-face"),
    "mouth-nose": ratio(mouthWidth, noseWidth, "mouth-nose"),
    "mouth-face": ratio(mouthWidth, faceWidth, "mouth-face"),
    "lip-aperture": ratio(lipAperture, mouthWidth, "lip-aperture"),
    "jaw-side-symmetry": symmetry(
      distance(a.leftJaw, a.chin),
      distance(a.rightJaw, a.chin),
    ),
  };
  for (const id of REQUIRED_METRIC_IDS) {
    if (!Number.isFinite(result[id])) {
      throw new Error(`Non-finite cross-topology feature: ${id}.`);
    }
  }
  return result;
}
