# @fusion.dev/helix-speech

Speech engines for Helix dictation that recognize in the page, on the device.
The first is Moonshine, an open speech model that runs in WebAssembly.

```sh
bun add @fusion.dev/helix @fusion.dev/helix-speech
```

A field with `voice` listens through the browser's recognizer by default. Some
browsers have none that works. Brave has no speech service, and its on-device
install never finishes. Register this engine and every field on the page
listens through Moonshine instead:

```js
import { registerSpeechEngine } from '@fusion.dev/helix-core'
import { moonshineSpeech } from '@fusion.dev/helix-speech'

registerSpeechEngine(moonshineSpeech())
```

Audio stays on the device, and no service is called. The first press
downloads the model, 51 MB for `tiny`, and the browser caches it. Call
`preload()` to download it before anyone presses.

## What it exports

| Import | What |
|---|---|
| `@fusion.dev/helix-speech` | `moonshineSpeech(options)`, and the types `MoonshineModel`, `MoonshineSpeech`, and `MoonshineSpeechOptions` |

| `moonshineSpeech` option | Default | What else it takes |
|---|---|---|
| `model` | `'tiny'` | `'small'`, a 165 MB download, or `'medium'`, 305 MB. Each is more accurate than the one before |
| `models` | The Moonshine CDN | A base URL, for an app that hosts the model files itself |
| `progress` | None | A function called with the download's progress, from 0 to 1 |

**It recognizes English.** Moonshine's streaming models are English only. A
field in another language ends listening with an error.

## How it runs

The engine captures the microphone in an audio worklet and sends the audio to
a worker, which runs the model and sends back each guess and each settled
phrase.

**The worker picks one of two builds.** A cross-origin isolated page can give
the worker threads, and the worker takes the threaded build that
`@moonshine-ai/moonshine-wasm` publishes. Any other page gets the
single-thread build this package carries in `dist/single-thread`. Moonshine
does not publish that build. `scripts/build-single-thread.sh` builds it from
Moonshine's and ONNX Runtime's sources, and the files are assets of a release
of this repository. `single-thread.json` names the release and pins the
versions and the digest of each file.

**A bundler has to follow the worker.** The engine starts it with
`new Worker(new URL('./moonshine-worker.js', import.meta.url))`, and the
worker finds its build the same way. Vite and webpack copy files named like
that.

## Working on it

```sh
bun run --filter @fusion.dev/helix-speech build
bun run --filter @fusion.dev/helix-speech test
```

The build downloads the single-thread files from the release into
`vendor/single-thread`, checks each against its digest, and copies it into
`dist`. While the repository is private, the download needs a token: the build
reads `GH_TOKEN`, or asks `gh` for yours.

To change the build, run `scripts/build-single-thread.sh`, publish its two
files as a new release, and put the release's tag and the digests the script
prints in `single-thread.json`.

MIT
