import { useState } from "react";
import type { AnalysisSession } from "../domain/contracts";
import {
  deleteAllSessions,
  deleteSession,
  exportEncryptedHistory,
  listSessions,
} from "../lib/history";
import { navigate, useDocumentMeta } from "../router";

interface HistoryPageProps {
  readonly onOpen: (session: AnalysisSession) => void;
}

export function HistoryPage({ onOpen }: HistoryPageProps) {
  useDocumentMeta(
    "Encrypted local history",
    "Unlock, export, or delete facial measurement records stored only in this browser.",
  );
  const [passphrase, setPassphrase] = useState("");
  const [sessions, setSessions] = useState<AnalysisSession[]>([]);
  const [unlocked, setUnlocked] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string>();

  async function unlock() {
    setError(undefined);
    setStatus("Unlocking records on this device…");
    try {
      const unlockedSessions = await listSessions(passphrase);
      setSessions(unlockedSessions);
      setUnlocked(true);
      setStatus(
        unlockedSessions.length
          ? `${unlockedSessions.length} record${unlockedSessions.length === 1 ? "" : "s"} unlocked.`
          : "No encrypted records are saved in this browser.",
      );
    } catch (caught) {
      setStatus("");
      setError(
        caught instanceof Error
          ? caught.message
          : "Local history could not be unlocked.",
      );
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this encrypted local record? This cannot be undone.")) {
      return;
    }
    await deleteSession(id);
    setSessions((current) => current.filter((session) => session.id !== id));
    setStatus("Local record deleted.");
  }

  async function removeAll() {
    if (
      !window.confirm(
        "Delete every MirrorMetric record stored in this browser? This cannot be undone.",
      )
    ) {
      return;
    }
    await deleteAllSessions();
    setSessions([]);
    setStatus("All local MirrorMetric records were deleted.");
  }

  return (
    <>
      <header className="page-hero page-hero-blue">
        <span className="eyebrow">Device-only storage</span>
        <h1>History that cannot leave without you.</h1>
        <p>
          Records are encrypted in this browser. MirrorMetric does not store the
          passphrase, recovery key, or source photographs.
        </p>
      </header>
      <section className="section history-unlock">
        <div>
          <span className="eyebrow">Unlock locally</span>
          <h2>Your passphrase never leaves this page.</h2>
          <p>
            Use the same passphrase used when saving. If it is lost, the
            encrypted records cannot be recovered.
          </p>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void unlock();
          }}
        >
          <label htmlFor="unlock-passphrase">Local-history passphrase</label>
          <input
            id="unlock-passphrase"
            type="password"
            minLength={10}
            required
            autoComplete="current-password"
            value={passphrase}
            onChange={(event) => setPassphrase(event.target.value)}
          />
          <button className="button button-primary" type="submit">
            Unlock history
          </button>
          <div role="status" aria-live="polite">
            {status}
          </div>
          {error && (
            <div className="alert alert-error" role="alert" aria-live="assertive">
              {error}
            </div>
          )}
        </form>
      </section>

      {unlocked && (
        <section className="section history-records" aria-labelledby="history-title">
          <div className="history-toolbar">
            <div>
              <span className="eyebrow">Unlocked in memory</span>
              <h2 id="history-title">Saved analyses</h2>
            </div>
            <div className="button-row">
              <button
                className="button button-outline"
                type="button"
                disabled={!sessions.length}
                onClick={() => void exportEncryptedHistory(passphrase)}
              >
                Export encrypted archive
              </button>
              <button
                className="button button-danger"
                type="button"
                disabled={!sessions.length}
                onClick={() => void removeAll()}
              >
                Delete all
              </button>
            </div>
          </div>
          {sessions.length ? (
            <div className="history-grid">
              {sessions.map((session) => {
                const confidence =
                  session.measurements.reduce(
                    (sum, measurement) => sum + measurement.confidence,
                    0,
                  ) / Math.max(session.measurements.length, 1);
                return (
                  <article key={session.id}>
                    <div className="history-card-top">
                      <span>
                        {new Date(session.createdAt).toLocaleDateString(
                          undefined,
                          { dateStyle: "long" },
                        )}
                      </span>
                      <span className="status-pill">{session.mode}</span>
                    </div>
                    <h3>
                      {session.attractivenessScore?.status === "available" &&
                      session.attractivenessScore.score !== undefined
                        ? `${session.attractivenessScore.score.toFixed(1)} / 10 experimental benchmark estimate`
                        : session.legacyGoalScore
                          ? `${session.legacyGoalScore.score.toFixed(0)} legacy goal similarity`
                          : session.scoreRequested
                            ? "Benchmark score withheld"
                            : "Raw measurement record"}
                    </h3>
                    <dl>
                      <div>
                        <dt>Confidence</dt>
                        <dd>{confidence.toFixed(0)}%</dd>
                      </div>
                      <div>
                        <dt>Captures</dt>
                        <dd>{session.captures.length}</dd>
                      </div>
                      <div>
                        <dt>Catalogue</dt>
                        <dd>{session.measurementCatalogVersion}</dd>
                      </div>
                    </dl>
                    <div className="history-card-actions">
                      <button
                        className="button button-dark"
                        type="button"
                        onClick={() => {
                          onOpen(session);
                          navigate("/results");
                        }}
                      >
                        Open result
                      </button>
                      <button
                        className="text-button danger-text"
                        type="button"
                        onClick={() => void remove(session.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-records">
              <h3>No local records</h3>
              <p>Run an analysis and choose “Encrypt and save locally.”</p>
            </div>
          )}
        </section>
      )}
    </>
  );
}
