# Limitations

`v1.0.0-beta.1` is experimental.

- The detector estimates landmarks; it does not observe bone, soft-tissue
  depth, hairline, or anatomy directly.
- Measurements are 2D projections affected by yaw, pitch, roll, camera height,
  distance, focal length, lens correction, mirroring, crop, lighting,
  expression, hair, glasses, makeup, facial hair, and occlusion.
- A capture can pass gates and still contain wrong landmarks.
- Confidence is a project heuristic over capture quality, pose, framing,
  expression, repeatability, and sensitivity—not a calibrated probability.
- Manual correction can introduce user error.
- Precision mode estimates within-session variation from three captures; it
  does not establish day-to-day or camera-to-camera repeatability.
- The public optional score is a project-defined geometry-band fit, not an
  objective standard, validated attractiveness rating, or model of U.S. women
  ages 18–21.
- SCUT's rating audience is not segmented to the requested cohort, and its
  subject composition is not equivalent to the app's adult-only eligibility.
- Mapping SCUT's 86-point topology to MediaPipe anchors introduces
  cross-topology error in addition to photo and landmark error.
- A 0–10 conversion adds familiarity, not validation or precision.
- The broad fallback bands and weights are maintainer choices, not learned
  preferences or population norms.
- The first real SCUT ridge run missed the Pearson release gate (`0.470` versus
  `0.60` required), and no SCUT-derived preference pack is bundled.
- Guidance is not evidence that changing appearance improves wellbeing or any
  other outcome.
- Professional links are general education and never personalized treatment
  advice.
- Local encryption cannot recover a forgotten passphrase and cannot secure a
  compromised or already-unlocked device.
- WCAG automation cannot prove usability for every assistive technology.
- The real WFLW/300W detector baseline, SCUT model report, and participant
  study remain incomplete.

Do not use the product for medical, identity, employment, insurance, education,
credit, housing, law-enforcement, or other high-stakes decisions.
