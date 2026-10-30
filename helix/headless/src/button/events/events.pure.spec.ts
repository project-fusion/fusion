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

describe('the event a control sends once a press has acted', () => {
  test('is helix-press, carries what pressed it, bubbles out of the shadow root and cannot be canceled', () => {
    const event = new events.HelixPressEvent({ pointerType: 'keyboard' })
    expect(event.type).toBe('helix-press')
    expect(event.detail.pointerType).toBe('keyboard')
    expect(event.bubbles).toBe(true)
    expect(event.composed).toBe(true)
    expect(event.cancelable).toBe(false)
    expect(helixEventNames.has('helix-press')).toBe(true)
  })
})
