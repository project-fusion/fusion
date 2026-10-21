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
  /** The engine is fetching what it needs to listen, such as a language to recognize on the device. */
  preparing?(): void
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

const recognizer = (scope: object = globalThis): RecognitionConstructor | undefined => {
  const here = scope as {
    SpeechRecognition?: RecognitionConstructor
    webkitSpeechRecognition?: RecognitionConstructor
  }
  return here.SpeechRecognition ?? here.webkitSpeechRecognition
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
 * Whether the browser can recognize a language on the device, from Chrome's
 * `SpeechRecognition.available`. `downloadable` and `downloading` need
 * `install` first.
 */
type LocalAvailability = 'available' | 'downloadable' | 'downloading' | 'unavailable'

interface LocalRecognizer {
  available?(options: { langs: string[]; processLocally: boolean }): Promise<LocalAvailability>
  install?(options: { langs: string[]; processLocally: boolean }): Promise<boolean>
}

/**
 * Whether `Constructor` can listen to `lang` on the device, installing the
 * language first where the browser offers it. `preparing` is told as the
 * install starts. Anything that fails answers `false`, and the recognizer
 * listens through the browser's service instead.
 */
const listenLocally = async (
  Constructor: RecognitionConstructor,
  lang: string,
  preparing: () => void,
): Promise<boolean> => {
  const local = Constructor as unknown as LocalRecognizer
  if (!local.available || !local.install) {
    return false
  }
  const options = { langs: [lang], processLocally: true }
  try {
    const state = await local.available(options)
    if (state === 'available') {
      return true
    }
    if (state === 'unavailable') {
      return false
    }
    preparing()
    /* The install needs a recent press. The press on the dictation button
       counts here, and in the page that holds the frame it was made in. */
    return await local.install(options)
  } catch {
    return false
  }
}

/**
 * Listens with the browser's recognizer in this page, or in `scope`, a window
 * of the same origin. A field in a sandboxed frame cannot: its origin is
 * opaque, and the recognizer refuses it.
 *
 * **It recognizes on the device where the browser can**, installing the
 * language first if it has to, and through the browser's service where it
 * cannot. Chrome's service is Google's, and Chromium browsers without Google's
 * keys, such as Brave, reach no service at all and end with `network`.
 *
 * `meter` reads loudness for the ring. Leave it off where this page is
 * listening for a frame. A second capture of the microphone ends the
 * recognizer, and the prompt the reader sees belongs to that capture.
 */
export const recognizeSpeech = (
  lang: string,
  listener: SpeechListener,
  options?: { meter?: boolean; scope?: Window },
): SpeechSession => {
  const Constructor = recognizer(options?.scope ?? globalThis)
  if (!Constructor) {
    listener.end('error', 'This browser has no speech recognition.')
    return { stop: () => {} }
  }
  let asked = false
  let ended = false
  let recognition: Recognition | undefined
  const quiet =
    options?.meter === false
      ? (): void => {}
      : meter((level, bands) => listener.level?.(level, bands))
  const end = (reason: 'ended' | 'error' | 'stopped', message?: string): void => {
    if (ended) {
      return
    }
    ended = true
    quiet()
    listener.end(reason, message)
  }
  /* `processLocally` is set only where the language is installed. Set where
     it is not, the recognizer ends with `language-not-supported` before it
     asks for the microphone. */
  const listen = (locally: boolean): void => {
    const current = new Constructor()
    recognition = current
    current.continuous = true
    current.interimResults = true
    current.lang = lang
    if (locally) {
      ;(current as Recognition & { processLocally?: boolean }).processLocally = true
    }
    let failed: string | undefined
    let heard = false
    current.onresult = (event) => {
      heard = true
      let guess = ''
      for (let at = event.resultIndex; at < event.results.length; at += 1) {
        const result = event.results[at] as RecognitionResult
        const text = result[0]?.transcript ?? ''
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
    /* `no-speech` is a silence long enough that the recognizer gave up, and
       `aborted` is a stop. Neither is a failure the reader needs told. */
    current.onerror = (event) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        failed = event.error
      }
    }
    current.onend = () => {
      /* The device refused a language it said it had. The service may still take it. */
      if (locally && !asked && !heard && failed === 'language-not-supported') {
        listen(false)
        return
      }
      end(failed ? 'error' : asked ? 'stopped' : 'ended', failed)
    }
    try {
      current.start()
    } catch (error) {
      end('error', error instanceof Error ? error.message : 'not-allowed')
    }
  }
  void listenLocally(Constructor, lang, () => listener.preparing?.()).then((locally) => {
    if (asked) {
      end('stopped')
      return
    }
    listen(locally)
  })
  return {
    stop: () => {
      asked = true
      if (recognition) {
        recognition.stop()
      }
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
    if (data.kind === 'preparing') {
      listener.preparing?.()
    } else if (data.kind === 'partial' && data.text) {
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
 * **It recognizes on the device where the browser can**, and Chrome downloads
 * the language on the first press. Where it cannot, Chrome sends the audio to
 * Google's servers, and Safari to Apple's. A page that cannot send what is
 * said registers an engine of its own.
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
