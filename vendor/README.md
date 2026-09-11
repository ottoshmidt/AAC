# Vendored files

Small JavaScript glue files needed by the in-app Piper voices (see
`js/piper.js`). They are kept here so the app works offline and has no build
step. The large binaries they load (WebAssembly, espeak-ng data, voice
models) are downloaded from pinned CDN URLs on first use and kept in the
browser's Cache Storage.

| File | Source | License |
|---|---|---|
| `onnxruntime-web/ort.wasm.bundle.min.mjs` | npm `onnxruntime-web@1.29.0`, `dist/` (source map reference removed) | MIT |
| `piper-wasm/piper_phonemize.js` | npm `@diffusionstudio/piper-wasm@1.0.0`, `build/` | MIT (glue); the `.wasm` it loads contains espeak-ng, GPL-3.0 |

To upgrade, replace the file and update the matching URLs and byte sizes in
`js/piper.js`, then bump `VOICE_CACHE` there.
