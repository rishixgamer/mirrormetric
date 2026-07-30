# SCUT male geometry training adapter

This directory contains the reproducible adapter for MirrorMetric's optional
experimental benchmark estimate. It intentionally contains no SCUT images,
landmark annotations, ratings, or derived production model.

Obtain
[SCUT-FBP5500](https://github.com/HCIILAB/SCUT-FBP5500-Database-Release)
directly from its maintainers and follow its non-commercial-research terms.
Use the release's `train_test_files/All_labels.txt` directly, or prepare a CSV
with `file,score` columns (an optional `subgroup` column may contain
`Asian male` or `Caucasian male`), plus the directory of matching 86-point
`.pts` files. Male files must retain their `AM` or `CM` prefix.

```sh
node tools/attractiveness/train.mjs \
  --landmarks /path/to/scut/landmarks \
  --ratings /path/to/scut/ratings.csv \
  --out /private/path/scut-male-geometry-v1.json \
  --dataset-version release \
  --seed 20260729
```

The adapter reads the official binary 86-point `.pts` files as well as text
fixtures. The pipeline normalizes translation, face width, and eye-line roll;
maps named SCUT anchors to their MediaPipe counterparts; computes the 13
published cross-topology measurements; chooses ridge regularization through
nested five-fold validation; and reports pooled and male-subset errors.
Malformed landmark records are excluded deterministically and listed in the
model provenance rather than being silently imputed.

It refuses to write a model when Pearson is below `0.60`, MAE is above `0.45`,
RMSE is above `0.60`, or either subgroup MAE is above `1.5×` pooled MAE. Output
is tagged `redistributionConfirmed: false` unless the maintainer explicitly
passes `--redistribution-confirmed true`. Do not place an output in `public/`
until independent license review confirms redistribution rights and CI pins
its SHA-256 digest.
