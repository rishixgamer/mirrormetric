# Local benchmark adapter

This directory contains the public metric contract and annotation adapters.
It never downloads or redistributes dataset images.

1. Obtain WFLW or 300W under its own terms.
2. Convert annotations with `adapters.mjs`.
3. Run the pinned MirrorMetric detector over the images locally and produce a
   combined JSON document matching `fixtures/synthetic-predictions.json`.
4. Run `node tools/benchmark/evaluate.mjs predictions.json --output report.json`.
5. For later releases, add
   `--baseline docs/benchmark/v1.0.0-beta.1.json` to enforce the 5% gate.

NME is normalized by the distance supplied per sample. WFLW reporting should
use interocular normalization and include its difficult-condition attributes.
300W reporting should state the chosen interocular or bounding-box convention.
