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

describe('the event strands send when they show the gradient', () => {
  test('is helix-strands-fallback and says why the gradient shows', () => {
    const event = new events.HelixStrandsFallbackEvent({ reason: 'software' })
    expect(event.type).toBe('helix-strands-fallback')
    expect(event.detail.reason).toBe('software')
    expect(event.bubbles).toBe(true)
    expect(event.cancelable).toBe(false)
    expect(helixEventNames.has('helix-strands-fallback')).toBe(true)
  })

  test('is typed on addEventListener for the strands element', () => {
    const element = document.createElement('helix-strands')
    element.addEventListener('helix-strands-fallback', (event) => {
      const detail: Module['HelixStrandsFallbackEvent']['prototype']['detail'] = event.detail
      seen.push(detail.reason)
    })
    expect(seen).toHaveLength(0)
  })
})
