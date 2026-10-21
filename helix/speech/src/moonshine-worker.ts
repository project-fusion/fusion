/**
 * The worker that runs Moonshine, so recognition never blocks the page.
 *
 * **It loads one of two builds of the same module.** A cross-origin isolated
 * worker can use threads, and takes the threaded build that
 * `@moonshine-ai/moonshine-wasm` publishes. Anywhere else it takes the
 * single-thread build this package carries, which needs no
 * `SharedArrayBuffer`. Both run the same JavaScript layer.
 *
 * **The build bundles this file into `dist/worker`, with both modules beside
 * it**, so the folder runs as it is served and no app's bundler has to follow
 * a worker, an Emscripten module, or its Node branches.
 */
import {
  AssetDownloader,
  loadMoonshineModule,
  ModelArch,
  type Stream,
  Transcriber,
} from '@moonshine-ai/moonshine-wasm'
import { MODEL_RATE } from './audio.js'
import type { FromWorker, MoonshineModel, ToWorker } from './protocol.js'

/** The worker's global scope, which the DOM library this package compiles against does not describe. */
const scope = globalThis as unknown as {
  crossOriginIsolated?: boolean
  onmessage: ((event: { data: ToWorker }) => void) | null
  postMessage(message: FromWorker): void
}

const ARCHES: Record<MoonshineModel, ModelArch> = {
  medium: ModelArch.MediumStreaming,
  small: ModelArch.SmallStreaming,
  tiny: ModelArch.TinyStreaming,
}

/** Seconds between transcription passes. Moonshine's default is half a second, which reads as lag in a field. */
const UPDATE_INTERVAL = 0.25

/* The two builds sit beside this file in `dist/worker`. The URLs are built
   from a variable so that a bundler leaves the folder as it is served. */
const here = import.meta.url

const loadModule = async (): Promise<void> => {
  const build = scope.crossOriginIsolated ? 'threaded' : 'single-thread'
  const script = new URL(`./${build}/moonshine.mjs`, here).href
  const binary = new URL(`./${build}/moonshine.wasm`, here).href
  const imported = (await import(/* @vite-ignore */ /* webpackIgnore: true */ script)) as {
    default: NonNullable<NonNullable<Parameters<typeof loadMoonshineModule>[0]>['factory']>
  }
  await loadMoonshineModule({ factory: imported.default, locateFile: () => binary })
}

let transcriber: Promise<Transcriber> | undefined
const streams = new Map<number, Stream>()

/* Messages are handled one at a time, in order: audio that arrives while the
   model loads waits for it, and a stop always follows its own audio. */
let queue: Promise<void> = Promise.resolve()

const load = (message: Extract<ToWorker, { type: 'load' }>): Promise<Transcriber> => {
  transcriber ??= (async () => {
    await loadModule()
    const onProgress = (loaded: number, total: number | undefined): void => {
      if (total) {
        scope.postMessage({ fraction: loaded / total, type: 'progress' })
      }
    }
    return Transcriber.load({
      ...(message.models
        ? { downloader: new AssetDownloader({ baseUrl: message.models, onProgress }) }
        : {}),
      language: 'en',
      modelArch: ARCHES[message.model],
      onProgress,
    })
  })()
  return transcriber
}

const handle = async (message: ToWorker): Promise<void> => {
  switch (message.type) {
    case 'load': {
      try {
        await load(message)
        scope.postMessage({ type: 'loaded' })
      } catch (error) {
        transcriber = undefined
        scope.postMessage({ message: String((error as Error).message ?? error), type: 'failed' })
      }
      return
    }
    case 'start': {
      const ready = await transcriber
      if (!ready) {
        scope.postMessage({ id: message.id, message: 'The model is not loaded.', type: 'error' })
        return
      }
      const stream = ready.createStream({ updateInterval: UPDATE_INTERVAL })
      stream.addListener({
        onError: (event) => {
          scope.postMessage({ id: message.id, message: String(event.error), type: 'error' })
        },
        onLineCompleted: (event) => {
          scope.postMessage({ id: message.id, text: event.line.text, type: 'final' })
        },
        onLineTextChanged: (event) => {
          scope.postMessage({ id: message.id, text: event.line.text, type: 'partial' })
        },
      })
      stream.start()
      streams.set(message.id, stream)
      return
    }
    case 'audio': {
      const stream = streams.get(message.id)
      stream?.addAudio(message.samples, MODEL_RATE)
      stream?.transcribe()
      return
    }
    case 'stop': {
      const stream = streams.get(message.id)
      streams.delete(message.id)
      /* Stopping flushes the line being spoken as a final one. */
      stream?.stop()
      stream?.close()
      scope.postMessage({ id: message.id, type: 'stopped' })
      return
    }
  }
}

scope.onmessage = (event) => {
  const message = event.data
  queue = queue.then(() =>
    handle(message).catch((error: unknown) => {
      if ('id' in message) {
        scope.postMessage({ id: message.id, message: String(error), type: 'error' })
      }
    }),
  )
}
