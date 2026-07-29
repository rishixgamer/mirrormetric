# Threat model

## Protected assets

- source photos and decoded pixels;
- facial landmarks and measurements;
- local-history passphrases and derived keys;
- encrypted records and exports;
- model/runtime integrity; and
- the truthfulness of capture and uncertainty status.

## Trust boundaries

The user trusts their device, operating system, browser, and the deployed
MirrorMetric origin. The browser worker is same-origin but separated from the
UI thread. IndexedDB and the Cache API are local browser stores. The production
edge worker serves static assets and headers but receives no application
payload.

## Addressed threats

| Threat | Control |
| --- | --- |
| Photo upload or telemetry | No endpoint; same-origin `connect-src`; browser network tests |
| Third-party runtime substitution | Pinned local model/WASM plus SHA-256 manifest |
| Unsupported capture presented confidently | Fail-closed quality, face-count, pose, framing, and expression gates |
| Hidden score assumptions | Versioned features, normalization, coefficients, contributions, exclusions, validation, provenance, and uncertainty |
| Score loaded without consent | Separate adult-man fieldset; lazy load only after explicit score opt-in |
| Score-model substitution | Same-origin GET, build-pinned SHA-256, strict manifest/release/license validation, fail-closed response |
| Facial data in score request | Static GET without a request body; automated network assertions |
| Restricted training data committed | External-data adapter, no SCUT assets, license and model-pack CI gate |
| Local history read from raw IndexedDB | AES-256-GCM; PBKDF2-SHA-256 at 600,000 iterations |
| Persisted decryption key | Passphrase/key held only in memory |
| Clickjacking or embedding | CSP `frame-ancestors 'none'` and `X-Frame-Options: DENY` |
| Cross-origin asset exfiltration | CSP, same-origin resource policy, no remote fonts/CDNs |
| Stale vulnerable assets | Versioned cache name, checksums, dependency and smoke gates |
| Identifiable repository fixtures | Synthetic browser-generated UI fixtures only |

## Residual threats

- weak or reused passphrases;
- an unlocked or compromised device/browser/extension;
- screen recording, screenshots, shoulder surfing, or clipboard monitoring;
- denial of service or a compromised production origin;
- model bias and undetected landmark error;
- misleading interpretation of a subjective 0–10 benchmark estimate;
- SCUT cohort, subject-age, rater, and topology mismatch;
- maliciously altered source builds outside the official tagged deployment;
- exported files copied by other local software; and
- offline caches persisting until site data is cleared.

## Out of scope

MirrorMetric does not defend against an attacker with operating-system control,
physical access to an unlocked device, or arbitrary code execution in the
browser profile. It is not an identity or liveness system.
