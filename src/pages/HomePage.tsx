import { RouteLink, useDocumentMeta } from "../router";

export function HomePage() {
  useDocumentMeta(
    "Private facial measurements",
    "Transparent facial geometry, repeatability checks, and an optional experimental SCUT benchmark estimate that runs privately in your browser.",
  );

  return (
    <>
      <section className="home-hero">
        <div className="hero-copy-block">
          <div className="eyebrow">Open source · On-device · Adult beta</div>
          <h1>
            Your face.
            <span>Measured without the black box.</span>
          </h1>
          <p className="hero-lede">
            Explainable facial geometry with guided capture, confidence ranges,
            manual correction, and private progress tracking. No account. No
            photo upload. No paywall.
          </p>
          <div className="button-row">
            <RouteLink className="button button-primary" to="/analyze">
              Start a private scan
            </RouteLink>
            <RouteLink className="button button-outline" to="/methodology">
              Inspect the methodology
            </RouteLink>
          </div>
          <p className="microcopy">
            Experimental research software for adults. Not medical advice or an
            objective measure of beauty.
          </p>
        </div>
        <div className="hero-instrument" aria-label="Illustration of transparent facial measurement">
          <div className="instrument-topline">
            <span>Front view</span>
            <strong>Local analysis</strong>
          </div>
          <div className="face-plot" aria-hidden="true">
            <div className="face-outline" />
            <span className="plot-line line-eyes" />
            <span className="plot-line line-mid" />
            <span className="plot-line line-jaw" />
            <span className="plot-dot dot-one" />
            <span className="plot-dot dot-two" />
            <span className="plot-dot dot-three" />
            <span className="plot-dot dot-four" />
          </div>
          <div className="instrument-metrics">
            <div>
              <span>Capture confidence</span>
              <strong>Shown, never assumed</strong>
            </div>
            <div>
              <span>Every result</span>
              <strong>Formula + anchors</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="trust-ribbon" aria-label="Product guarantees">
        <article>
          <span>01</span>
          <strong>Your image stays here</strong>
          <p>Analysis runs inside a dedicated browser worker.</p>
        </article>
        <article>
          <span>02</span>
          <strong>Uncertainty is visible</strong>
          <p>Weak photos and unstable measurements are not dressed up.</p>
        </article>
        <article>
          <span>03</span>
          <strong>The score is optional</strong>
          <p>Raw geometry remains available without a subjective summary.</p>
        </article>
        <article>
          <span>04</span>
          <strong>The code is inspectable</strong>
          <p>Definitions, tests, and limitations ship together.</p>
        </article>
      </section>

      <section className="section section-paper">
        <div className="section-intro">
          <span className="eyebrow">Built for repeatability</span>
          <h2>One quick scan—or three captures that challenge the result.</h2>
          <p>
            A single photograph is convenient. A precision scan is more honest:
            it checks whether the same metric holds across three accepted
            captures before using it in the optional benchmark estimate.
          </p>
        </div>
        <div className="mode-showcase">
          <article className="mode-card">
            <span className="mode-number">01</span>
            <div>
              <h3>Quick scan</h3>
              <p>
                One front photo, strict capture checks, all formulas, and a
                wider uncertainty range.
              </p>
            </div>
            <RouteLink to="/analyze?mode=quick">Use one photo</RouteLink>
          </article>
          <article className="mode-card mode-card-featured">
            <span className="mode-number">03</span>
            <div>
              <h3>Precision scan</h3>
              <p>
                Three front photos, median aggregation, within-session
                variation, and automatic instability flags.
              </p>
            </div>
            <RouteLink to="/analyze?mode=precision">
              Use precision mode
            </RouteLink>
          </article>
        </div>
      </section>

      <section className="section section-dark">
        <div className="section-intro split-intro">
          <div>
            <span className="eyebrow">18 candidate measurements</span>
            <h2>Geometry first. Judgment never hidden.</h2>
          </div>
          <p>
            Each measurement names its anchors, formula, sensitivity, capture
            limitations, confidence, and catalogue version. Manual correction
            lets you challenge the points that drive the result.
          </p>
        </div>
        <div className="pillar-grid">
          <article>
            <span>Overall</span>
            <h3>Proportions</h3>
            <p>Width, detected height, midface, lower face, and temple relationships.</p>
          </article>
          <article>
            <span>Detail</span>
            <h3>Eyes & brows</h3>
            <p>Spacing, projected width, tilt, and left/right detector symmetry.</p>
          </article>
          <article>
            <span>Center</span>
            <h3>Nose & mouth</h3>
            <p>Transparent width and projected-length ratios without health claims.</p>
          </article>
          <article>
            <span>Contour</span>
            <h3>Jaw & cheek</h3>
            <p>Pose-sensitive contour estimates that are labeled and correctable.</p>
          </article>
        </div>
      </section>

      <section className="section section-blue">
        <div className="score-story">
          <div>
            <span className="eyebrow">Optional benchmark estimate</span>
            <h2>An x.x / 10 result you can take apart.</h2>
            <p>
              Adult men can explicitly opt in to a pooled SCUT-FBP5500
              geometry estimate. MirrorMetric shows a 90% range, every
              standardized input and coefficient, and withholds the result when
              a required precision measurement is unstable.
            </p>
            <RouteLink className="text-link" to="/methodology#score">
              Read the complete score policy
            </RouteLink>
          </div>
          <div className="score-specimen" aria-label="Illustrative transparent benchmark score breakdown">
            <div className="score-ring">
              <strong>7.2</strong>
              <span>out of 10 · illustrative</span>
            </div>
            <ul>
              <li>
                <span>Jaw / cheek</span>
                <strong>Included</strong>
              </li>
              <li>
                <span>Eye spacing</span>
                <strong>Included</strong>
              </li>
              <li>
                <span>Eye tilt</span>
                <strong>Unstable · excluded</strong>
              </li>
            </ul>
            <p>
              Experimental benchmark estimate. Not a percentile, inferred
              identity, or a U.S.-women-18–21 prediction.
            </p>
          </div>
        </div>
      </section>

      <section className="section final-cta">
        <span className="eyebrow">No signup required</span>
        <h2>Use the measurements. Keep the photograph.</h2>
        <p>
          The model downloads to your browser. Your image, landmarks, history,
          and exports remain under your control.
        </p>
        <RouteLink className="button button-primary" to="/analyze">
          Begin on this device
        </RouteLink>
      </section>
    </>
  );
}
