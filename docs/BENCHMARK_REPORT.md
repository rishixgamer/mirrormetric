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

The official SCUT-FBP5500 v2 archive was used locally under its
non-commercial-research terms. Images, ratings, and landmark annotations are
not committed. The adapter read the official `All_labels.txt` and binary
86-point landmark files, selected the male subsets by their `AM`/`CM` prefixes,
and deterministically excluded the malformed four-byte `CM152.pts` record.

Fixed-seed (`20260729`) nested five-fold results:

| Result | Value |
| --- | ---: |
| Samples | 2,749 |
| Pearson | 0.469799 |
| MAE | 0.444885 |
| RMSE | 0.573354 |
| 90% absolute-error quantile | 0.973665 |
| Asian-male MAE | 0.446328 |
| Caucasian-male MAE | 0.441032 |

MAE, RMSE, and subgroup-ratio gates pass; Pearson does not meet the required
`0.60`. No SCUT preference model is therefore bundled or claimed. The public
app uses the separately labeled `geometry-balance-1` fallback, whose bands and
weights are project-defined and have no attractiveness training labels.

## Context, not equivalence

Google’s Face Mesh V2 model card reports its own evaluation under Google’s
definitions and data. Those numbers provide context for the underlying model,
not a MirrorMetric result and not evidence for these 18 projected measurements:

- [MediaPipe Face Mesh V2 model card](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20MediaPipe%20Face%20Mesh%20V2.pdf)
- [WFLW project](https://wywu.github.io/projects/LAB/WFLW.html)
- [300W dataset](https://ibug.doc.ic.ac.uk/resources/300-W/)
