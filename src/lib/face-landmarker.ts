import {
  DETECTION_SCHEMA_VERSION,
  type DetectionResult,
} from "../domain/contracts";
import { FACE_INDEX, type Landmark } from "../domain/landmarks";

interface WorkerSuccessMessage {
  readonly id: number;
  readonly result: DetectionResult;
}

interface WorkerErrorMessage {
  readonly id: number;
  readonly error: string;
}

type WorkerMessage = WorkerSuccessMessage | WorkerErrorMessage;

interface PendingRequest {
  readonly resolve: (result: DetectionResult) => void;
  readonly reject: (error: Error) => void;
  readonly timeout: ReturnType<typeof globalThis.setTimeout>;
}

const DETECTION_TIMEOUT_MS = 45_000;
let worker: Worker | undefined;
let nextRequestId = 1;
const pending = new Map<number, PendingRequest>();

function developmentFixture(kind: string, fileName = ""): DetectionResult {
  if (kind === "error") {
    throw new Error(
      "The on-device model could not load. Check the connection, then try again.",
    );
  }
  const landmarks: Landmark[] = Array.from({ length: 478 }, () => ({
    x: 0.5,
    y: 0.5,
    z: 0,
  }));
  const set = (index: number, x: number, y: number) => {
    landmarks[index] = { x, y, z: 0 };
  };
  set(FACE_INDEX.meshTop, 0.5, 0.1);
  set(FACE_INDEX.chin, 0.5, 0.9);
  set(FACE_INDEX.leftTemple, 0.15, 0.28);
  set(FACE_INDEX.rightTemple, 0.85, 0.28);
  set(FACE_INDEX.leftCheek, 0.1, 0.5);
  set(FACE_INDEX.rightCheek, 0.9, 0.5);
  set(FACE_INDEX.leftJaw, 0.2, 0.75);
  const jawVariation =
    kind === "variable" && /(?:^|[-_])2(?:[-_.]|$)/.test(fileName)
      ? 0.12
      : 0;
  set(FACE_INDEX.rightJaw, 0.8 - jawVariation, 0.75);
  set(FACE_INDEX.leftEyeOuter, 0.2, 0.4);
  set(FACE_INDEX.leftEyeInner, 0.35, 0.4);
  set(FACE_INDEX.rightEyeInner, 0.65, 0.4);
  set(FACE_INDEX.rightEyeOuter, 0.8, 0.4);
  set(FACE_INDEX.leftEyeUpper, 0.275, 0.38);
  set(FACE_INDEX.rightEyeUpper, 0.725, 0.38);
  set(FACE_INDEX.leftBrow, 0.275, 0.32);
  set(FACE_INDEX.rightBrow, 0.725, 0.32);
  set(FACE_INDEX.noseBridge, 0.5, 0.4);
  set(FACE_INDEX.noseTip, 0.5, 0.5);
  set(FACE_INDEX.noseBase, 0.5, 0.6);
  set(FACE_INDEX.leftNose, 0.4, 0.58);
  set(FACE_INDEX.rightNose, 0.6, 0.58);
  set(FACE_INDEX.leftMouth, 0.35, 0.7);
  set(FACE_INDEX.rightMouth, 0.65, 0.7);
  set(FACE_INDEX.upperLip, 0.5, 0.69);
  set(FACE_INDEX.lowerLip, 0.5, 0.71);
  return {
    schemaVersion: DETECTION_SCHEMA_VERSION,
    faceCount: kind === "multiple" ? 2 : 1,
    landmarks,
    pose: {
      yaw: 0,
      pitch: 0,
      roll: 0,
      source: "transformation-matrix",
    },
    blendshapes: {
      jawOpen: 0.02,
      eyeBlinkLeft: 0.02,
      eyeBlinkRight: 0.02,
    },
    modelVersion: "synthetic-browser-fixture",
  };
}

function stopWorker(error: Error): void {
  for (const request of pending.values()) {
    globalThis.clearTimeout(request.timeout);
    request.reject(error);
  }
  pending.clear();
  worker?.terminate();
  worker = undefined;
}

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL("../workers/face-worker.ts", import.meta.url), {
    type: "module",
    name: "mirrormetric-face-analysis",
  });
  worker.addEventListener("message", (event: MessageEvent<WorkerMessage>) => {
    const request = pending.get(event.data.id);
    if (!request) return;
    pending.delete(event.data.id);
    globalThis.clearTimeout(request.timeout);
    if ("error" in event.data) {
      request.reject(new Error(event.data.error));
    } else {
      request.resolve(event.data.result);
    }
  });
  worker.addEventListener("error", () => {
    stopWorker(
      new Error(
        "The on-device analysis worker stopped unexpectedly. Try the scan again.",
      ),
    );
  });
  return worker;
}

export async function detectFace(file: Blob): Promise<DetectionResult> {
  const fixture =
    ["localhost", "127.0.0.1"].includes(window.location.hostname)
      ? window.sessionStorage.getItem("mirrormetric:e2e-detection")
      : null;
  if (fixture) {
    return developmentFixture(
      fixture,
      file instanceof File ? file.name : "",
    );
  }

  if (!("Worker" in window) || !("createImageBitmap" in window)) {
    throw new Error(
      "This browser does not support the private on-device analysis engine. Try a current Chrome, Edge, Firefox, or Safari release.",
    );
  }

  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  const id = nextRequestId++;
  return new Promise<DetectionResult>((resolve, reject) => {
    const timeout = globalThis.setTimeout(() => {
      if (!pending.has(id)) return;
      stopWorker(
        new Error(
          "The private face model took too long to respond. Check the connection, then try the scan again.",
        ),
      );
    }, DETECTION_TIMEOUT_MS);
    pending.set(id, { resolve, reject, timeout });
    try {
      getWorker().postMessage({ id, bitmap }, [bitmap]);
    } catch (caught: unknown) {
      pending.delete(id);
      globalThis.clearTimeout(timeout);
      bitmap.close();
      reject(
        caught instanceof Error
          ? caught
          : new Error("The private face model could not start."),
      );
    }
  });
}

export function disposeFaceWorker(): void {
  stopWorker(new Error("The on-device analysis was cancelled."));
}
