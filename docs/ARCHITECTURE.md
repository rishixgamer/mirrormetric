# Architecture

MirrorMetric is a static React/Vite application with a small edge worker for
security headers, SPA routing fallback, robots, and origin-correct sitemap
metadata. The worker has no photo endpoint, account system, analytics path, or
application database.

```text
camera/file
   │  decode to pixels (metadata discarded)
   ▼
quality cues
   │
   ▼
lazy browser worker ──► self-hosted MediaPipe model + WASM
   │
   ├── face count, blendshapes, transform matrix
   └── 478 landmarks + pose
   │
   ▼
strict capture assessment ──► reject or accept
   │
   ▼
18 pure measurement definitions + anchor perturbation
   │
   ├── raw result cards and correction editor
   ├── three-capture median/stability aggregation
   ├── optional lazy checksum-verified benchmark ridge score
   └── opt-in encrypted IndexedDB history / local exports
```

## Public contracts

`src/domain/contracts.ts` versions detector, capture, measurement-catalogue,
analysis-session, attractiveness-score, model-manifest, legacy-goal-score,
guidance, encrypted-envelope, and encrypted
export shapes. Schema migrations are fail-closed; unknown future versions are
not silently interpreted.

Schema version 2 preserves schema-one goal scores as read-only legacy fields.
New sessions contain no goal profile. Corrections recompute a benchmark score
only from the exact manifest stored with the active result.

## Inference boundary

The `@mediapipe/tasks-vision` adapter runs in `src/workers/face-worker.ts`.
It requests two same-origin resources: the pinned task model and pinned
WebAssembly runtime. The production content-security policy limits connections
to the same origin. The source image is transferred as an `ImageBitmap`, never
serialized into a network request, and closed after inference.

## Optional score-model boundary

The 13-feature model is absent from the initial JavaScript. After score opt-in,
the browser performs a same-origin GET, verifies its bytes against
`VITE_ATTRACTIVENESS_MODEL_SHA256`, validates feature order, provenance,
license, and release gates, then computes locally. The service worker may cache
the verified response for offline reuse. Missing, invalid, unstable, or
unlicensed inputs produce a withheld result.

## Local storage

No record is written until the user submits a passphrase. Sessions exclude
source photos and are encrypted using:

- PBKDF2-HMAC-SHA-256, 600,000 iterations, random 16-byte salt;
- AES-256-GCM with a random 12-byte IV; and
- a key that is never persisted.

IndexedDB contains only opaque envelopes plus record ID/date metadata. Losing
the passphrase makes the record unrecoverable.

## Offline and deployment

The service worker precaches only the application shell. Versioned JavaScript,
CSS, inference worker, landmark model, optional score model, and WASM are
cached on first request, keeping both engines lazy. Immutable assets receive
one-year cache headers. HTML,
robots, and sitemap responses receive a restrictive CSP, permissions policy,
referrer policy, frame denial, and content-type protection.

## Performance boundary

The release build keeps initial JavaScript under 150 KB gzip. MediaPipe stays
inside a separate worker bundle; the 3.6 MB model and runtime do not block the
landing page. Fonts are system fonts, so no third-party font request occurs.
