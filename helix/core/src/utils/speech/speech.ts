/**
 * What a field listens through when a reader dictates into it.
 *
 * **An engine is an interface, so the browser's recognizer is one engine of
 * several.** Helix ships `browserSpeech`, on the Web Speech API, and an app
 * with recognizers of its own, a desktop shell with a local model or a
 * service with a streaming API, registers one with `registerSpeechEngine` for
 * every field on the page, or gives one field its own through `speechEngine`.
 */

/** What an engine tells a field as it listens. */
export interface SpeechListener {
  /** Listening stopped, because it was asked to, because the engine ended, or because of an error. */
  end(reason: 'ended' | 'error' | 'stopped', message?: string): void
  /** A phrase the engine has settled on. The guess before it is replaced by it. */
  final(text: string): void
  /** How loud the microphone is, from 0 to 1, with the spectrum's bands where the engine has them. */
  level?(level: number, bands?: readonly number[]): void
  /** The engine's guess at the phrase being spoken, which the next guess or `final` replaces. */
  partial(text: string): void
}

/** A listening an engine started, which the field stops. */
export interface SpeechSession {
  stop(): void
}

/** A speech recognizer a field can listen through. */
export interface SpeechEngine {
  /** Whether the engine can listen on this page now. A field draws no dictation button where it cannot. */
  available(): boolean
  /** Starts listening in a language, a BCP 47 tag such as `en-US`, telling `listener` what it hears. */
  listen(options: { lang: string; listener: SpeechListener }): SpeechSession
}

/** The parts of the Web Speech API this reads, which TypeScript's DOM types do not carry. */
interface RecognitionResult {
  0?: { transcript: string }
  isFinal: boolean
}

interface Recognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  onend: (() => void) | null
  onerror: ((event: { error: string }) => void) | null
  onresult: ((event: { resultIndex: number; results: ArrayLike<RecognitionResult> }) => void) | null
  start(): void
  stop(): void
}

type RecognitionConstructor = new () => Recognition

const recognizer = (): RecognitionConstructor | undefined => {
  const scope = globalThis as unknown as {
    SpeechRecognition?: RecognitionConstructor
    webkitSpeechRecognition?: RecognitionConstructor
  }
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition
}

/**
 * Reads the microphone's loudness for a level meter, from a stream of its own
 * the recognizer does not share, and returns what stops it. Nothing happens
 * where the page has no microphone or the reader refuses it.
 */
const meter = (report: (level: number, bands: readonly number[]) => void): (() => void) => {
  let stopped = false
  let release = (): void => {}
  const devices = (globalThis.navigator as Navigator | undefined)?.mediaDevices
  const Context = (globalThis as unknown as { AudioContext?: typeof AudioContext }).AudioContext
  if (!devices?.getUserMedia || !Context) {
    return () => {}
  }
  void devices
    .getUserMedia({ audio: true })
    .then((stream) => {
      if (stopped) {
        for (const track of stream.getTracks()) {
          track.stop()
        }
        return
      }
      const context = new Context()
      const tap = context.createAnalyser()
      tap.fftSize = 256
      context.createMediaStreamSource(stream).connect(tap)
      const samples = new Uint8Array(tap.fftSize)
      const spectrum = new Uint8Array(tap.frequencyBinCount)
      const timer = setInterval(() => {
        tap.getByteTimeDomainData(samples)
        tap.getByteFrequencyData(spectrum)
        let sum = 0
        for (const sample of samples) {
          const centered = (sample - 128) / 128
          sum += centered * centered
        }
        /* Square root of the mean square, scaled so a voice at speaking level reads near the top. */
        const level = Math.min(1, Math.sqrt(sum / samples.length) * 4)
        const bands = Array.from({ length: 8 }, (_, band) => {
          const from = Math.floor((band / 8) * spectrum.length)
          const to = Math.floor(((band + 1) / 8) * spectrum.length)
          let peak = 0
          for (let at = from; at < to; at += 1) {
            peak = Math.max(peak, spectrum[at] ?? 0)
          }
          return peak / 255
        })
        report(level, bands)
      }, 50)
      release = () => {
        clearInterval(timer)
        for (const track of stream.getTracks()) {
          track.stop()
        }
        void context.close()
      }
    })
    .catch(() => {})
  return () => {
    stopped = true
    release()
  }
}

/**
 * Listens with the browser's recognizer in this page. A field in a sandboxed
 * frame cannot: its origin is opaque, and the recognizer refuses it.
 *
 * `meter` reads loudness for the ring. Leave it off where this page is
 * listening for a frame. A second capture of the microphone ends the
 * recognizer, and the prompt the reader sees belongs to that capture.
 */
