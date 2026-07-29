import {
  MEASUREMENT_CATALOG_VERSION,
  type MeasurementDefinition,
  type MeasurementResult,
  type MeasurementUnit,
  type Sensitivity,
  type UncertaintyInterval,
} from "../domain/contracts";
import {
  FACE_INDEX,
  pointAt,
  type Landmark,
  type LandmarkSet,
} from "../domain/landmarks";
import {
  canthalTiltDegrees,
  clamp,
  distance2d,
  midpoint,
  safeRatio,
  symmetryPercent,
} from "./geometry";

interface ComputableMeasurementDefinition extends MeasurementDefinition {
  readonly compute: (geometry: FaceGeometry) => number;
}

interface FaceGeometry {
  readonly p: (name: keyof typeof FACE_INDEX) => Landmark;
  readonly faceWidth: number;
  readonly faceHeight: number;
  readonly templeWidth: number;
  readonly jawWidth: number;
  readonly leftEyeWidth: number;
  readonly rightEyeWidth: number;
  readonly meanEyeWidth: number;
  readonly eyeGap: number;
  readonly eyeLine: Landmark;
  readonly mouthWidth: number;
  readonly noseWidth: number;
  readonly noseLength: number;
  readonly lipAperture: number;
}

const SOURCE =
  "MirrorMetric geometric definition over MediaPipe Face Landmarker topology";

function uncertaintyFor(
  value: number,
  unit: MeasurementUnit,
  sensitivity: Sensitivity,
  confidence: number,
  sensitivityDelta: number,
): UncertaintyInterval {
  const sensitivityScale = { low: 0.75, medium: 1, high: 1.5 }[sensitivity];
  const confidenceScale = 1 + (100 - clamp(confidence, 0, 100)) / 100;
  const heuristicMargin =
    unit === "percent"
      ? 2.5 * sensitivityScale * confidenceScale
      : unit === "degrees"
        ? 1.5 * sensitivityScale * confidenceScale
        : Math.max(0.015, Math.abs(value) * 0.035) *
          sensitivityScale *
          confidenceScale;
  const margin = Math.max(heuristicMargin, sensitivityDelta * 2);
  return { lower: value - margin, upper: value + margin };
}

function geometry(landmarks: LandmarkSet): FaceGeometry {
  const p = (name: keyof typeof FACE_INDEX) =>
    pointAt(landmarks, FACE_INDEX[name], name);
  const leftEyeWidth = distance2d(p("leftEyeOuter"), p("leftEyeInner"));
  const rightEyeWidth = distance2d(p("rightEyeInner"), p("rightEyeOuter"));

  return {
    p,
    faceWidth: distance2d(p("leftCheek"), p("rightCheek")),
    faceHeight: distance2d(p("meshTop"), p("chin")),
    templeWidth: distance2d(p("leftTemple"), p("rightTemple")),
    jawWidth: distance2d(p("leftJaw"), p("rightJaw")),
    leftEyeWidth,
    rightEyeWidth,
    meanEyeWidth: (leftEyeWidth + rightEyeWidth) / 2,
    eyeGap: distance2d(p("leftEyeInner"), p("rightEyeInner")),
    eyeLine: midpoint(p("leftEyeInner"), p("rightEyeInner")),
    mouthWidth: distance2d(p("leftMouth"), p("rightMouth")),
    noseWidth: distance2d(p("leftNose"), p("rightNose")),
    noseLength: distance2d(p("noseBridge"), p("noseBase")),
    lipAperture: distance2d(p("upperLip"), p("lowerLip")),
  };
}

function define(
  input: Omit<
    ComputableMeasurementDefinition,
    "source" | "version"
  >,
): ComputableMeasurementDefinition {
  return {
    ...input,
    source: SOURCE,
    version: MEASUREMENT_CATALOG_VERSION,
  };
}

