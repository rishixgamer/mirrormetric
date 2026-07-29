const DEFAULT_CAMERA_TIMEOUT_MS = 20_000;

const CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  audio: false,
  video: {
    facingMode: "user",
    width: { ideal: 1280 },
    height: { ideal: 1280 },
  },
};

type GetUserMedia = (
  constraints: MediaStreamConstraints,
) => Promise<MediaStream>;

export class CameraRequestTimeoutError extends Error {
  constructor() {
    super("Camera permission timed out.");
    this.name = "CameraRequestTimeoutError";
  }
}

function errorName(error: unknown): string | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    typeof error.name === "string"
  ) {
    return error.name;
  }
  return undefined;
}

export function cameraErrorMessage(error: unknown): string {
  switch (errorName(error)) {
    case "CameraRequestTimeoutError":
      return "The camera did not start in time. Check this site's camera permission, then try again.";
    case "NotAllowedError":
    case "PermissionDeniedError":
    case "SecurityError":
      return "Camera permission is blocked. Allow camera access for this site in your browser settings, then try again.";
    case "NotFoundError":
    case "DevicesNotFoundError":
      return "No camera was found on this device. Connect or enable a camera, then try again.";
    case "NotReadableError":
    case "TrackStartError":
    case "AbortError":
      return "The camera is unavailable or already in use by another app. Close other camera apps, then try again.";
    case "OverconstrainedError":
    case "ConstraintNotSatisfiedError":
      return "This camera cannot provide a compatible video stream. Try another camera or upload a photo.";
    default:
      return "Camera access is unavailable. Check the browser's site permissions, then try again or upload a photo.";
  }
}

export function requestCameraStream(
  getUserMedia: GetUserMedia,
  timeoutMs = DEFAULT_CAMERA_TIMEOUT_MS,
): Promise<MediaStream> {
  let timedOut = false;

  return new Promise((resolve, reject) => {
    const timeout = globalThis.setTimeout(() => {
      timedOut = true;
      reject(new CameraRequestTimeoutError());
    }, timeoutMs);

    void getUserMedia(CAMERA_CONSTRAINTS).then(
      (stream) => {
        if (timedOut) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        globalThis.clearTimeout(timeout);
        resolve(stream);
      },
      (error: unknown) => {
        if (timedOut) return;
        globalThis.clearTimeout(timeout);
        reject(error);
      },
    );
  });
}
