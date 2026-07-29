import { useEffect, useMemo, useRef, useState } from "react";
import { CameraCapture } from "../components/CameraCapture";
import type {
  AnalysisMode,
  AnalysisSession,
  CaptureAnalysis,
  CaptureAssessment,
  GoalProfileId,
} from "../domain/contracts";
import { assessCapture } from "../lib/capture-assessment";
import { detectFace } from "../lib/face-landmarker";
import { assessImageQuality } from "../lib/image-quality";
import { computeMeasurements } from "../lib/measurement-engine";
import { GOAL_PROFILES } from "../lib/scoring";
import { createAnalysisSession } from "../lib/session";
import { navigate, useDocumentMeta } from "../router";

const MAX_FILE_BYTES = 12 * 1024 * 1024;

interface AnalyzePageProps {
  readonly onComplete: (
    session: AnalysisSession,
    sourceFiles: ReadonlyArray<File>,
  ) => void;
}

function FilePreview({
  file,
  index,
  onRemove,
}: {
  readonly file: File;
  readonly index: number;
  readonly onRemove: () => void;
}) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return (
    <article className="file-preview">
      <img src={url} alt={`Selected capture ${index + 1}`} />
      <div>
        <strong>Capture {index + 1}</strong>
        <span>{file.name}</span>
      </div>
      <button type="button" onClick={onRemove}>
        Remove
      </button>
    </article>
  );
}