export const MEASUREMENT_DEFINITIONS: ReadonlyArray<ComputableMeasurementDefinition> =
  [
    define({
      id: "face-aspect",
      label: "Face width / mesh height",
      category: "Overall proportions",
      unit: "ratio",
      description:
        "Cheek-to-cheek width divided by detected mesh-top-to-chin height.",
      formula: "cheek width ÷ mesh height",
      limitations:
        "The mesh top is not a hairline. Pitch, hairstyle, and partial cropping can change the result.",
      sensitivity: "medium",
      anchorIndices: [
        FACE_INDEX.leftCheek,
        FACE_INDEX.rightCheek,
        FACE_INDEX.meshTop,
        FACE_INDEX.chin,
      ],
      compute: (g) => safeRatio(g.faceWidth, g.faceHeight),
    }),
    define({
      id: "temple-face",
      label: "Temple / cheek width",
      category: "Overall proportions",
      unit: "ratio",
      description:
        "Detected upper-face width compared with the widest cheek anchors.",
      formula: "temple width ÷ cheek width",
      limitations:
        "Hair, occlusion, and yaw can shift contour points more than central landmarks.",
      sensitivity: "high",
      anchorIndices: [
        FACE_INDEX.leftTemple,
        FACE_INDEX.rightTemple,
        FACE_INDEX.leftCheek,
        FACE_INDEX.rightCheek,
      ],
      compute: (g) => safeRatio(g.templeWidth, g.faceWidth),
    }),
    define({
      id: "jaw-cheek",
      label: "Jaw / cheek width",
      category: "Jaw and cheek",
      unit: "ratio",
      description:
        "Detected lower-jaw width divided by cheek-to-cheek face width.",
      formula: "jaw width ÷ cheek width",
      limitations:
        "Sensitive to yaw, beard edges, and the detector's inferred contour.",
      sensitivity: "high",
      anchorIndices: [
        FACE_INDEX.leftJaw,
        FACE_INDEX.rightJaw,
        FACE_INDEX.leftCheek,
        FACE_INDEX.rightCheek,
      ],
      compute: (g) => safeRatio(g.jawWidth, g.faceWidth),
    }),
    define({
      id: "midface-height",
      label: "Midface / mesh height",
      category: "Overall proportions",
      unit: "ratio",
      description:
        "Vertical eye-line-to-nose-base distance as a share of mesh height.",
      formula: "eye-line to nose base ÷ mesh height",
      limitations:
        "Pitch and expression affect vertical distances; this is not an anatomical facial-third measure.",
      sensitivity: "medium",
      anchorIndices: [
        FACE_INDEX.leftEyeInner,
        FACE_INDEX.rightEyeInner,
        FACE_INDEX.noseBase,
        FACE_INDEX.meshTop,
        FACE_INDEX.chin,
      ],
      compute: (g) =>
        safeRatio(distance2d(g.eyeLine, g.p("noseBase")), g.faceHeight),
    }),
    define({
      id: "lower-face-height",
      label: "Lower face / mesh height",
      category: "Overall proportions",
      unit: "ratio",
      description:
        "Nose-base-to-chin distance as a share of detected mesh height.",
      formula: "nose base to chin ÷ mesh height",
      limitations:
        "Mouth movement, pitch, and chin occlusion can alter the result.",
      sensitivity: "medium",
      anchorIndices: [
        FACE_INDEX.noseBase,
        FACE_INDEX.chin,
        FACE_INDEX.meshTop,
      ],
      compute: (g) =>
        safeRatio(distance2d(g.p("noseBase"), g.p("chin")), g.faceHeight),
    }),
    define({
      id: "eye-spacing",
      label: "Eye spacing / mean eye width",
      category: "Eyes and brows",
      unit: "ratio",
      description:
        "Inner eye-corner gap divided by the mean detected eye width.",
      formula: "inner-corner gap ÷ mean eye width",
      limitations:
        "Blinking, glasses, and yaw can move eye-corner landmarks.",
      sensitivity: "medium",
      anchorIndices: [
        FACE_INDEX.leftEyeOuter,
        FACE_INDEX.leftEyeInner,
        FACE_INDEX.rightEyeInner,
        FACE_INDEX.rightEyeOuter,
      ],
      compute: (g) => safeRatio(g.eyeGap, g.meanEyeWidth),
    }),
    define({
      id: "left-eye-face",
      label: "Left eye / face width",
      category: "Eyes and brows",
      unit: "ratio",
      description: "Rendered left-eye width as a share of cheek width.",
      formula: "left eye width ÷ cheek width",
      limitations:
        "Rendered left/right labels describe the image, not anatomical laterality.",
      sensitivity: "medium",
      anchorIndices: [
        FACE_INDEX.leftEyeOuter,
        FACE_INDEX.leftEyeInner,
        FACE_INDEX.leftCheek,
        FACE_INDEX.rightCheek,
      ],
      compute: (g) => safeRatio(g.leftEyeWidth, g.faceWidth),
    }),
    define({
      id: "right-eye-face",
      label: "Right eye / face width",
      category: "Eyes and brows",
      unit: "ratio",
      description: "Rendered right-eye width as a share of cheek width.",
      formula: "right eye width ÷ cheek width",
      limitations:
        "Rendered left/right labels describe the image, not anatomical laterality.",
      sensitivity: "medium",
      anchorIndices: [
        FACE_INDEX.rightEyeInner,
        FACE_INDEX.rightEyeOuter,
        FACE_INDEX.leftCheek,
        FACE_INDEX.rightCheek,
      ],
      compute: (g) => safeRatio(g.rightEyeWidth, g.faceWidth),
    }),
    define({
      id: "eye-symmetry",
      label: "Eye-width symmetry",
      category: "Eyes and brows",
      unit: "percent",
      description: "Similarity of the rendered left and right eye widths.",
      formula: "100 − relative left/right difference",
      limitations:
        "This is detector symmetry, not a judgment. Small head rotation can reduce it.",
      sensitivity: "high",
      anchorIndices: [
        FACE_INDEX.leftEyeOuter,
        FACE_INDEX.leftEyeInner,
        FACE_INDEX.rightEyeInner,
        FACE_INDEX.rightEyeOuter,
      ],
      compute: (g) => symmetryPercent(g.leftEyeWidth, g.rightEyeWidth),
    }),
    define({
      id: "mean-canthal-tilt",
      label: "Mean eye-corner tilt",
      category: "Eyes and brows",
      unit: "degrees",
      description: "Mean outer-to-inner eye-corner angle.",
      formula: "(left tilt + right tilt) ÷ 2",
      limitations:
        "Pose, lens distortion, expression, and corner placement can change this angle.",
      sensitivity: "high",
      anchorIndices: [
        FACE_INDEX.leftEyeOuter,
        FACE_INDEX.leftEyeInner,
        FACE_INDEX.rightEyeInner,
        FACE_INDEX.rightEyeOuter,
      ],
      compute: (g) =>
        (canthalTiltDegrees(g.p("leftEyeOuter"), g.p("leftEyeInner")) +
          canthalTiltDegrees(g.p("rightEyeOuter"), g.p("rightEyeInner"))) /
        2,
    }),
    define({
      id: "canthal-symmetry",
      label: "Eye-tilt symmetry",
      category: "Eyes and brows",
      unit: "percent",
      description: "Similarity of the two detected eye-corner angles.",
      formula: "100 − relative left/right tilt difference",
      limitations:
        "Near-zero angles make relative symmetry volatile; review the overlay.",
      sensitivity: "high",
      anchorIndices: [
        FACE_INDEX.leftEyeOuter,
        FACE_INDEX.leftEyeInner,
        FACE_INDEX.rightEyeInner,
        FACE_INDEX.rightEyeOuter,
      ],
      compute: (g) =>
        symmetryPercent(
          canthalTiltDegrees(g.p("leftEyeOuter"), g.p("leftEyeInner")),
          canthalTiltDegrees(g.p("rightEyeOuter"), g.p("rightEyeInner")),
        ),
    }),
    define({
      id: "brow-eye-symmetry",
      label: "Brow-to-eye symmetry",
      category: "Eyes and brows",
      unit: "percent",
      description:
        "Similarity of vertical brow-to-upper-eye distances on both sides.",
      formula: "100 − relative left/right brow distance difference",
      limitations:
        "Brow grooming, expression, and partial occlusion affect the result.",
      sensitivity: "high",
      anchorIndices: [
        FACE_INDEX.leftBrow,
        FACE_INDEX.leftEyeUpper,
        FACE_INDEX.rightBrow,
        FACE_INDEX.rightEyeUpper,
      ],
      compute: (g) =>
        symmetryPercent(
          distance2d(g.p("leftBrow"), g.p("leftEyeUpper")),
          distance2d(g.p("rightBrow"), g.p("rightEyeUpper")),
        ),
    }),
    define({
      id: "nose-face",
      label: "Nose / face width",
      category: "Nose and midface",
      unit: "ratio",
      description: "Detected outer-nose width as a share of cheek width.",
      formula: "nose width ÷ cheek width",
      limitations: "Yaw and nostril flare can change outer-nose anchors.",
      sensitivity: "medium",
      anchorIndices: [
        FACE_INDEX.leftNose,
        FACE_INDEX.rightNose,
        FACE_INDEX.leftCheek,
        FACE_INDEX.rightCheek,
      ],
      compute: (g) => safeRatio(g.noseWidth, g.faceWidth),
    }),
    define({
      id: "nose-length",
      label: "Nose length / mesh height",
      category: "Nose and midface",
      unit: "ratio",
      description:
        "Detected nose-bridge-to-base length as a share of mesh height.",
      formula: "nose bridge to base ÷ mesh height",
      limitations:
        "This is a projected 2D length and does not represent nasal projection.",
      sensitivity: "medium",
      anchorIndices: [
        FACE_INDEX.noseBridge,
        FACE_INDEX.noseBase,
        FACE_INDEX.meshTop,
        FACE_INDEX.chin,
      ],
      compute: (g) => safeRatio(g.noseLength, g.faceHeight),
    }),
    define({
      id: "mouth-nose",
      label: "Mouth / nose width",
      category: "Mouth and lower face",
      unit: "ratio",
      description:
        "Detected mouth-corner width divided by detected outer-nose width.",
      formula: "mouth width ÷ nose width",
      limitations:
        "Smiling, lip tension, yaw, and nostril movement affect the ratio.",
      sensitivity: "medium",
      anchorIndices: [
        FACE_INDEX.leftMouth,
        FACE_INDEX.rightMouth,
        FACE_INDEX.leftNose,
        FACE_INDEX.rightNose,
      ],
      compute: (g) => safeRatio(g.mouthWidth, g.noseWidth),
    }),
    define({
      id: "mouth-face",
      label: "Mouth / face width",
      category: "Mouth and lower face",
      unit: "ratio",
      description: "Detected mouth width as a share of cheek width.",
      formula: "mouth width ÷ cheek width",
      limitations:
        "Expression and head rotation can change both component widths.",
      sensitivity: "medium",
      anchorIndices: [
        FACE_INDEX.leftMouth,
        FACE_INDEX.rightMouth,
        FACE_INDEX.leftCheek,
        FACE_INDEX.rightCheek,
      ],
      compute: (g) => safeRatio(g.mouthWidth, g.faceWidth),
    }),
    define({
      id: "lip-aperture",
      label: "Lip aperture / mouth width",
      category: "Mouth and lower face",
      unit: "ratio",
      description:
        "Detected vertical lip opening compared with mouth-corner width.",
      formula: "lip aperture ÷ mouth width",
      limitations:
        "Use only with a relaxed, closed mouth; this is primarily an expression check.",
      sensitivity: "high",
      anchorIndices: [
        FACE_INDEX.upperLip,
        FACE_INDEX.lowerLip,
        FACE_INDEX.leftMouth,
        FACE_INDEX.rightMouth,
      ],
      compute: (g) => safeRatio(g.lipAperture, g.mouthWidth),
    }),
    define({
      id: "jaw-side-symmetry",
      label: "Jaw-side symmetry",
      category: "Jaw and cheek",
      unit: "percent",
      description:
        "Similarity of rendered left and right jaw-anchor distances to the chin.",
      formula: "100 − relative left/right jaw-to-chin difference",
      limitations:
        "Highly sensitive to yaw, facial hair, and detector-inferred contour points.",
      sensitivity: "high",
      anchorIndices: [
        FACE_INDEX.leftJaw,
        FACE_INDEX.rightJaw,
        FACE_INDEX.chin,
      ],
      compute: (g) =>
        symmetryPercent(
          distance2d(g.p("leftJaw"), g.p("chin")),
          distance2d(g.p("rightJaw"), g.p("chin")),
        ),
    }),
  ];

