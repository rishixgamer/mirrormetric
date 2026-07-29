# MirrorMetric

**Measurement without the black box.**

MirrorMetric is a free, MIT-licensed adult facial-measurement beta. It runs the
MediaPipe Face Landmarker in a dedicated browser worker, rejects unsupported
captures, exposes every formula and landmark anchor, and keeps photos on the
device. There are no accounts, analytics, server-side photo storage, premium
accuracy features, or hidden demographic inference.

> This is experimental research software. It is not medical advice or an
> objective measure of beauty. The optional 0–10 result is an experimental
> SCUT benchmark estimate—not a percentile or a prediction of what U.S. women
> ages 18–21 find attractive.

## Product surface

- Quick scan with one accepted front photograph.
- Precision scan with three accepted photographs, median aggregation, and
  instability exclusion at 5% ratio CV or 1.5° angular SD.
- Resolution, exposure, blur, framing, face-count, expression, and pose gates.
- 18 candidate front-view measurements with formulas, confidence,
  uncertainty, limitations, source definitions, and perturbation sensitivity.
- Drag-and-keyboard landmark correction with undo and reset.
- Optional `x.x / 10` experimental benchmark estimate for self-confirmed adult
  men, with a 90% range and every standardized input, coefficient,
  contribution, and exclusion reason visible.
- Reversible presentation experiments plus universal, non-personalized links
  to professional safety education.
- Opt-in AES-GCM encrypted local history, per-record deletion, delete-all,
  encrypted JSON export, readable JSON export, and print-to-PDF reports.
- Offline reload and cached inference assets after their first use.

## Accuracy means evidence

MirrorMetric does not claim parity with FaceIQ Labs or Areum. FaceIQ does not
publish a reproducible score benchmark, and MirrorMetric remains a 2D
front-view tool rather than a guided 3D scan. This project defines accuracy as:

1. landmark localization error;
2. capture rejection behavior;
3. measurement repeatability;
4. uncertainty and landmark sensitivity; and
5. transparent manual correction.

The repository includes WFLW/300W annotation adapters and NME, AUC,
failure-rate, subset, and regression-gate tooling. Restricted images are never
redistributed. The current report clearly distinguishes the passing synthetic
contract fixture from the participant and dataset evidence still required.

The separate `tools/attractiveness/` pipeline accepts locally obtained
SCUT-FBP5500 86-point annotations and ratings, maps 19 named SCUT anchors to
MediaPipe anchors, extracts 13 shared measurements, and trains a pooled
race-neutral ridge model with fixed-seed nested five-fold validation. It
publishes Pearson, MAE, RMSE, the 90% absolute-error quantile, and Asian-male
and Caucasian-male subset MAE. Restricted source data is never committed.

No SCUT-derived production model pack is bundled because redistribution rights
have not been confirmed. The application therefore withholds the optional
score while continuing to show raw measurements. A future public pack must
pass the documented statistical gates, carry a separate license notice, and
be pinned by SHA-256.

## Run locally

Requirements: Node.js 22+ and pnpm 11+.

```bash
pnpm install
pnpm dev
```

Release checks:

```bash
pnpm check
pnpm test:e2e
pnpm benchmark
```

The official landmark model and WebAssembly files are version-pinned,
self-hosted, and listed in `checksums.txt`. The initial JavaScript stays below
150 KB gzip; the inference worker loads only when analysis begins, and the
optional score model loads only after score opt-in.

## Documentation

- [Accuracy charter](docs/ACCURACY.md)
- [Benchmark report](docs/BENCHMARK_REPORT.md)
- [Measurement catalogue](docs/MEASUREMENTS.md)
- [Score methodology](docs/SCORE_METHODOLOGY.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Threat model](docs/THREAT_MODEL.md)
- [Privacy statement](docs/PRIVACY.md)
- [Limitations](docs/LIMITATIONS.md)
- [Accessibility verification](docs/ACCESSIBILITY.md)
- [Model and data licenses](docs/MODEL_DATA_LICENSES.md)
- [Roadmap](docs/ROADMAP.md)
- [Release notes](docs/RELEASE_NOTES.md)

## Safety boundary

MirrorMetric is adult-only and must not be used for identity, employment,
insurance, education, credit, housing, law enforcement, medical decisions,
covert surveillance, or analysis of minors. Side-profile analysis, skin or
health diagnosis, generative simulations, celebrity ranking, procedural
recommendations, and cloud sync are intentionally outside this beta.

## License

MirrorMetric source is MIT licensed. Third-party runtime/model components keep
their own licenses. SCUT data and derived packs are not relicensed as MIT; see
[docs/MODEL_DATA_LICENSES.md](docs/MODEL_DATA_LICENSES.md).