export function AnalyzePage({ onComplete }: AnalyzePageProps) {
  useDocumentMeta(
    "Analyze privately",
    "Run a quick or three-photo precision facial measurement scan entirely on this device.",
  );
  const initialMode =
    new URLSearchParams(window.location.search).get("mode") === "quick"
      ? "quick"
      : "precision";
  const [mode, setMode] = useState<AnalysisMode>(initialMode);
  const [files, setFiles] = useState<File[]>([]);
  const [adultConfirmed, setAdultConfirmed] = useState(false);
  const [permissionConfirmed, setPermissionConfirmed] = useState(false);
  const [limitsConfirmed, setLimitsConfirmed] = useState(false);
  const [scoreEnabled, setScoreEnabled] = useState(false);
  const [goalProfileId, setGoalProfileId] =
    useState<GoalProfileId>("balanced");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string>();
  const [reports, setReports] = useState<
    Array<{ fileName: string; assessment: CaptureAssessment }>
  >([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const requiredCount = mode === "precision" ? 3 : 1;
  const consentsComplete =
    adultConfirmed && permissionConfirmed && limitsConfirmed;
  const canAnalyze =
    consentsComplete && files.length === requiredCount && !busy;

  function validateFile(file: File): string | undefined {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return "Choose a JPEG, PNG, or WebP image.";
    }
    if (file.size > MAX_FILE_BYTES) {
      return "Each image must be smaller than 12 MB.";
    }
    return undefined;
  }

  function addFile(file: File) {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(undefined);
    setReports([]);
    setFiles((current) => {
      const limit = requiredCount;
      return [...current, file].slice(0, limit);
    });
  }

  function switchMode(nextMode: AnalysisMode) {
    setMode(nextMode);
    setFiles((current) => current.slice(0, nextMode === "precision" ? 3 : 1));
    setReports([]);
    setError(undefined);
  }

  async function analyze() {
    if (!canAnalyze) return;
    setBusy(true);
    setError(undefined);
    setReports([]);
    const completed: CaptureAnalysis[] = [];
    const nextReports: Array<{
      fileName: string;
      assessment: CaptureAssessment;
    }> = [];

    try {
      for (let index = 0; index < files.length; index++) {
        const file = files[index];
        setStatus(`Checking capture ${index + 1} of ${files.length}…`);
        const quality = await assessImageQuality(file);
        setStatus(`Running private landmark detection ${index + 1} of ${files.length}…`);
        const detection = await detectFace(file);
        const assessment = assessCapture(quality, detection);
        nextReports.push({ fileName: file.name, assessment });
        if (!assessment.accepted) continue;
        completed.push({
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          fileName: file.name,
          width: quality.width,
          height: quality.height,
          assessment,
          landmarks: detection.landmarks,
          measurements: computeMeasurements(
            detection.landmarks,
            assessment.confidence,
          ),
        });
      }
      setReports(nextReports);
      if (completed.length !== files.length) {
        setError(
          "At least one capture did not meet the strict front-view rules. Review the checks below and replace it.",
        );
        return;
      }
      setStatus("Aggregating measurements and uncertainty…");
      const session = createAnalysisSession(
        mode,
        completed,
        scoreEnabled ? goalProfileId : undefined,
      );
      onComplete(session, files);
      navigate("/results");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The analysis could not be completed.",
      );
    } finally {
      setBusy(false);
      setStatus("");
    }
  }

  return (
    <>
      <header className="page-hero analyze-hero">
        <span className="eyebrow">Private analysis workspace</span>
        <h1>Build a measurement that can survive a retake.</h1>
        <p>
          Use a neutral, front-facing adult photo. The app checks capture
          conditions before it computes geometry, and sends no image to a
          server.
        </p>
      </header>

      <section className="analysis-workspace" aria-labelledby="scan-setup-title">
        <div className="scan-setup">
          <span className="step-kicker">Step 01 · choose rigor</span>
          <h2 id="scan-setup-title">How should this scan work?</h2>
          <div className="segmented-control" aria-label="Analysis mode">
            <button
              type="button"
              aria-pressed={mode === "quick"}
              onClick={() => switchMode("quick")}
            >
              <strong>Quick</strong>
              <span>1 photo</span>
            </button>
            <button
              type="button"
              aria-pressed={mode === "precision"}
              onClick={() => switchMode("precision")}
            >
              <strong>Precision</strong>
              <span>3 photos · recommended</span>
            </button>
          </div>
          <div className="mode-explainer">
            <strong>
              {mode === "precision"
                ? "Precision mode checks repeatability."
                : "Quick mode prioritizes speed."}
            </strong>
            <p>
              {mode === "precision"
                ? "Stable measurements use the median of three accepted captures. Ratios over 5% variation and angles over 1.5° standard deviation are flagged."
                : "One accepted capture produces wider uncertainty ranges and cannot test within-session stability."}
            </p>
          </div>
        </div>

        <div className="capture-setup">
          <span className="step-kicker">Step 02 · provide captures</span>
          <div className="capture-heading">
            <h2>
              {files.length} of {requiredCount} selected
            </h2>
            <button
              className="button button-outline"
              type="button"
              onClick={() => setCameraOpen((open) => !open)}
            >
              {cameraOpen ? "Hide camera" : "Use camera"}
            </button>
          </div>
          {cameraOpen && (
            <CameraCapture
              onCapture={addFile}
              onClose={() => setCameraOpen(false)}
            />
          )}
          <div
            className="drop-zone"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const file = event.dataTransfer.files[0];
              if (file) addFile(file);
            }}
          >
            <strong>Drop a front photo here</strong>
            <span>JPEG, PNG, or WebP · up to 12 MB · 720 px minimum</span>
            <button
              className="button button-dark"
              type="button"
              disabled={files.length >= requiredCount}
              onClick={() => fileInputRef.current?.click()}
            >
              Choose a photo
            </button>
            <input
              ref={fileInputRef}
              className="visually-hidden-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) addFile(file);
                event.target.value = "";
              }}
            />
          </div>
          {files.length > 0 && (
            <div className="file-preview-grid">
              {files.map((file, index) => (
                <FilePreview
                  key={`${file.name}-${file.lastModified}-${index}`}
                  file={file}
                  index={index}
                  onRemove={() =>
                    setFiles((current) =>
                      current.filter((_, candidate) => candidate !== index),
                    )
                  }
                />
              ))}
            </div>
          )}
        </div>

        <div className="consent-setup">
          <span className="step-kicker">Step 03 · consent and context</span>
          <h2>Confirm before local processing</h2>
          <fieldset className="consent-list">
            <legend className="sr-only">Required confirmations</legend>
            <label>
              <input
                type="checkbox"
                checked={adultConfirmed}
                onChange={(event) => setAdultConfirmed(event.target.checked)}
              />
              <span>
                <strong>I am at least 18 years old.</strong>
                MirrorMetric is not designed for analysis of minors.
              </span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={permissionConfirmed}
                onChange={(event) => setPermissionConfirmed(event.target.checked)}
              />
              <span>
                <strong>I own this photo or have permission to use it.</strong>
                I will not use this tool for covert or high-stakes decisions.
              </span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={limitsConfirmed}
                onChange={(event) => setLimitsConfirmed(event.target.checked)}
              />
              <span>
                <strong>I understand the limitations.</strong>
                Results are experimental, subjective in part, and not medical
                advice or an objective beauty assessment.
              </span>
            </label>
          </fieldset>
          <div className="score-opt-in">
            <label>
              <input
                type="checkbox"
                checked={scoreEnabled}
                onChange={(event) => setScoreEnabled(event.target.checked)}
              />
              <span>
                <strong>Enable optional goal similarity</strong>
                Raw measurements remain the primary result.
              </span>
            </label>
            {scoreEnabled && (
              <label className="goal-select" htmlFor="goal-profile">
                <span>Chosen presentation goal</span>
                <select
                  id="goal-profile"
                  value={goalProfileId}
                  onChange={(event) =>
                    setGoalProfileId(event.target.value as GoalProfileId)
                  }
                >
                  {GOAL_PROFILES.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <div className="analyze-action">
            <div>
              <strong>Nothing is uploaded.</strong>
              <p>
                The model and WebAssembly runtime load from this site and run
                inside a dedicated worker.
              </p>
            </div>
            <button
              className="button button-primary button-large"
              type="button"
              disabled={!canAnalyze}
              onClick={() => void analyze()}
            >
              {busy ? "Analyzing on this device…" : `Analyze ${requiredCount} capture${requiredCount === 1 ? "" : "s"}`}
            </button>
          </div>
          <div className="sr-only" role="status" aria-live="polite">
            {status}
          </div>
          {status && <p className="visible-status">{status}</p>}
          {error && (
            <div className="alert alert-error" role="alert" aria-live="assertive">
              {error}
            </div>
          )}
        </div>
      </section>

      {reports.length > 0 && (
        <section className="section capture-report" aria-labelledby="capture-report-title">
          <div className="section-intro">
            <span className="eyebrow">Capture gate</span>
            <h2 id="capture-report-title">What passed—and what needs another photo.</h2>
          </div>
          <div className="report-grid">
            {reports.map((report, reportIndex) => (
              <article key={`${report.fileName}-${reportIndex}`}>
                <div className="report-title">
                  <h3>Capture {reportIndex + 1}</h3>
                  <span
                    className={
                      report.assessment.accepted
                        ? "status-pill status-pass"
                        : "status-pill status-fail"
                    }
                  >
                    {report.assessment.accepted ? "Accepted" : "Retake"}
                  </span>
                </div>
                <p>{report.assessment.confidence.toFixed(0)}% capture confidence</p>
                <ul>
                  {report.assessment.issues.map((item) => (
                    <li key={item.id} data-severity={item.severity}>
                      <strong>
                        {item.severity === "pass"
                          ? "Pass"
                          : item.severity === "warning"
                            ? "Review"
                            : "Fix"}{" "}
                        · {item.label}
                      </strong>
                      <span>{item.detail}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
