import { useState } from "react";
import { LandmarkEditor } from "../components/LandmarkEditor";
import type {
  AnalysisSession,
  CaptureAnalysis,
  GoalProfileId,
} from "../domain/contracts";
import { downloadJson, saveSession } from "../lib/history";
import {
  formatMeasurement,
  formatUncertainty,
} from "../lib/measurement-engine";
import { GOAL_PROFILES, getGoalProfile } from "../lib/scoring";
import { replaceCapture, updateSessionGoal } from "../lib/session";
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
    "Review transparent facial measurements, uncertainty, stability, goal similarity, and reversible guidance.",
  );
  const [goalChoice, setGoalChoice] =
    useState<GoalProfileId>(session?.goalProfileId ?? "balanced");
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

  function applyGoal() {
    onUpdate(updateSessionGoal(activeSession, goalChoice));
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

      <section className="section score-section" id="goal-score">
        <div className="score-control">
          <div>
            <span className="eyebrow">Optional subjective summary</span>
            <h2>Goal similarity</h2>
            <p>
              Choose a presentation profile yourself. No identity is inferred,
              and unstable measurements are automatically excluded.
            </p>
          </div>
          <div className="goal-control-box">
            <label htmlFor="result-goal">Presentation goal</label>
            <select
              id="result-goal"
              value={goalChoice}
              onChange={(event) =>
                setGoalChoice(event.target.value as GoalProfileId)
              }
            >
              {GOAL_PROFILES.map((profile) => (
                <option value={profile.id} key={profile.id}>
                  {profile.label}
                </option>
              ))}
            </select>
            <button
              className="button button-primary"
              type="button"
              onClick={applyGoal}
            >
              {session.score ? "Update goal score" : "Enable goal score"}
            </button>
            {session.score && (
              <button
                className="text-button"
                type="button"
                onClick={() => onUpdate(updateSessionGoal(session, undefined))}
              >
                Remove score
              </button>
            )}
          </div>
        </div>

        {session.score && (
          <div className="score-results">
            <div className="score-total">
              <span>{getGoalProfile(session.score.profileId).label} profile</span>
              <strong>{session.score.score.toFixed(0)}</strong>
              <p>
                Range {session.score.uncertainty.lower.toFixed(0)}–
                {session.score.uncertainty.upper.toFixed(0)} ·{" "}
                {session.score.confidence.toFixed(0)}% input confidence
              </p>
              <small>{session.score.disclaimer}</small>
            </div>
            <div className="score-breakdown">
              {session.score.components.map((component) => (
                <article key={component.measurementId}>
                  <div>
                    <strong>{component.label}</strong>
                    <span>
                      Target {component.targetMinimum.toFixed(2)}–
                      {component.targetMaximum.toFixed(2)}
                    </span>
                  </div>
                  <span>
                    {component.included
                      ? `${component.similarity.toFixed(0)} similarity`
                      : "Excluded"}
                  </span>
                  <p>{component.reason}</p>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>

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