export const recognizeSpeech = (
  lang: string,
  listener: SpeechListener,
  options?: { meter?: boolean },
): SpeechSession => {
  const Constructor = recognizer()
  if (!Constructor) {
    listener.end('error', 'This browser has no speech recognition.')
    return { stop: () => {} }
  }
  const recognition = new Constructor()
  recognition.continuous = true
  recognition.interimResults = true
  recognition.lang = lang
  let asked = false
  let failed: string | undefined
  let heardWords = false
  let attempts = 0
  const local = 'processLocally' in recognition
  if (local) {
    ;(recognition as Recognition & { processLocally?: boolean }).processLocally = true
  }
  const quiet =
    options?.meter === false
      ? (): void => {}
      : meter((level, bands) => listener.level?.(level, bands))
  const finish = (): void => {
    quiet()
    listener.end(failed && failed !== 'aborted' ? 'error' : asked ? 'stopped' : 'ended', failed)
  }
  /* The permission prompt ends the first session before anyone has spoken.
     Starting again is what keeps the field listening. On-device recognition
     is preferred: the cloud service reports `network` and returns no words. */
  const again = (): boolean => {
    if (asked || failed || heardWords || attempts > 2) {
      return false
    }
    attempts += 1
    try {
      recognition.start()
      return true
    } catch {
      return false
    }
  }
  recognition.onresult = (event) => {
    let guess = ''
    for (let at = event.resultIndex; at < event.results.length; at += 1) {
      const result = event.results[at] as RecognitionResult
      const text = result[0]?.transcript ?? ''
      if (text.trim() !== '') {
        heardWords = true
      }
      if (result.isFinal) {
        listener.final(text.trim())
      } else {
        guess += text
      }
    }
    if (guess !== '') {
      listener.partial(guess.trim())
    }
  }
  recognition.onerror = (event) => {
    if (event.error === 'no-speech' || event.error === 'aborted') {
      return
    }
    const onDevice =
      (recognition as Recognition & { processLocally?: boolean }).processLocally === true
    if (onDevice && (event.error === 'language-not-supported' || event.error === 'network')) {
      ;(recognition as Recognition & { processLocally?: boolean }).processLocally = false
      return
    }
    failed = event.error
  }
  recognition.onend = () => {
    if (again()) {
      return
    }
    finish()
  }
  try {
    recognition.start()
  } catch (error) {
    quiet()
    const message = error instanceof Error ? error.message : 'not-allowed'
    listener.end('error', message)
    return { stop: () => {} }
  }
  return {
    stop: () => {
      asked = true
      recognition.stop()
    },
  }
}

const opaqueFrame = (): boolean => {
  const here = globalThis as { origin?: string; parent?: Window }
  return here.origin === 'null' && here.parent !== undefined && here.parent !== (here as Window)
}

let relayId = 0

/** Asks the page that framed this one to listen, and reports what it hears. */
const relaySpeech = (lang: string, listener: SpeechListener): SpeechSession => {
  relayId += 1
  const id = relayId
  const parent = (globalThis as unknown as Window).parent
  const channel = new MessageChannel()
  const take = (
    data: { error?: string; id?: number; kind?: string; text?: string; type?: string } | undefined,
  ): void => {
    if (data?.type !== 'helix-speech-heard' || data.id !== id) {
      return
    }
    if (data.kind === 'partial' && data.text) {
      listener.partial(data.text)
    } else if (data.kind === 'final' && data.text) {
      listener.final(data.text)
    } else if (data.kind === 'error' || data.kind === 'end' || data.kind === 'stopped') {
      channel.port1.onmessage = null
      window.removeEventListener('message', onMessage)
      listener.end(
        data.kind === 'error' ? 'error' : data.kind === 'stopped' ? 'stopped' : 'ended',
        data.error,
      )
    }
  }
  const onMessage = (event: MessageEvent): void => {
    const data = event.data as
      | { error?: string; id?: number; kind?: string; text?: string; type?: string }
      | undefined
    if (data?.type !== 'helix-speech-heard' || data.id !== id) {
      return
    }
    /* A reply on the window is accepted from the parent. A sandboxed frame
       often receives `source` as null, and another opaque frame is not the parent. */
    if (event.source !== parent && event.origin === 'null') {
      return
    }
    take(data)
  }
  channel.port1.onmessage = (event: MessageEvent) => {
    take(event.data as { error?: string; id?: number; kind?: string; text?: string; type?: string })
  }
  window.addEventListener('message', onMessage)
  parent.postMessage({ id, lang, type: 'helix-speech-start' }, '*', [channel.port2])
  return {
    stop: () => {
      parent.postMessage({ id, type: 'helix-speech-stop' }, '*')
    },
  }
}

/**
 * The browser's own recognizer, `SpeechRecognition`, or `webkitSpeechRecognition`
 * in Safari. Not available in Firefox.
 *
 * **Chrome sends the audio to Google's servers to recognize it**, and Safari
 * to Apple's unless the device recognizes on the device. A page that cannot
 * send what is said registers an engine of its own.
 *
 * **A sandboxed frame has an opaque origin, and the recognizer refuses that.**
 * The field asks the page that framed it to listen, and that page has an origin.
 */
export const browserSpeech: SpeechEngine = {
  available: () => recognizer() !== undefined,
  listen: ({ lang, listener }) =>
    opaqueFrame() ? relaySpeech(lang, listener) : recognizeSpeech(lang, listener),
}

const KEY = Symbol.for('fusion.helix.speech')
const globals = globalThis as unknown as Record<
  symbol,
  { engine: SpeechEngine | undefined } | undefined
>
if (globals[KEY] === undefined) {
  globals[KEY] = { engine: undefined }
}
const holder = globals[KEY]

/**
 * Gives every field on the page an engine to listen through, in place of the
 * browser's own, or takes it away again with `undefined`. A field's own
 * `speechEngine` wins over it.
 */
export const registerSpeechEngine = (engine: SpeechEngine | undefined): void => {
  holder.engine = engine
}

/** The engine a field listens through where it was given none of its own. */
export const pageSpeechEngine = (): SpeechEngine => holder.engine ?? browserSpeech
