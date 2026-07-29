# Experimental SCUT benchmark methodology

The optional score is subordinate to the 18 raw measurements. It appears only
after explicit score opt-in and confirmation that the subject is an adult man.
MirrorMetric does not infer sex, gender, age, ethnicity, or identity from a
photo.

## Claim boundary

The model is a pooled, race-neutral ridge regression trained on the
Asian-male and Caucasian-male subsets of SCUT-FBP5500. SCUT provides aggregate
volunteer ratings on a 1–5 scale; it does not provide a U.S.-women-ages-18–21
audience segment. The output is therefore labeled **experimental SCUT
benchmark estimate**. It is not a percentile, objective standard, demographic
inference, or advice.

SCUT's subject composition and rating protocol are not equivalent to the
adult-only application audience. That mismatch is a model limitation, not
something the 0–10 conversion corrects.

## Inputs and arithmetic

The model requires `jaw-cheek`, `eye-spacing`, `left-eye-face`,
`right-eye-face`, `eye-symmetry`, `mean-canthal-tilt`,
`canthal-symmetry`, `brow-eye-symmetry`, `nose-face`, `mouth-nose`,
`mouth-face`, `lip-aperture`, and `jaw-side-symmetry`.

```text
standardized_i = (value_i - training_mean_i) / training_sd_i
contribution_i = coefficient_i × standardized_i
raw = clamp(intercept + Σ contribution_i, 1, 5)
score = round(((raw - 1) / 4) × 10, 1)
```

The result exposes every value, mean, standard deviation, standardized value,
coefficient, contribution, and inclusion reason.

## Withholding and uncertainty

The score is withheld when the model is absent, its checksum fails, its
manifest or license is invalid, a required measurement is missing or
non-finite, or a required precision-mode measurement is unstable.

The 90% displayed range combines the held-out 90th-percentile absolute
residual with measurement uncertainty. Measurement uncertainty is propagated
through standardized ridge coefficients by root-sum-of-squares, then added to
the held-out residual quantile. Both raw endpoints are clamped to 1–5 before
the same 0–10 conversion.

## Training and release control

`tools/attractiveness/train.mjs` normalizes SCUT's 86 points for translation,
cheek width, and eye-line roll, then maps named SCUT anchors to corresponding
MediaPipe anchors. Regularization is selected through fixed-seed nested
five-fold validation.

A pack is release-eligible only when pooled Pearson correlation is at least
`0.60`, MAE is at most `0.45`, RMSE is at most `0.60`, and Asian-male and
Caucasian-male MAE are each at most `1.5×` pooled MAE.

Statistical eligibility does not grant redistribution rights. The runtime
additionally requires a versioned manifest, confirmed redistribution flag,
same-origin loading, and a build-pinned SHA-256 digest. Model changes require a
new version, validation report, checksum, license review, deterministic test,
and release note.

## Legacy records

Schema-one goal-similarity results remain readable as **Legacy goal
similarity**. They are preserved exactly and never recomputed with this model.
