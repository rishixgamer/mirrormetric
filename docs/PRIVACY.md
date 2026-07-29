# Privacy statement

MirrorMetric has no account, analytics tracker, payment flow, ad network,
application database, photo-upload endpoint, or research telemetry.

## Photo processing

The browser decodes the selected JPEG, PNG, or WebP into pixels. File metadata
is not copied into the analysis contract. Pixels move to a same-origin browser
worker as an `ImageBitmap`; the worker closes it after inference. The photo and
landmarks are not included in model, WebAssembly, HTML, or asset requests.

The production content-security policy allows connections only to the same
origin. The pinned model and runtime are self-hosted. MirrorMetric does not
enable third-party analytics or MediaPipe network telemetry.

## Memory and storage

Source photos and editor object URLs exist only in the active tab and are not
saved to history. Closing or refreshing the tab removes the active analysis
photo.

History is off by default. On explicit save, the result—without source
photos—is encrypted in IndexedDB using a passphrase-derived AES-GCM key. The
passphrase and key are never persisted. Record ID and date remain visible to
the local database index; result contents remain inside the envelope.

## Exports and deletion

Users can:

- delete one local record;
- delete every local record;
- export an encrypted JSON archive;
- export one readable JSON result; and
- print a result to a local PDF.

Browser “clear site data” also removes the history and offline cache. Downloaded
exports are controlled by the operating system and are not deleted by the app.

## Limits

Local processing does not protect against someone who can access an unlocked
device, browser profile, screen, clipboard, download folder, passphrase, or
malicious browser extension. See [THREAT_MODEL.md](THREAT_MODEL.md).
