import type { SpeechEngine, SpeechListener, SpeechSession } from '@fusion.dev/helix-core'
import { CAPTURE_WORKLET, loudness, MODEL_RATE, resample } from './audio.js'
import type { FromWorker, MoonshineModel, ToWorker } from './protocol.js'

/** How a Moonshine engine loads its model. */
export interface MoonshineSpeechOptions {
  /**
   * The model to recognize with. `tiny` is a 51 MB download, `small` 165 MB
   * and `medium` 305 MB, each more accurate than the one before.
   */
  model?: MoonshineModel
  /**
   * A base URL to load the model files from, for an app that hosts them
   * itself. The engine loads them from the Moonshine CDN without one.
   */
  models?: string
  /** Called as the model downloads, from 0 to 1 across all its files. */
  progress?(fraction: number): void
  /**
   * The URL of the folder this package's `dist/worker` is served from. The
   * engine uses the copy beside it without one, which works where the
   * package's files are served as they are. A bundled app copies the folder
   * to its static files and names it here.
   */
  worker?: string | URL
}

/** A speech engine that recognizes English on the device with Moonshine. */
export interface MoonshineSpeech extends SpeechEngine {
  /**
   * Downloads the model and starts the worker that runs it, so the first
   * press listens at once. Listening loads the model too, where this was not
   * called first.
   */
  preload(): Promise<void>
}

/** Seconds of audio the page collects before it sends them to the worker. */
const CHUNK = 0.05

/** Milliseconds between level reports, which the worklet would otherwise send every few. */
const LEVEL_INTERVAL = 50

/** The subtags Moonshine's streaming models recognize. */
const ENGLISH = /^en(-|$)/i

/**
 * Creates an engine that recognizes speech in the page with Moonshine, an
 * open speech model that runs in WebAssembly. Audio stays on the device, and
 * no service is called. Only the model files are downloaded, once, and the
 * browser caches them.
 *
 * **It recognizes English.** A field in another language ends listening with
 * an error.
 *
 * ```ts
 * import { registerSpeechEngine } from '@fusion.dev/helix-core'
 * import { moonshineSpeech } from '@fusion.dev/helix-speech'
 *
 * registerSpeechEngine(moonshineSpeech())
 * ```
 */
