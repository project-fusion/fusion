import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

type Module = typeof import('./index.js')

let events: Module
let helixEventNames: ReadonlySet<string>

/* Imported after registration, because the event classes capture whichever
   `Event` is global when the module is evaluated. Specs share one module cache,
   and this file can run before any DOM spec has registered happy-dom. */
beforeAll(async () => {
  registerDom()
  ;({ helixEventNames } = await import('@fusion.dev/helix-core'))
  events = await import('./index.js')
})

const seen: unknown[] = []

describe('the event an aura sends when it shows the gradient', () => {
  test('is helix-aura-fallback and says why the gradient shows', () => {
    const event = new events.HelixAuraFallbackEvent({ reason: 'lost' })
    expect(event.type).toBe('helix-aura-fallback')
    expect(event.detail.reason).toBe('lost')
    expect(event.bubbles).toBe(true)
    expect(event.cancelable).toBe(false)
    expect(helixEventNames.has('helix-aura-fallback')).toBe(true)
  })

  test('is typed on addEventListener for the aura element', () => {
    const element = document.createElement('helix-aura')
    element.addEventListener('helix-aura-fallback', (event) => {
      const detail: Module['HelixAuraFallbackEvent']['prototype']['detail'] = event.detail
      seen.push(detail.reason)
    })
    expect(seen).toHaveLength(0)
  })
})
