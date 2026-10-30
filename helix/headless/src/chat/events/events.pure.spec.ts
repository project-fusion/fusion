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

describe('the events a chat sends as plain events', () => {
  test('helix-stop bubbles out of the shadow root and cannot be canceled', () => {
    const event = new events.HelixStopEvent()
    expect([event.type, event.bubbles, event.composed, event.cancelable]).toEqual([
      'helix-stop',
      true,
      true,
      false,
    ])
    expect(helixEventNames.has('helix-stop')).toBe(true)
  })

  test('helix-typing carries the state it reports', () => {
    const event = new events.HelixTypingEvent({ typing: true })
    expect(event.type).toBe('helix-typing')
    expect(event.detail.typing).toBe(true)
    expect(event.bubbles).toBe(true)
    expect(event.composed).toBe(true)
    expect(event.cancelable).toBe(false)
    expect(helixEventNames.has('helix-typing')).toBe(true)
  })
})