export const moonshineSpeech = (options: MoonshineSpeechOptions = {}): MoonshineSpeech => {
  let worker: Worker | undefined
  let loaded: Promise<void> | undefined
  let sessions = 0
  const listeners = new Map<number, SpeechListener>()

  const spawn = (): Worker => {
    if (worker) {
      return worker
    }
    /* Built from a string, so a bundler does not take the worker into its
       graph: Turbopack resolves `new URL(path, import.meta.url)` even through
       a variable. */
    const here = import.meta.url
    const folder = new URL(
      options.worker ?? `${here.slice(0, here.lastIndexOf('/') + 1)}worker/`,
      location.href,
    )
    const spawned = new Worker(new URL('moonshine-worker.js', folder), { type: 'module' })
    spawned.onmessage = (event: MessageEvent<FromWorker>) => {
      const message = event.data
      switch (message.type) {
        case 'progress':
          options.progress?.(message.fraction)
          return
        case 'partial':
          listeners.get(message.id)?.partial(message.text)
          return
        case 'final':
          listeners.get(message.id)?.final(message.text)
          return
        case 'error': {
          const listener = listeners.get(message.id)
          listeners.delete(message.id)
          listener?.end('error', message.message)
          return
        }
        case 'stopped': {
          const listener = listeners.get(message.id)
          listeners.delete(message.id)
          listener?.end('stopped')
          return
        }
        default:
          return
      }
    }
    worker = spawned
    return spawned
  }

  const send = (message: ToWorker, transfer: Transferable[] = []): void => {
    spawn().postMessage(message, transfer)
  }

  const preload = (): Promise<void> => {
    loaded ??= new Promise<void>((resolve, reject) => {
      const target = spawn()
      const settle = (event: MessageEvent<FromWorker>): void => {
        if (event.data.type === 'loaded') {
          target.removeEventListener('message', settle)
          resolve()
        } else if (event.data.type === 'failed') {
          target.removeEventListener('message', settle)
          loaded = undefined
          reject(new Error(event.data.message))
        }
      }
      target.addEventListener('message', settle)
      send({
        model: options.model ?? 'tiny',
        type: 'load',
        ...(options.models ? { models: options.models } : {}),
      })
    })
    return loaded
  }

  const listen = ({
    lang,
    listener,
  }: {
    lang: string
    listener: SpeechListener
  }): SpeechSession => {
    if (!ENGLISH.test(lang)) {
      queueMicrotask(() =>
        listener.end('error', `Moonshine recognizes English only, and the field is in ${lang}.`),
      )
      return { stop: () => {} }
    }
    sessions += 1
    const id = sessions
    listeners.set(id, listener)
    let stopped = false
    let release = (): void => {}

    const fail = (error: unknown): void => {
      release()
      if (listeners.delete(id)) {
        listener.end('error', error instanceof Error ? error.message : String(error))
      }
    }

    /* The microphone opens while the model loads. The worker handles its
       messages in order, so what is said during a download waits for the
       model, and nothing said after the press is lost. */
    preload().catch(fail)
    send({ id, type: 'start' })
    void (async () => {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      })
      /* Stopped, or failed while the microphone was asked for. */
      if (stopped || !listeners.has(id)) {
        for (const track of stream.getTracks()) {
          track.stop()
        }
        return
      }
      const context = new AudioContext()
      if (context.state === 'suspended') {
        await context.resume()
      }
      const url = URL.createObjectURL(new Blob([CAPTURE_WORKLET], { type: 'text/javascript' }))
      try {
        await context.audioWorklet.addModule(url)
      } finally {
        URL.revokeObjectURL(url)
      }
      const source = context.createMediaStreamSource(stream)
      const node = new AudioWorkletNode(context, 'helix-speech-capture')
      const size = Math.round(CHUNK * MODEL_RATE)
      let chunk = new Float32Array(size)
      let filled = 0
      let loudest = 0
      let reported = 0
      node.port.onmessage = (event: MessageEvent<Float32Array>) => {
        if (stopped) {
          return
        }
        const block = resample(event.data, context.sampleRate)
        loudest = Math.max(loudest, loudness(block))
        if (event.timeStamp - reported >= LEVEL_INTERVAL) {
          listener.level?.(loudest)
          loudest = 0
          reported = event.timeStamp
        }
        let from = 0
        while (from < block.length) {
          const taken = Math.min(size - filled, block.length - from)
          chunk.set(block.subarray(from, from + taken), filled)
          filled += taken
          from += taken
          if (filled === size) {
            send({ id, samples: chunk, type: 'audio' }, [chunk.buffer])
            chunk = new Float32Array(size)
            filled = 0
          }
        }
      }
      source.connect(node)
      release = () => {
        node.port.onmessage = null
        source.disconnect()
        node.disconnect()
        for (const track of stream.getTracks()) {
          track.stop()
        }
        void context.close()
        if (filled > 0) {
          send({ id, samples: chunk.slice(0, filled), type: 'audio' })
          filled = 0
        }
      }
      if (stopped || !listeners.has(id)) {
        release()
      }
    })().catch(fail)

    return {
      stop: () => {
        if (stopped) {
          return
        }
        stopped = true
        release()
        if (worker) {
          send({ id, type: 'stop' })
        } else {
          listeners.delete(id)
          listener.end('stopped')
        }
      },
    }
  }

  return {
    available: () =>
      typeof WebAssembly === 'object' &&
      typeof Worker === 'function' &&
      typeof AudioWorkletNode === 'function' &&
      typeof navigator === 'object' &&
      typeof navigator.mediaDevices?.getUserMedia === 'function',
    listen,
    preload,
  }
}
