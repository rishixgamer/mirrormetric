# Benchmark report — `v1.0.0-beta.1`

## Status

**No real-person landmark accuracy baseline is claimed in this release.**

The executable evaluation contract passes a synthetic two-sample fixture:

| Result | Value |
| --- | ---: |
| Samples | 2 |
| NME | 0.018548 |
| AUC through 0.10 | 0.814517 |
| Failure rate | 0% |

These values test metric arithmetic, subset routing, and the regression gate.
They do not measure MediaPipe, MirrorMetric, facial accuracy, demographic
performance, or real capture quality.

## Included evaluation capability

`tools/benchmark/` provides:

- a WFLW line parser for 98 point pairs, bounding box, six difficult-condition
  flags, and image path;
- a 300W `.pts` parser;
- a dataset-neutral prediction/ground-truth JSON contract;
- NME, cumulative-error AUC, failure rate, and tag-subset reporting; and
- a comparison gate that rejects more than 5% NME or failure-rate regression.

The tools read locally obtained annotations and predictions. They do not
download, commit, or redistribute images.

## Required real baseline

Before any landmark-accuracy claim, a maintainer must:

1. lawfully obtain the official WFLW test set and 300W test partitions;
2. publish the reviewed mapping between dataset labels and the model topology;
3. document normalization conventions and detection-failure handling;
4. run the exact tagged detector/model/checksums;
5. publish aggregate and difficult-condition results with software/hardware
   metadata; and
6. commit that report as the first real regression baseline.

Later releases may not worsen its aggregate NME or failure rate by more than 5%
without a documented review.

## Experimental score-model status

No SCUT-derived model result is claimed in this report. The repository contains
only an external-data adapter and deterministic synthetic training contract.
A future report must publish nested five-fold Pearson, MAE, RMSE, 90%
absolute-error quantile, Asian-male MAE, Caucasian-male MAE, selected
regularization, seed, provenance, license decision, and model-pack checksum.
The product fails closed until that report passes the published gates and
redistribution is confirmed.

## Context, not equivalence

Google’s Face Mesh V2 model card reports its own evaluation under Google’s
definitions and data. Those numbers provide context for the underlying model,
not a MirrorMetric result and not evidence for these 18 projected measurements:

- [MediaPipe Face Mesh V2 model card](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20MediaPipe%20Face%20Mesh%20V2.pdf)
- [WFLW project](https://wywu.github.io/projects/LAB/WFLW.html)
- [300W dataset](https://ibug.doc.ic.ac.uk/resources/300-W/)
