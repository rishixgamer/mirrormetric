import { useState } from "react";
import { LandmarkEditor } from "../components/LandmarkEditor";
import type {
  AnalysisSession,
  CaptureAnalysis,
} from "../domain/contracts";
import { downloadJson, saveSession } from "../lib/history";
import {
  formatMeasurement,
  formatUncertainty,
} from "../lib/measurement-engine";
import { replaceCapture } from "../lib/session";
import { RouteLink, useDocumentMeta } from "../router";

interface ResultsPageProps {
  readonly session?: AnalysisSession;
  readonly sourceFiles: ReadonlyArray<File>;
  readonly onUpdate: (session: AnalysisSession) => void;
}

export function ResultsPage({
  session,
  sourceFiles,
  onUpdate,
}: ResultsPageProps) {
  useDocumentMeta(
    "Analysis results",
    "Review transparent facial measurements, uncertainty, stability, an optional experimental benchmark estimate, and reversible guidance.",
  );
  const [editorCapture, setEditorCapture] = useState<number>();
  const [passphrase, setPassphrase] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [saveError, setSaveError] = useState<string>();

  if (!session) {
    return (
      <section className="empty-page">
        <span className="eyebrow">No active result</span>
        <h1>Run a scan or unlock local history.</h1>
        <div className="button-row">
          <RouteLink className="button button-primary" to="/analyze">
            Start a scan
          </RouteLink>
          <RouteLink className="button button-outline" to="/history">
            Open local history
          </RouteLink>
        </div>
      </section>
    );
  }
  const activeSession = session;

  const overallConfidence =
    session.measurements.reduce(
      (sum, measurement) => sum + measurement.confidence,
      0,
    ) / Math.max(session.measurements.length, 1);
  const unstable = session.measurements.filter(
    (measurement) => measurement.stability === "unstable",
  );
  const categories = [...new Set(session.measurements.map((item) => item.category))];

  async function saveLocally() {
    setSaveError(undefined);
    setSaveStatus("Encrypting on this device…");
    try {
      await saveSession(activeSession, passphrase);
      setSaveStatus("Saved to encrypted local history.");
      setPassphrase("");
    } catch (error) {
      setSaveStatus("");
      setSaveError(
        error instanceof Error ? error.message : "Could not save local history.",
      );
    }
  }

  function applyCorrection(captureIndex: number, capture: CaptureAnalysis) {
    onUpdate(replaceCapture(activeSession, captureIndex, capture));
  }

  return (
    <>
      <header className="results-hero">
        <div>
          <span className="eyebrow">
            {session.mode === "precision" ? "Precision scan" : "Quick scan"} ·
            experimental
          </span>
          <h1>Your measurement record.</h1>
          <p>
            Raw geometry comes first. Confidence reflects capture quality and,
            in precision mode, agreement across three photos.
          </p>
        </div>
        <div className="result-summary">
          <div>
            <span>Overall confidence</span>
            <strong>{overallConfidence.toFixed(0)}%</strong>
          </div>
          <div>
            <span>Accepted captures</span>
            <strong>{session.captures.length}</strong>
          </div>
          <div>
            <span>Unstable metrics</span>
            <strong>{unstable.length}</strong>
          </div>
        </div>
      </header>

      <section className="result-actions" aria-label="Result actions">
        <button
          className="button button-outline"
          type="button"
          onClick={() =>
            downloadJson(
              session,
              `mirrormetric-${session.createdAt.slice(0, 10)}.json`,
            )
          }
        >
          Export readable JSON
        </button>
        <button
          className="button button-outline"
          type="button"
          onClick={() => window.print()}
        >
          Print / save PDF
        </button>
        <RouteLink className="button button-dark" to="/analyze">
          New scan
        </RouteLink>
      </section>

      {session.scoreRequested && session.attractivenessScore && (
        <section
          className="section score-section benchmark-score-section"
          id="benchmark-score"
          aria-labelledby="benchmark-score-title"
        >
          <div className="score-control">
            <div>
              <span className="eyebrow">Optional subjective summary</span>
              <h2 id="benchmark-score-title">Experimental benchmark estimate</h2>
              <p>
                A transparent ridge-regression result based on the pooled
                SCUT-FBP5500 male subsets. It does not infer demographics and
                does not represent U.S. women ages 18–21.
              </p>
            </div>
            <div className="goal-control-box">
              <span>Model version</span>
              <strong>{session.attractivenessScore.version}</strong>
              <span>
                Input quality{" "}
                {session.attractivenessScore.inputConfidence.toFixed(0)}%
              </span>
            </div>
          </div>

          {session.attractivenessScore.status === "available" &&
          session.attractivenessScore.score !== undefined &&
          session.attractivenessScore.uncertainty ? (
            <div className="score-results">
              <div
                className="score-total"
                role="group"
                aria-label={`${session.attractivenessScore.score.toFixed(1)} out of 10, 90 percent range ${session.attractivenessScore.uncertainty.lower.toFixed(1)} to ${session.attractivenessScore.uncertainty.upper.toFixed(1)}, experimental benchmark estimate`}
              >
                <span>Experimental SCUT benchmark estimate</span>
                <strong>
                  {session.attractivenessScore.score.toFixed(1)}
                  <small> / 10</small>
                </strong>
                <p>
                  90% range{" "}
                  {session.attractivenessScore.uncertainty.lower.toFixed(1)}–
                  {session.attractivenessScore.uncertainty.upper.toFixed(1)} ·{" "}
                  {session.attractivenessScore.inputConfidence.toFixed(0)}%
                  input quality
                </p>
                <small>{session.attractivenessScore.disclaimer}</small>
              </div>
              <div className="score-breakdown">
                <h3>Inspect every model contribution</h3>
                {session.attractivenessScore.components.map((component) => (
                  <article key={component.measurementId}>
                    <div>
                      <strong>{component.label}</strong>
                      <span>
                        Input {component.value.toFixed(4)} · training mean{" "}
                        {component.mean.toFixed(4)} · SD{" "}
                        {component.standardDeviation.toFixed(4)} · standardized{" "}
                        {component.standardizedValue.toFixed(4)}
                      </span>
                    </div>
                    <span>
                      coefficient {component.coefficient.toFixed(6)} ·
                      contribution {component.contribution.toFixed(6)}
                    </span>
                    <p>{component.reason}</p>
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <div className="alert alert-warning benchmark-withheld" role="status">
              <strong>Score withheld</strong>
              <p>
                MirrorMetric will not estimate a score without a verified model
                pack and every stable, finite required input.
              </p>
              <ul>
                {session.attractivenessScore.withheldReasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
              <small>{session.attractivenessScore.disclaimer}</small>
            </div>
          )}
          {session.attractivenessScore.status === "withheld" &&
            session.attractivenessScore.components.length > 0 && (
              <div className="score-breakdown withheld-breakdown">
                <h3>Inspect every required model input</h3>
                {session.attractivenessScore.components.map((component) => (
                  <article key={component.measurementId}>
                    <div>
                      <strong>{component.label}</strong>
                      <span>
                        {component.included
                          ? `Input ${component.value.toFixed(4)} · mean ${component.mean.toFixed(4)} · SD ${component.standardDeviation.toFixed(4)} · standardized ${component.standardizedValue.toFixed(4)}`
                          : "Required input excluded"}
                      </span>
                    </div>
                    <span>
                      coefficient {component.coefficient.toFixed(6)} ·
                      contribution {component.contribution.toFixed(6)}
                    </span>
                    <p>{component.reason}</p>
                  </article>
                ))}
              </div>
            )}
        </section>
      )}

      {sourceFiles.length > 0 && (
        <section className="correction-strip">
          <div>
            <span className="eyebrow">Challenge the detector</span>
            <h2>Inspect or correct influential anchors.</h2>
            <p>
              Corrections recompute this result immediately. The source photos
              disappear when the tab closes and are never saved to history.
            </p>
          </div>
          <div className="capture-button-list">
            {sourceFiles.map((file, index) => (
              <button
                className="button button-outline"
                type="button"
                key={`${file.name}-${index}`}
                onClick={() => setEditorCapture(index)}
              >
                Correct capture {index + 1}
              </button>
            ))}
          </div>
        </section>
      )}

      {editorCapture !== undefined &&
        sourceFiles[editorCapture] &&
        session.captures[editorCapture] && (
          <div className="editor-section">
            <LandmarkEditor
              capture={session.captures[editorCapture]}
              file={sourceFiles[editorCapture]}
              onApply={(capture) => applyCorrection(editorCapture, capture)}
              onClose={() => setEditorCapture(undefined)}
            />
          </div>
        )}

      <section className="section measurements-section">
        <div className="section-intro split-intro">
          <div>
            <span className="eyebrow">Raw output</span>
            <h2>18 candidate front-view measurements.</h2>
          </div>
          <p>
            “Symmetry” means similarity between two detector distances—not
            visual perfection. Open any card to inspect its formula, anchors,
            sensitivity, and limitation.
          </p>
        </div>
        {categories.map((category) => (
          <div className="measurement-category" key={category}>
            <h3>{category}</h3>
            <div className="measurement-grid">
              {session.measurements
                .filter((measurement) => measurement.category === category)
                .map((measurement) => (
                  <article
                    className={`measurement-card stability-${measurement.stability}`}
                    key={measurement.id}
                  >
                    <div className="measurement-topline">
                      <span>{measurement.label}</span>
                      <span className="status-pill">
                        {measurement.stability === "single-capture"
                          ? "Single capture"
                          : measurement.stability}
                      </span>
                    </div>
                    <strong className="measurement-value">
                      {formatMeasurement(measurement)}
                    </strong>
                    <div className="measurement-confidence">
                      <span>{measurement.confidence.toFixed(0)}% confidence</span>
                      <span>{formatUncertainty(measurement)}</span>
                    </div>
                    {measurement.variation !== undefined && (
                      <p className="variation-note">
                        {measurement.unit === "degrees"
                          ? `${measurement.variation.toFixed(2)}° standard deviation`
                          : `${measurement.variation.toFixed(2)}% coefficient of variation`}
                      </p>
                    )}
                    <details>
                      <summary>Formula and limitations</summary>
                      <p>{measurement.description}</p>
                      <code>{measurement.formula}</code>
                      <dl>
                        <div>
                          <dt>Anchors</dt>
                          <dd>{measurement.anchorIndices.join(", ")}</dd>
                        </div>
                        <div>
                          <dt>Sensitivity</dt>
                          <dd>
                            {measurement.sensitivity} · ±0.15% anchor
                            perturbation changed this result by at most{" "}
                            {measurement.sensitivityDelta.toFixed(
                              measurement.unit === "ratio" ? 4 : 2,
                            )}
                            {measurement.unit === "degrees"
                              ? "°"
                              : measurement.unit === "percent"
                                ? " points"
                                : ""}
                          </dd>
                        </div>
                        <div>
                          <dt>Limitation</dt>
                          <dd>{measurement.limitations}</dd>
                        </div>
                      </dl>
                    </details>
                  </article>
                ))}
            </div>
          </div>
        ))}
      </section>

      {session.legacyGoalScore && (
        <section className="section score-section legacy-score-section">
          <span className="eyebrow">Read-only migrated record</span>
          <h2>Legacy goal similarity</h2>
          <p>
            This v1 result is preserved exactly as saved and is never
            recomputed under the benchmark model.
          </p>
          <div className="score-total">
            <span>{session.legacyGoalProfileId ?? "Saved"} profile</span>
            <strong>{session.legacyGoalScore.score.toFixed(0)}</strong>
            <p>
              Legacy range{" "}
              {session.legacyGoalScore.uncertainty.lower.toFixed(0)}–
              {session.legacyGoalScore.uncertainty.upper.toFixed(0)}
            </p>
            <small>{session.legacyGoalScore.disclaimer}</small>
          </div>
        </section>
      )}

      <section className="section guidance-section">
        <div className="section-intro">
          <span className="eyebrow">Your plan</span>
          <h2>Reversible experiments first. Clinical education stays general.</h2>
          <p>
            No procedure is recommended or ranked from your face. Professional
            education cards appear for every adult user regardless of their
            measurements.
          </p>
        </div>
        <div className="guidance-grid">
          {session.guidance.map((item) => (
            <article key={item.id}>
              <div className="guidance-labels">
                <span>{item.evidenceLevel.replaceAll("-", " ")}</span>
                <span>{item.reversible ? "Reversible" : "Education only"}</span>
              </div>
              <h3>{item.title}</h3>
              <p>{item.summary}</p>
              <details>
                <summary>Why this appears</summary>
                <p>{item.why}</p>
                {item.safetyNote && <p>{item.safetyNote}</p>}
              </details>
              {item.sourceUrl ? (
                <a href={item.sourceUrl} rel="noreferrer">
                  Source · {item.sourceLabel}
                </a>
              ) : (
                <span className="source-label">{item.sourceLabel}</span>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="section local-save-section">
        <div>
          <span className="eyebrow">Optional local history</span>
          <h2>Encrypt this result on this device.</h2>
          <p>
            The passphrase is never stored. Losing it means the record cannot
            be recovered. Source photographs are not included.
          </p>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void saveLocally();
          }}
        >
          <label htmlFor="history-passphrase">Local-history passphrase</label>
          <input
            id="history-passphrase"
            type="password"
            minLength={10}
            required
            autoComplete="new-password"
            value={passphrase}
            onChange={(event) => setPassphrase(event.target.value)}
            aria-describedby="passphrase-help"
          />
          <p id="passphrase-help">At least 10 characters. Copy and paste is allowed.</p>
          <button className="button button-primary" type="submit">
            Encrypt and save locally
          </button>
          <div aria-live="polite" role="status">
            {saveStatus}
          </div>
          {saveError && (
            <div className="alert alert-error" role="alert" aria-live="assertive">
              {saveError}
            </div>
          )}
        </form>
      </section>
    </>
  );
}
