# Goal-similarity methodology

Goal similarity is optional and subordinate to raw measurements. The user
chooses balanced, angular, soft, or androgynous. MirrorMetric never infers
gender, ethnicity, identity, health, personality, or attractiveness.

## Component function

Each versioned profile lists a minimum, maximum, weight, and plain-language
rationale for every component.

- A stable value inside its visible band receives component similarity 100.
- Outside the band, similarity decays continuously as
  `100 × exp(-2.5 × distance / band width)`.
- Missing and unstable measurements are excluded.
- Included components use a visible weighted mean.
- Input confidence produces a displayed score uncertainty range, bounded to
  0–100.

All profile manifests live in `src/lib/scoring.ts`, and the result records every
component value, band, weight, similarity, inclusion decision, and reason.

## Subjective assumptions

The bands are broad project hypotheses about presentation styles. They are not
population distributions, percentiles, clinical targets, or evidence that a
person should change. “Balanced,” “angular,” “soft,” and “androgynous” are
labels for inspectable bundles—not statements about identity.

## Change control

The current model version is `goal-similarity-1`. Any changed band, weight,
transform, label, or uncertainty rule requires a new version, release note, and
component tests. The score cannot include an unstable precision measurement.
