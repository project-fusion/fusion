import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import type { SpeechEngine, SpeechListener } from '@fusion.dev/helix-core'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/** An engine the spec speaks through: each `listen` hands the spec its listener. */
const fakeEngine = (): SpeechEngine & { heard: SpeechListener[] } => {
  const engine = {
    available: () => true,
    heard: [] as SpeechListener[],
    listen: ({ listener }: { lang: string; listener: SpeechListener }) => {
      engine.heard.push(listener)
      return { stop: () => listener.end('stopped') }
    },
  }
  return engine
}

type Field = HTMLElement & {
  speechEngine: SpeechEngine | undefined
  startListening(): void
  stopListening(): void
  updateComplete: Promise<boolean>
}

describe('a styled textarea with voice', () => {
  test('draws Voice Level in place of the microphone while it listens, fed each reading', async () => {
    const engine = fakeEngine()
    const element = (await mount('<helix-textarea voice label="Note"></helix-textarea>')) as Field
    element.speechEngine = engine
    await element.updateComplete
    await element.updateComplete
    expect(part(element, 'voice-level')).toBeNull()
    expect(part(element, 'voice')?.querySelector('svg')).not.toBeNull()

    element.startListening()
    await element.updateComplete
    const meter = part(element, 'voice-level') as (HTMLElement & { level: number }) | null
    expect(meter?.localName).toBe('helix-voice-level')
    expect(meter?.getAttribute('aria-hidden')).toBe('true')
    expect(part(element, 'voice')?.contains(meter ?? null)).toBe(true)

    engine.heard[0]?.level?.(0.6)
    expect(meter?.level).toBe(0.6)

    element.stopListening()
    await element.updateComplete
    expect(part(element, 'voice-level')).toBeNull()
    expect(part(element, 'voice')?.querySelector('svg')).not.toBeNull()
  })
})
