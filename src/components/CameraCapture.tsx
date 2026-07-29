import { useEffect, useRef, useState } from "react";
import type { CaptureAssessment } from "../domain/contracts";
import {
  cameraErrorMessage,
  requestCameraStream,
} from "../lib/camera";
import { evaluateCapture } from "../lib/capture-evaluation";

interface CameraCaptureProps {
  readonly onCapture: (file: File) => void;
  readonly onClose: () => void;
}

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | undefined>(undefined);
  const capturePendingRef = useRef(false);
  const [error, setError] = useState<string>();
  const [ready, setReady] = useState(false);
  const [capturePending, setCapturePending] = useState(false);
  const [cameraAttempt, setCameraAttempt] = useState(0);
  const [liveAssessment, setLiveAssessment] =
    useState<CaptureAssessment>();
  const [feedbackStatus, setFeedbackStatus] = useState(
    "Requesting camera access…",
  );

  useEffect(() => {
    let active = true;
    setError(undefined);
    setReady(false);
    setLiveAssessment(undefined);
    setFeedbackStatus("Requesting camera access…");

    const mediaDevices = navigator.mediaDevices;
    if (!mediaDevices?.getUserMedia) {
      setError(
        "This browser cannot access a camera. Try a current browser or upload a photo instead.",
      );
      return () => {
        active = false;
      };
    }

    void requestCameraStream(mediaDevices.getUserMedia.bind(mediaDevices))
      .then(async (stream) => {
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) {
          stream.getTracks().forEach((track) => track.stop());
          throw new Error("Camera preview is unavailable.");
        }
        video.srcObject = stream;
        setFeedbackStatus("Starting the camera preview…");
        await video.play();
        if (active) setReady(true);
      })
      .catch((caught: unknown) => {
        if (!active) return;
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = undefined;
        setError(cameraErrorMessage(caught));
      });

    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = undefined;
    };
  }, [cameraAttempt]);

  async function frameFile(
    video: HTMLVideoElement,
    quality = 0.92,
  ): Promise<File | undefined> {
    if (!video || !video.videoWidth || !video.videoHeight) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (!blob) return;
    return new File([blob], `mirrormetric-${Date.now()}.jpg`, {
      type: "image/jpeg",
    });
  }

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    let timeout: number | undefined;

    const checkFrame = async () => {
      const video = videoRef.current;
      if (!video || document.hidden || capturePendingRef.current) {
        timeout = window.setTimeout(checkFrame, 1200);
        return;
      }
      try {
        setFeedbackStatus("Checking the live frame on this device…");
        const file = await frameFile(video, 0.8);
        if (!file) throw new Error("Frame unavailable.");
        const { assessment } = await evaluateCapture(file);
        if (!cancelled && !capturePendingRef.current) {
          setLiveAssessment(assessment);
          setFeedbackStatus(
            assessment.accepted
              ? "All live checks pass. Hold still and capture."
              : "Adjust the items marked “Fix,” then hold still.",
          );
        }
      } catch (caught: unknown) {
        if (!cancelled && !capturePendingRef.current) {
          setLiveAssessment(undefined);
          setFeedbackStatus(
            caught instanceof Error
              ? caught.message
              : "Live face checks are still preparing. You can close the camera and upload instead.",
          );
        }
      }
      if (!cancelled) timeout = window.setTimeout(checkFrame, 1200);
    };
    void checkFrame();
    return () => {
      cancelled = true;
      if (timeout !== undefined) window.clearTimeout(timeout);
    };
  }, [ready]);

  async function takePhoto() {
    if (capturePendingRef.current) return;
    const video = videoRef.current;
    if (!video) return;
    capturePendingRef.current = true;
    setCapturePending(true);
    setError(undefined);
    setFeedbackStatus("Checking the captured photo before continuing…");
    try {
      const file = await frameFile(video);
      if (!file) {
        throw new Error(
          "The browser could not create a photo. Try uploading instead.",
        );
      }
      const { assessment } = await evaluateCapture(file);
      setLiveAssessment(assessment);
      if (!assessment.accepted) {
        setFeedbackStatus(
          "That captured frame needs another try. Fix the items marked below, hold still, and capture again.",
        );
        return;
      }
      setFeedbackStatus("Captured photo passed every check.");
      streamRef.current?.getTracks().forEach((track) => track.stop());
      onCapture(file);
      onClose();
    } catch (caught: unknown) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The captured photo could not be checked. Try again or upload a photo.",
      );
    } finally {
      capturePendingRef.current = false;
      setCapturePending(false);
    }
  }

  function retryCamera() {
    setCameraAttempt((attempt) => attempt + 1);
  }

  return (
    <section className="camera-card" aria-labelledby="camera-title">
      <div className="camera-heading">
        <div>
          <span className="eyebrow">On-device camera</span>
          <h3 id="camera-title">Center your face in the guide</h3>
        </div>
        <button className="icon-button" type="button" onClick={onClose}>
          Close camera
        </button>
      </div>
      {error ? (
        <div className="alert alert-error" role="alert" aria-live="assertive">
          <p>{error}</p>
          <button
            className="button button-outline"
            type="button"
            onClick={retryCamera}
          >
            Try camera again
          </button>
        </div>
      ) : (
        <div className="camera-frame">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            aria-label="Live front camera preview"
          />
          <div className="camera-guide" aria-hidden="true" />
        </div>
      )}
      {!error && (
        <div className="camera-feedback" aria-live="polite">
          <strong>Live capture checks</strong>
          <p>{feedbackStatus}</p>
          {liveAssessment && (
            <ul>
              {liveAssessment.issues.map((item) => (
                <li key={item.id} data-severity={item.severity}>
                  <span>{item.severity === "pass" ? "Pass" : "Fix"}</span>
                  {item.label}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <div className="camera-actions">
        <p>
          Keep the camera at eye level, use even front light, close your mouth,
          and look directly at the lens.
        </p>
        <button
          className="button button-primary"
          type="button"
          disabled={
            !ready ||
            Boolean(error) ||
            capturePending ||
            !liveAssessment?.accepted
          }
          onClick={() => void takePhoto()}
        >
          {capturePending ? "Checking photo…" : "Capture photo"}
        </button>
      </div>
    </section>
  );
}
