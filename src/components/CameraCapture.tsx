import { useEffect, useRef, useState } from "react";
import type { CaptureAssessment } from "../domain/contracts";
import { assessCapture } from "../lib/capture-assessment";
import { detectFace } from "../lib/face-landmarker";
import { assessImageQuality } from "../lib/image-quality";

interface CameraCaptureProps {
  readonly onCapture: (file: File) => void;
  readonly onClose: () => void;
}

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | undefined>(undefined);
  const [error, setError] = useState<string>();
  const [ready, setReady] = useState(false);
  const [liveAssessment, setLiveAssessment] =
    useState<CaptureAssessment>();
  const [feedbackStatus, setFeedbackStatus] = useState(
    "Starting the camera and private face model…",
  );

  useEffect(() => {
    let active = true;
    void navigator.mediaDevices
      .getUserMedia({
        audio: false,
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 1280 },
        },
      })
      .then((stream) => {
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch(() => {
        setError(
          "Camera access is unavailable. You can still upload a photo from this device.",
        );
      });
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

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
      if (!video || document.hidden) {
        timeout = window.setTimeout(checkFrame, 1200);
        return;
      }
      try {
        setFeedbackStatus("Checking the live frame on this device…");
        const file = await frameFile(video, 0.8);
        if (!file) throw new Error("Frame unavailable.");
        const quality = await assessImageQuality(file);
        const detection = await detectFace(file);
        const assessment = assessCapture(quality, detection);
        if (!cancelled) {
          setLiveAssessment(assessment);
          setFeedbackStatus(
            assessment.accepted
              ? "All live checks pass. Hold still and capture."
              : "Adjust the items marked “Fix,” then hold still.",
          );
        }
      } catch {
        if (!cancelled) {
          setLiveAssessment(undefined);
          setFeedbackStatus(
            "Live face checks are still preparing. You can close the camera and upload instead.",
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
    const video = videoRef.current;
    if (!video) return;
    const file = await frameFile(video);
    if (!file) {
      setError("The browser could not create a photo. Try uploading instead.");
      return;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    onCapture(file);
    onClose();
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
          {error}
        </div>
      ) : (
        <div className="camera-frame">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            onCanPlay={() => setReady(true)}
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
          disabled={!ready || Boolean(error) || !liveAssessment?.accepted}
          onClick={() => void takePhoto()}
        >
          Capture photo
        </button>
      </div>
    </section>
  );
}
