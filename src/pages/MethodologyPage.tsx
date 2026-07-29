import { MEASUREMENT_CATALOG_VERSION } from "../domain/contracts";
import { MEASUREMENT_DEFINITIONS } from "../lib/measurement-engine";
import { GOAL_PROFILES } from "../lib/scoring";
import { useDocumentMeta } from "../router";

export function MethodologyPage() {
  useDocumentMeta(
    "Accuracy and methodology",
    "How MirrorMetric handles capture quality, repeatability, landmark correction, uncertainty, and subjective goal similarity.",
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
          <h2>Similarity to a chosen style—not beauty.</h2>
          <p>
            Component similarity is 100 inside the selected target band and
            decays continuously outside it. Stable components are combined by
            visible weights. The profile is chosen by the user and never
            inferred from gender or ethnicity.
          </p>
        </div>
        <div className="profile-grid">
          {GOAL_PROFILES.map((profile) => (
            <article key={profile.id}>
              <h3>{profile.label}</h3>
              <p>{profile.description}</p>
              <strong>{profile.targets.length} visible components</strong>
              <small>{profile.caveat}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="section benchmark-section">
        <div className="section-intro split-intro">
          <div>
            <span className="eyebrow">Benchmark status</span>
            <h2>Reproducible harness ready; human validation remains.</h2>
          </div>
          <p>
            The repository includes adapters for WFLW and 300W-style
            annotations and reports normalized mean error, AUC, failure rate,
            and difficult-condition subsets without redistributing source
            photographs.
          </p>
        </div>
        <div className="benchmark-banner">
          <strong>Beta limitation</strong>
          <p>
            A non-experimental release still requires consenting participants,
            repeated sessions on multiple camera families, independent
            annotation, and subgroup uncertainty. Until then, results remain
            explicitly experimental.
          </p>
        </div>
      </section>
    </>
  );
}
