# Measurement catalogue `1.0.0-beta.1`

All 18 entries are **candidate**, front-view, projected image measurements.
None is an anatomical caliper measurement, diagnosis, attractiveness
assessment, or validated population norm.

| ID | Display name | Unit | Formula summary |
| --- | --- | --- | --- |
| `face-aspect` | Face width / mesh height | ratio | cheek width ÷ mesh height |
| `temple-face` | Temple / cheek width | ratio | temple width ÷ cheek width |
| `jaw-cheek` | Jaw / cheek width | ratio | jaw width ÷ cheek width |
| `midface-height` | Midface / mesh height | ratio | eye line to nose base ÷ mesh height |
| `lower-face-height` | Lower face / mesh height | ratio | nose base to chin ÷ mesh height |
| `eye-spacing` | Eye spacing / mean eye width | ratio | inner gap ÷ mean eye width |
| `left-eye-face` | Left eye / face width | ratio | rendered left eye width ÷ cheek width |
| `right-eye-face` | Right eye / face width | ratio | rendered right eye width ÷ cheek width |
| `eye-symmetry` | Eye-width symmetry | percent | 100 − relative width difference |
| `mean-canthal-tilt` | Mean eye-corner tilt | degrees | mean outer-to-inner corner angle |
| `canthal-symmetry` | Eye-tilt symmetry | percent | 100 − relative tilt difference |
| `brow-eye-symmetry` | Brow-to-eye symmetry | percent | 100 − relative vertical-distance difference |
| `nose-face` | Nose / face width | ratio | outer-nose width ÷ cheek width |
| `nose-length` | Nose length / mesh height | ratio | bridge-to-base length ÷ mesh height |
| `mouth-nose` | Mouth / nose width | ratio | mouth width ÷ nose width |
| `mouth-face` | Mouth / face width | ratio | mouth width ÷ cheek width |
| `lip-aperture` | Lip aperture / mouth width | ratio | vertical lip aperture ÷ mouth width |
| `jaw-side-symmetry` | Jaw-side symmetry | percent | 100 − relative jaw-to-chin difference |

## Publication policy

The application publishes each candidate because its formula, anchors,
limitations, confidence, uncertainty, correction path, and deterministic test
are visible. “Candidate” is not the same as repeatability-validated.

Promotion requires a consenting-participant study across repeated sessions and
multiple camera families. Per metric, the report must publish within-subject
CV, intraclass correlation, median absolute deviation, 95% limits of agreement,
capture-failure rate, and uncertainty. Metrics that fail the preregistered gate
remain experimental or are removed.

## Sensitivity

For each accepted capture, every influential anchor moves independently by
±0.0015 normalized image units on both axes. The maximum finite change is
stored as `sensitivityDelta`, disclosed in the result, and used as a lower
bound on the uncertainty margin. This local perturbation does not substitute
for independent annotation or repeatability evidence.

## Left and right

Labels refer to rendered image sides, not anatomical laterality. Mirroring,
yaw, lens distortion, expression, hair, glasses, facial hair, makeup,
occlusion, and inferred contour points can change results.
