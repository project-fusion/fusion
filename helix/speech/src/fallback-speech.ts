import type { SpeechEngine, SpeechListener, SpeechSession } from '@fusion.dev/helix-core'

/**
 * The errors that mean `first` cannot recognize in this browser at all, as
 * opposed to a refused microphone or a slip in one listening. `network` is a
 * browser with no speech service, Brave among them.
 */
const CANNOT = new Set([
  'language-not-supported',
  'network',
  'service-not-allowed',
  'This browser has no speech recognition.',
])

/**
 * Combines two engines: a field listens through `first`, and through
 * `second` where `first` is not available or cannot recognize here. The first
 * time `first` ends with an error that means it cannot, before it heard
 * anything, the same press listens through `second`, and so does every press
 * after it on the page.
 *
 * ```ts
 * import { browserSpeech, registerSpeechEngine } from '@fusion.dev/helix-core'
 * import { fallbackSpeech, moonshineSpeech } from '@fusion.dev/helix-speech'
 *
 * registerSpeechEngine(fallbackSpeech(browserSpeech, moonshineSpeech()))
 * ```
 */
export const fallbackSpeech = (first: SpeechEngine, second: SpeechEngine): SpeechEngine => {
  let failed = false

  const listen = ({
    lang,
    listener,
  }: {
    lang: string
    listener: SpeechListener
  }): SpeechSession => {
    if (failed || !first.available()) {
      return second.listen({ lang, listener })
    }
    let heard = false
    let stopped = false
    let current: SpeechSession | undefined
    current = first.listen({
      lang,
      listener: {
        end: (reason, message) => {
          if (reason === 'error' && !heard && !stopped && message && CANNOT.has(message)) {
            failed = true
            current = second.listen({ lang, listener })
            return
          }
          listener.end(reason, message)
        },
        final: (text) => {
          heard = true
          listener.final(text)
        },
        level: (level, bands) => listener.level?.(level, bands),
        partial: (text) => {
          heard = true
          listener.partial(text)
        },
      },
    })
    return {
      stop: () => {
        stopped = true
        current?.stop()
      },
    }
  }

  return {
    available: () => first.available() || second.available(),
    listen,
  }
}
