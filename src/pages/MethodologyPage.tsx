import { MEASUREMENT_CATALOG_VERSION } from "../domain/contracts";
import { MEASUREMENT_DEFINITIONS } from "../lib/measurement-engine";
import { REQUIRED_ATTRACTIVENESS_METRIC_IDS } from "../lib/scoring";
import { useDocumentMeta } from "../router";

export function MethodologyPage() {
  useDocumentMeta(
    "Accuracy and methodology",
    "How MirrorMetric handles capture quality, repeatability, landmark correction, uncertainty, and the optional experimental geometry score.",
  );
  const categories = [...new Set(MEASUREMENT_DEFINITIONS.map((item) => item.category))];

  return (
    <>
      <header className="page-hero page-hero-dark">
        <span className="eyebrow">Accuracy charter</span>
        <h1>Accuracy is a public process, not a marketing adjective.</h1>
        <p>
          FaceIQ does not expose a reproducible ground-truth benchmark, so
          MirrorMetric does not claim score parity. We publish the inputs,
          formulas, failure rules, repeatability limits, and known gaps that
          others can test.
        </p>
      </header>
      <section className="section method-grid">
        <article>
          <span>01</span>
          <h2>Reject weak captures</h2>
          <p>
            Resolution, exposure, blur, face count, framing, yaw, pitch, roll,
            eye state, and mouth state are checked before measurement.
          </p>
        </article>
        <article>
          <span>02</span>
          <h2>Repeat the estimate</h2>
          <p>
            Precision mode uses three accepted captures and reports the median
            plus within-session variation instead of treating one frame as
            ground truth.
          </p>
        </article>
        <article>
          <span>03</span>
          <h2>Fail unstable metrics</h2>
          <p>
            Ratios above 5% coefficient of variation or angles above 1.5°
            standard deviation are labeled unstable and excluded from scoring.
          </p>
        </article>
        <article>
          <span>04</span>
          <h2>Allow correction</h2>
          <p>
            The anchor points that affect measurements can be inspected,
            dragged, nudged with buttons, reset, and recomputed.
          </p>
        </article>
      </section>

      <section className="section section-paper">
        <div className="section-intro split-intro">
          <div>
            <span className="eyebrow">Catalogue {MEASUREMENT_CATALOG_VERSION}</span>
            <h2>Every formula has a stable name.</h2>
          </div>
          <p>
            These are projected image measurements over detector landmarks.
            They are not caliper measurements, diagnoses, or statements about
            a person’s value.
          </p>
        </div>
        {categories.map((category) => (
          <div className="catalogue-group" key={category}>
            <h3>{category}</h3>
            <div className="catalogue-table" role="list">
              {MEASUREMENT_DEFINITIONS.filter(
                (item) => item.category === category,
              ).map((item) => (
                <article role="listitem" key={item.id}>
                  <div>
                    <strong>{item.label}</strong>
                    <code>{item.id}</code>
                  </div>
                  <p>{item.description}</p>
                  <span>{item.formula}</span>
                  <span>{item.sensitivity} sensitivity</span>
                </article>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="section section-blue" id="score">
        <div className="section-intro">
          <span className="eyebrow">Score policy</span>
          <h2>A working score with a deliberately narrow claim.</h2>
          <p>
            After explicit opt-in, the public build compares 13 measurements
            with broad project-defined bands and maps their weighted fit to
            0–10. It shows an input-sensitivity range and every target, weight,
            contribution, and exclusion reason. This fallback is not trained
            on attractiveness labels.
          </p>
        </div>
        <div className="profile-grid">
          {REQUIRED_ATTRACTIVENESS_METRIC_IDS.map((measurementId) => (
            <article key={measurementId}>
              <h3>{measurementId}</h3>
              <p>Cross-topology input with an inspectable broad fallback band.</p>
              <small>Required, finite, and stable in precision mode.</small>
            </article>
          ))}
        </div>
        <div className="benchmark-banner">
          <strong>Claim boundary</strong>
          <p>
            The public fallback is a geometry-band fit, not an attractiveness
            model. SCUT-FBP5500 contains pooled volunteer ratings and does not
            provide a U.S.-women-ages-18–21 segment. Neither path is a percentile,
            demographic inference, objective standard, or source of advice.
          </p>
        </div>
      </section>

      <section className="section benchmark-section">
        <div className="section-intro split-intro">
          <div>
            <span className="eyebrow">Benchmark status</span>
            <h2>Release gates come before a public model pack.</h2>
          </div>
          <p>
            The repository includes an SCUT 86-point adapter, deterministic
            fixtures, nested five-fold ridge validation, and aggregate Pearson,
            MAE, RMSE, 90% absolute-error, Asian-male, and Caucasian-male
            results—without redistributing restricted source data.
          </p>
        </div>
        <div className="benchmark-banner">
          <strong>Beta limitation</strong>
          <p>
            The first real 13-feature run produced Pearson 0.470, MAE 0.445,
            and RMSE 0.573 on 2,749 male records. It missed the Pearson ≥ 0.60
            gate, so it is not presented as a validated SCUT estimate. The
            transparent geometry fallback remains available instead.
          </p>
        </div>
      </section>
    </>
  );
}
