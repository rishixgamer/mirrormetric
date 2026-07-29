# Accuracy charter

## Claim boundary

FaceIQ Labs publishes neither its scoring implementation nor a reproducible
ground-truth benchmark. MirrorMetric therefore makes no score-parity claim.
Visual similarity between two products is not validation.

For this project, accuracy is a set of testable properties:

1. **Localization:** detected landmarks agree with independent labels.
2. **Rejection:** unsupported pose, blur, exposure, framing, expression, or
   face count fails before a measurement is published.
3. **Repeatability:** repeated accepted captures produce stable ratios and
   angles.
4. **Sensitivity:** influential anchors are perturbed by ±0.15% of image
   dimensions and the largest output change is disclosed.
5. **Correction:** a user can inspect and correct the anchors that drive a
   result.
6. **Robustness:** error and failure intervals are reported by difficult
   condition, camera family, and sufficiently powered participant subgroup.

## Current beta gates

The product gate is conservative:

- shortest image side: at least 720 px;
- brightness: 55–210 on an 8-bit luminance scale;
- sharpness edge cue: at least 7;
- exactly one detected face;
- face-mesh height: 40–88% of the image;
- face center within 12% horizontal and 16% vertical of image center;
- yaw and pitch within ±7°, roll within ±5°;
- jaw-open blendshape no more than 0.18;
- mean blink cue no more than 0.35.

Precision mode requires three accepted captures. Ratios and percentages above
5% coefficient of variation, or angles above 1.5° sample standard deviation,
are labeled unstable and excluded from goal similarity.

## Evaluation protocol

The local harness accepts point predictions and ground truth without dataset
images. It reports:

- normalized mean error (NME);
- area under the cumulative-error curve through the declared failure threshold;
- failure rate; and
- WFLW difficult-condition subsets.

The first real dataset report becomes the frozen regression baseline. Later
releases fail automated review if aggregate NME or failure rate worsens by more
than 5%, unless maintainers publish an explicit review. See
[BENCHMARK_REPORT.md](BENCHMARK_REPORT.md).

## Evidence still required

`v1.0.0-beta.1` remains experimental because the repository does not contain:

- a completed WFLW/300W detector run under documented mapping conventions;
- repeated sessions from consenting adults;
- independent landmark annotation and inter-rater error;
- multiple camera-family testing;
- powered subgroup uncertainty; or
- evidence that the project-defined goal bands improve any real-world outcome.

A future non-experimental release must publish within-subject CV, intraclass
correlation, median absolute deviation, 95% limits of agreement, failure
intervals, camera-condition results, and subgroup sample sizes.

## Non-claims

No output is a diagnosis, treatment indication, attractiveness measurement,
population percentile, identity inference, prediction of outcome, or statement
of worth.
