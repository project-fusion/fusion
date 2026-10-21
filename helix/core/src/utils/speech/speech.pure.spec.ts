import { describe, expect, test } from 'bun:test'
import { recognizeSpeech, type SpeechListener } from './speech.js'

type Availability = 'available' | 'downloadable' | 'downloading' | 'unavailable'

/** What a recognizer does when it starts: hear a phrase, or fail with an error code. */
type Script = { error: string } | { heard: string }

/**
 * A window whose recognizer plays one script per start, in order, and
 * records whether each start was on the device.
 */
const browser = (scripts: Script[], local?: { availability: Availability; installs?: boolean }) => {
  const starts: boolean[] = []
  const installs: string[][] = []
  class Recognition {
    continuous = false

    interimResults = false

    lang = ''

    processLocally = false

    onend: (() => void) | null = null

    onerror: ((event: { error: string }) => void) | null = null

    onresult:
      | ((event: {
          resultIndex: number
          results: ArrayLike<{ 0?: { transcript: string }; isFinal: boolean }>
        }) => void)
      | null = null

    static available = local ? async () => local.availability : undefined

    static install = local
      ? async (options: { langs: string[] }) => {
          installs.push(options.langs)
          return local.installs ?? true
        }
      : undefined

    start(): void {
      starts.push(this.processLocally)
      const script = scripts.shift()
      if (script && 'heard' in script) {
        this.onresult?.({
          resultIndex: 0,
          results: [{ 0: { transcript: script.heard }, isFinal: true }],
        })
      } else if (script) {
        this.onerror?.({ error: script.error })
      }
      this.onend?.()
    }

    stop(): void {
      this.onend?.()
    }
  }
  return { installs, scope: { SpeechRecognition: Recognition } as unknown as Window, starts }
}

/** Listens until the recognizer ends, and returns what the listener was told. */
const listen = (scope: Window) =>
  new Promise<string[]>((done) => {
    const told: string[] = []
    const listener: SpeechListener = {
      end: (reason, message) => {
        told.push(message ? `${reason} ${message}` : reason)
        done(told)
      },
      final: (text) => told.push(`final ${text}`),
      partial: (text) => told.push(`partial ${text}`),
      preparing: () => told.push('preparing'),
    }
    recognizeSpeech('en-US', listener, { meter: false, scope })
  })

describe('recognizeSpeech', () => {
  test('listens on the device when the language is installed', async () => {
    const page = browser([{ heard: 'hello' }], { availability: 'available' })
    expect(await listen(page.scope)).toEqual(['final hello', 'ended'])
    expect(page.starts).toEqual([true])
    expect(page.installs).toEqual([])
  })

  test('installs a downloadable language, saying so, and then listens on the device', async () => {
    const page = browser([{ heard: 'hello' }], { availability: 'downloadable' })
    expect(await listen(page.scope)).toEqual(['preparing', 'final hello', 'ended'])
    expect(page.installs).toEqual([['en-US']])
    expect(page.starts).toEqual([true])
  })

  test('listens through the service where the install fails or the device has no language', async () => {
    const refused = browser([{ heard: 'hello' }], { availability: 'downloadable', installs: false })
    expect(await listen(refused.scope)).toEqual(['preparing', 'final hello', 'ended'])
    expect(refused.starts).toEqual([false])

    const none = browser([{ heard: 'hello' }], { availability: 'unavailable' })
    expect(await listen(none.scope)).toEqual(['final hello', 'ended'])
    expect(none.starts).toEqual([false])

    const old = browser([{ heard: 'hello' }])
    expect(await listen(old.scope)).toEqual(['final hello', 'ended'])
    expect(old.starts).toEqual([false])
  })

  test('falls back to the service when the device refuses a language it said it had', async () => {
    const page = browser([{ error: 'language-not-supported' }, { heard: 'hello' }], {
      availability: 'available',
    })
    expect(await listen(page.scope)).toEqual(['final hello', 'ended'])
    expect(page.starts).toEqual([true, false])
  })

  /* Brave has the API and no speech service, so the service ends with `network`. */
  test('ends with the error code a session failed with', async () => {
    const page = browser([{ error: 'network' }])
    expect(await listen(page.scope)).toEqual(['error network'])
  })

  test('a silence long enough that the recognizer gives up ends without an error', async () => {
    const page = browser([{ error: 'no-speech' }])
    expect(await listen(page.scope)).toEqual(['ended'])
  })
})
