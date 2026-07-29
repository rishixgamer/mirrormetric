import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import {
  DETECTION_SCHEMA_VERSION,
  type DetectionResult,
} from "../domain/contracts";
import type { LandmarkSet } from "../domain/landmarks";
import { estimatePose } from "../lib/pose";

const MODEL_VERSION = "face-landmarker-float16-v1";
let singleton: Promise<FaceLandmarker> | undefined;

async function createLandmarker(): Promise<FaceLandmarker> {
  const origin = globalThis.location.origin;
  // Module workers must use the ESM loader; the classic loader keeps
  // ModuleFactory module-scoped when dynamically imported.
  const vision = await FilesetResolver.forVisionTasks(`${origin}/wasm`, true);
  return FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `${origin}/models/face_landmarker.task`,
    },
    runningMode: "IMAGE",
    numFaces: 2,
    minFaceDetectionConfidence: 0.68,
    minFacePresenceConfidence: 0.68,
    minTrackingConfidence: 0.68,
    outputFaceBlendshapes: true,
    outputFacialTransformationMatrixes: true,
  });
}

async function loadLandmarker(): Promise<FaceLandmarker> {
  singleton ??= createLandmarker();
  return singleton;
}

async function analyze(bitmap: ImageBitmap): Promise<DetectionResult> {
  try {
    const landmarker = await loadLandmarker();
    const result = landmarker.detect(bitmap);
    const face = result.faceLandmarks[0];
    if (!face) {
      throw new Error(
        "No face was detected. Use a sharp, evenly lit, straight-on photo with one adult face.",
      );
    }
    const landmarks: LandmarkSet = face.map((point) => ({
      x: point.x,
      y: point.y,
      z: point.z,
      visibility: point.visibility,
    }));
    const matrix = result.facialTransformationMatrixes[0]?.data;
    const blendshapes = Object.fromEntries(
      (result.faceBlendshapes[0]?.categories ?? []).map((category) => [
        category.categoryName,
        category.score,
      ]),
    );
    return {
      schemaVersion: DETECTION_SCHEMA_VERSION,
      faceCount: result.faceLandmarks.length,
      landmarks,
      pose: estimatePose(landmarks, matrix),
      blendshapes,
      transformationMatrix: matrix,
      modelVersion: MODEL_VERSION,
    };
  } finally {
    bitmap.close();
  }
}

const workerScope = globalThis as unknown as {
  addEventListener(
    type: "message",
    listener: (event: MessageEvent<{ id: number; bitmap: ImageBitmap }>) => void,
  ): void;
  postMessage(message: unknown): void;
};

workerScope.addEventListener("message", (event) => {
  void analyze(event.data.bitmap)
    .then((result) => {
      workerScope.postMessage({ id: event.data.id, result });
    })
    .catch((error: unknown) => {
      workerScope.postMessage({
        id: event.data.id,
        error:
          error instanceof Error
            ? error.message
            : "The on-device face analysis could not be completed.",
      });
    });
});
