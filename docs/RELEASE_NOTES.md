# `v1.0.0-beta.1` release notes

MirrorMetric’s first public beta replaces the eight-measurement prototype with
an evidence-first, adult-only product.

## Added

- Eight dedicated product and policy routes.
- One-photo quick and three-photo precision analysis.
- Strict photo, face-count, pose, framing, and expression rejection.
- 18 versioned candidate measurements and perturbation sensitivity.
- Confidence, uncertainty, formulas, anchors, sources, and limitations.
- Accessible manual landmark correction.
- Optional transparent style-goal similarity.
- Reversible experiments and universal professional-safety education.
- Passphrase-encrypted local history, deletion, JSON, encrypted archive, and
  print-to-PDF.
- Lazy inference worker, self-hosted pinned assets, checksums, offline cache,
  security headers, sitemap, robots, structured data, and social card.
- Unit, desktop/mobile browser, WCAG, offline, benchmark, and build gates.
- Public benchmark, threat, privacy, score, limitation, and license documents.

## Evidence status

All automated release fixtures pass, but no real-person landmark or
repeatability baseline is claimed. The beta label remains until the public
validation protocol is completed.

## Compatibility

Primary target: current Chrome, Edge, Firefox, Safari, iOS Safari, and Android
Chrome. Automated browser journeys run on desktop and phone Chromium, desktop
Firefox, desktop WebKit, and iOS WebKit. Offline reload is exercised in
Chromium and Firefox; Playwright's WebKit offline emulation is skipped because
it fails inside the test browser, while the remaining Safari/WebKit journeys
stay required.
