import { useDocumentMeta } from "../router";

export function PrivacyPage() {
  useDocumentMeta(
    "Privacy",
    "MirrorMetric processes facial photos on-device and stores history only when the user opts in.",
  );
  return (
    <article className="legal-page">
      <span className="eyebrow">Plain-language privacy</span>
      <h1>Your face is not our dataset.</h1>
      <p className="legal-lede">
        MirrorMetric has no account system, analytics tracker, payment system,
        photo-upload endpoint, or application database.
      </p>
      <h2>What happens to a photo</h2>
      <p>
        The browser decodes the selected file without preserving its metadata.
        The image is sent to an on-device analysis worker in this tab. Model and
        WebAssembly files may download from the MirrorMetric site, but the photo
        and its landmarks are not included in those requests.
      </p>
      <h2>Local history</h2>
      <p>
        History is off until you choose to save a result. Saved records are
        encrypted in browser storage with AES-GCM using a key derived from your
        passphrase. The passphrase and key are not stored. Original photos are
        not saved to history.
      </p>
      <h2>Deletion and exports</h2>
      <p>
        You can delete one record or all local records from the History page.
        You can export an encrypted JSON archive or print a local report to PDF.
        Clearing site data in your browser also removes local records.
      </p>
      <h2>Research and telemetry</h2>
      <p>
        This public build collects no research telemetry. Any future study must
        use a separate, explicit consent flow and cannot silently activate in
        this application.
      </p>
      <h2>Optional benchmark model</h2>
      <p>
        The score model is requested only after explicit opt-in, using a
        same-origin GET with no photograph, landmark, measurement, or result
        data in a request body. The response is checked against a build-pinned
        SHA-256 digest and may be cached for offline use.
      </p>
      <h2>Security limits</h2>
      <p>
        Device-local does not mean invulnerable. Someone with access to your
        unlocked device, browser profile, screen, or passphrase may still see
        your information. Keep exports and passphrases private.
      </p>
    </article>
  );
}

export function TermsPage() {
  useDocumentMeta(
    "Terms and limitations",
    "Important limitations for the experimental MirrorMetric facial measurement beta.",
  );
  return (
    <article className="legal-page">
      <span className="eyebrow">Terms and limitations</span>
      <h1>Measure carefully. Interpret modestly.</h1>
      <p className="legal-lede">
        By using this beta, you confirm that you are at least 18 and own or have
        permission to analyze every photograph you select.
      </p>
      <h2>Research software</h2>
      <p>
        MirrorMetric is experimental research software. Outputs can be wrong,
        incomplete, or affected by camera position, lens distortion, lighting,
        expression, occlusion, and landmark error.
      </p>
      <h2>No medical or professional advice</h2>
      <p>
        Measurements, the optional benchmark estimate, and educational links
        are not diagnoses, treatment recommendations, predictions of surgical
        outcome, or substitutes for a qualified professional. Procedures are
        never ranked for an individual.
      </p>
      <h2>No objective beauty claim</h2>
      <p>
        The optional score is an experimental pooled SCUT-FBP5500 benchmark
        estimate for self-confirmed adult men. It does not represent U.S. women
        ages 18–21 and does not measure objective attractiveness, health,
        character, identity, gender, ethnicity, social value, or personal
        worth. It is not a percentile.
      </p>
      <h2>Prohibited use</h2>
      <p>
        Do not use MirrorMetric for employment, insurance, education, credit,
        housing, law enforcement, identity verification, medical decisions,
        covert surveillance, or analysis of minors.
      </p>
      <h2>Open-source warranty</h2>
      <p>
        The software is provided under the MIT License without warranty. Review
        the source, methodology, and limitations before relying on any output.
      </p>
    </article>
  );
}

export function OpenSourcePage() {
  useDocumentMeta(
    "Open source",
    "MirrorMetric publishes its measurement definitions, tests, validation protocol, and limitations under the MIT License.",
  );
  return (
    <>
      <header className="page-hero page-hero-blue">
        <span className="eyebrow">MIT licensed</span>
        <h1>Fork the formulas. Challenge the benchmark. Improve the tool.</h1>
        <p>
          The application, measurement catalogue, model-pack schema, training
          adapter, tests, privacy boundary, and release notes live together.
          Accuracy is never a premium tier.
        </p>
        <a
          className="button button-primary"
          href="https://github.com/rishixgamer/mirrormetric"
          rel="noreferrer"
        >
          View the public repository
        </a>
      </header>
      <section className="section open-grid">
        <article>
          <span>01</span>
          <h2>Definitions are versioned</h2>
          <p>
            New metrics require named anchors, formulas, sources, limitations,
            sensitivity, and deterministic tests.
          </p>
        </article>
        <article>
          <span>02</span>
          <h2>Photos stay out of issues</h2>
          <p>
            Contributors report capture conditions and non-identifying
            coordinates. Private facial photographs do not belong in public bug
            reports.
          </p>
        </article>
        <article>
          <span>03</span>
          <h2>Benchmarks keep their licenses</h2>
          <p>
            Adapters accept locally obtained datasets and publish aggregate
            output without copying restricted images into the repository.
          </p>
        </article>
      </section>
    </>
  );
}

export function NotFoundPage() {
  useDocumentMeta("Page not found", "The requested MirrorMetric page was not found.");
  return (
    <section className="empty-page">
      <span className="eyebrow">404</span>
      <h1>This page is outside the mesh.</h1>
      <a className="button button-primary" href="/">
        Return home
      </a>
    </section>
  );
}
