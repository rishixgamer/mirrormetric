# Experimental 0–10 score methodology

The optional score is subordinate to the 18 raw measurements. It appears only
after explicit opt-in and adult-man confirmation. MirrorMetric does not infer
sex, gender, age, ethnicity, or identity from a photo.

## Claim boundary

The public path is labeled **experimental geometry balance score**. It
compares 13 inputs with broad project-defined bands and has no attractiveness
training labels. It is not a validated attractiveness rating, percentile,
objective standard, demographic inference, preference prediction, or advice.

A separately labeled SCUT ridge path remains release-gated. SCUT provides
aggregate volunteer ratings on a 1–5 scale; it does not provide a
U.S.-women-ages-18–21 audience segment.

SCUT's subject composition and rating protocol are not equivalent to the
adult-only application audience. Neither the fallback nor a 0–10 conversion
corrects that mismatch.

## Inputs and arithmetic

Both paths require `jaw-cheek`, `eye-spacing`, `left-eye-face`,
`right-eye-face`, `eye-symmetry`, `mean-canthal-tilt`,
`canthal-symmetry`, `brow-eye-symmetry`, `nose-face`, `mouth-nose`,
`mouth-face`, `lip-aperture`, and `jaw-side-symmetry`.

The public fallback computes a soft fit for every broad band:

```text
fit_i = 1                                      when value is inside the band
fit_i = exp(-2.5 × distance_to_band / width)   otherwise
score = round(10 × Σ(weight_i × fit_i) / Σ(weight_i), 1)
```

The input-sensitivity range evaluates each component across its measurement
interval expanded by the published anchor-perturbation delta. Every target
band, weight, fit, contribution, and exclusion reason is visible.

A future release-eligible SCUT pack uses:

```text
standardized_i = (value_i - training_mean_i) / training_sd_i
contribution_i = coefficient_i × standardized_i
raw = clamp(intercept + Σ contribution_i, 1, 5)
score = round(((raw - 1) / 4) × 10, 1)
```

That path exposes every value, mean, standard deviation, standardized value,
coefficient, contribution, and inclusion reason.

## Withholding and uncertainty

The score is withheld when a required measurement is missing or non-finite, or
a required precision-mode measurement is unstable. When the SCUT pack is
absent, invalid, or fails its checksum, MirrorMetric uses the geometry fallback
instead of fabricating benchmark coefficients.

Only a release-eligible SCUT result uses a 90% displayed range combining the
held-out 90th-percentile absolute residual with propagated measurement
uncertainty. The public fallback labels its result **Input-sensitivity range**;
it is not a calibrated confidence interval.

## Training and release control

`tools/attractiveness/train.mjs` normalizes SCUT's 86 points for translation,
cheek width, and eye-line roll, then maps named SCUT anchors to corresponding
MediaPipe anchors. Regularization is selected through fixed-seed nested
five-fold validation.

A pack is release-eligible only when pooled Pearson correlation is at least
`0.60`, MAE is at most `0.45`, RMSE is at most `0.60`, and Asian-male and
Caucasian-male MAE are each at most `1.5×` pooled MAE.

The first real fixed-seed run used 2,749 male records after excluding one
malformed landmark file. It produced Pearson `0.469799`, MAE `0.444885`, RMSE
`0.573354`, 90% absolute-error quantile `0.973665`, Asian-male MAE `0.446328`,
and Caucasian-male MAE `0.441032`. It therefore failed the Pearson gate and is
not distributed as a preference model.

Statistical eligibility does not grant redistribution rights. The runtime
additionally requires a versioned manifest, confirmed redistribution flag,
same-origin loading, and a build-pinned SHA-256 digest. Model changes require a
new version, validation report, checksum, license review, deterministic test,
and release note.

## Legacy records

Schema-one goal-similarity results remain readable as **Legacy goal
similarity**. They are preserved exactly and never recomputed with this model.
