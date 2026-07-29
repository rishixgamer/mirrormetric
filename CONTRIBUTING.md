# Contributing

MirrorMetric welcomes work that makes facial measurement more transparent,
private, reproducible, and cautious.

## Before opening a change

1. Run `pnpm check`.
2. Run `pnpm test:e2e` for UI, privacy, storage, or offline changes.
3. Add deterministic tests for every formula, gate, score component, guidance
   rule, encryption change, and migration.
4. Document the formula source, anchors, limitations, and sensitivity of every
   measurement.
5. Keep model and runtime versions pinned and update `checksums.txt`.
6. Do not add medical, diagnostic, objective-beauty, identity, gender, or
   ethnicity claims.
7. Do not add a network path for photos or landmarks.

## Fixtures and datasets

Repository UI fixtures must be synthetic. Do not commit identifiable facial
photos or facial data to issues, pull requests, test results, or traces.
WFLW, 300W, and other benchmarks are accessed locally under their own terms;
only adapters, aggregate results, and lawful metadata belong here.

## Measurement changes

A candidate measurement needs a stable ID, category, unit, formula, anchor
indices, source definition, limitations, sensitivity label, perturbation test,
and deterministic fixture result. Promotion from “candidate” requires the
published repeatability study.

## Security and privacy changes

Changes to CSP, storage, crypto, model URLs, service workers, exports, or
network behavior require a threat-model update and a browser-network review.
Use GitHub’s private security-advisory flow for vulnerabilities.