function perturbationSensitivity(
  definition: ComputableMeasurementDefinition,
  landmarks: LandmarkSet,
  baseline: number,
): number {
  const epsilon = 0.0015;
  let maximumDelta = 0;
  for (const anchorIndex of definition.anchorIndices) {
    for (const axis of ["x", "y"] as const) {
      for (const direction of [-1, 1]) {
        const perturbed = landmarks.map((point, pointIndex) =>
          pointIndex === anchorIndex
            ? { ...point, [axis]: point[axis] + direction * epsilon }
            : point,
        );
        try {
          const candidate = definition.compute(geometry(perturbed));
          if (Number.isFinite(candidate)) {
            maximumDelta = Math.max(
              maximumDelta,
              Math.abs(candidate - baseline),
            );
          }
        } catch {
          maximumDelta = Number.POSITIVE_INFINITY;
        }
      }
    }
  }
  return maximumDelta;
}

export function computeMeasurements(
  landmarks: LandmarkSet,
  confidence = 70,
): MeasurementResult[] {
  if (landmarks.length < 478) {
    throw new Error(
      `The front-view engine requires 478 landmarks; received ${landmarks.length}.`,
    );
  }

  const faceGeometry = geometry(landmarks);
  return MEASUREMENT_DEFINITIONS.map((definition) => {
    const value = definition.compute(faceGeometry);
    const sensitivityDelta = perturbationSensitivity(
      definition,
      landmarks,
      value,
    );
    const { compute: _compute, ...publicDefinition } = definition;
    return {
      ...publicDefinition,
      value,
      confidence: clamp(confidence, 0, 100),
      uncertainty: uncertaintyFor(
        value,
        definition.unit,
        definition.sensitivity,
        confidence,
        sensitivityDelta,
      ),
      sensitivityDelta,
      stability: "single-capture",
      sampleCount: 1,
      status: "experimental",
    };
  });
}

export function formatMeasurement(result: {
  readonly value: number;
  readonly unit: MeasurementUnit;
}): string {
  switch (result.unit) {
    case "percent":
      return `${result.value.toFixed(1)}%`;
    case "degrees":
      return `${result.value.toFixed(1)}°`;
    default:
      return result.value.toFixed(3);
  }
}

export function formatUncertainty(result: MeasurementResult): string {
  const margin = Math.max(
    result.value - result.uncertainty.lower,
    result.uncertainty.upper - result.value,
  );
  if (result.unit === "percent") return `±${margin.toFixed(1)} points`;
  if (result.unit === "degrees") return `±${margin.toFixed(1)}°`;
  return `±${margin.toFixed(3)}`;
}
