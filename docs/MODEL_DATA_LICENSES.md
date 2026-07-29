# Model, runtime, and data license inventory

## Distributed in this repository/build

| Component | Pinned version | License/status | Location |
| --- | --- | --- | --- |
| MirrorMetric source | `1.0.0-beta.1` | MIT | `LICENSE` |
| `@mediapipe/tasks-vision` | `1.0.0` | Apache-2.0 | package lock / upstream license |
| MediaPipe Face Landmarker task bundle | float16, upstream path `.../float16/1/` | Distributed as an official MediaPipe asset; upstream MediaPipe project is Apache-2.0 | `public/models/face_landmarker.task` |
| MediaPipe WebAssembly runtime | package `1.0.0` | Apache-2.0 | copied from the pinned package at build |
| React / React DOM | `19.2.8` | MIT | package lock |
| Vite | `8.1.5` | MIT | development/build only |
| Vitest | `4.1.10` | MIT | test only |
| Playwright | `1.55.1` | Apache-2.0 | test only |
| Axe Core | `4.10.3` | MPL-2.0 | test only |
| Optional attractiveness model pack | not bundled | Withheld pending redistribution confirmation | expected at `public/models/attractiveness/scut-male-geometry-v1.json` |

Review upstream notices before redistribution:

- [MediaPipe license](https://github.com/google-ai-edge/mediapipe/blob/master/LICENSE)
- [MediaPipe Face Landmarker documentation](https://developers.google.com/mediapipe/solutions/vision/face_landmarker/web_js)

Pinned binary hashes live in `checksums.txt` and are verified by `pnpm check`.

## Evaluation data not distributed

| Dataset | Use | Repository policy |
| --- | --- | --- |
| WFLW | 98-point landmark test set and difficult-condition subsets | Obtain from the official project under its terms; never commit images |
| 300W | Landmark evaluation compatibility | Obtain from the official iBUG page under its terms; never commit images |
| SCUT-FBP5500 | 86-point male-subset training and 1–5 ratings | Obtain from the official HCIILAB release; non-commercial research restriction; never commit images, annotations, ratings, or an unapproved derived pack |

MirrorMetric includes parsers and aggregate metrics only. Dataset access rights
do not flow from the MIT license.

The application and training adapter remain MIT. A SCUT-derived pack does not
become MIT merely because it is JSON. CI accepts a public pack only when its
manifest records passing benchmark gates and confirmed redistribution, and
when `VITE_ATTRACTIVENESS_MODEL_SHA256` exactly pins its bytes. Until then the
runtime fails closed.

## Generated assets

`public/og.png` is a generated, non-identifiable social card created for this
project. Automated UI fixtures are generated as pixel patterns at test runtime
and contain no person.
