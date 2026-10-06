import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import type * as Subject from './request-change.js'

/* The page first, then the module: its event class extends the `CustomEvent`
   it finds as it loads, and a DOM spec later in the same run dispatches it. */
let requestChange: typeof Subject.requestChange
let requestValue: typeof Subject.requestValue

beforeAll(async () => {
  registerDom()
  ;({ requestChange, requestValue } = await import('./request-change.js'))
})

/**
 * The one path every stateful change in the library runs through.
 *
 * No elements: this takes an `EventTarget` and a pair of callbacks, and what it
 * decides is an order and a verdict. A plain `EventTarget` is enough to ask
 * both.
 *
 * The four controller mixins are its callers, so a fault here is a fault in
 * every stateful component at once.
 *
 * There is no controlled mode: the element applies, and a consumer refuses here
 * to take over.
 */
const target = () => {
  const host = new EventTarget()
  const log: string[] = []
  return { host, log }
}

const change = (_next: string): Event => new CustomEvent('probe-change', { cancelable: true })

describe('announcing before applying', () => {
  test('the event goes out first, so a listener sees the state it is being asked to allow', () => {
    const { host, log } = target()
    let state = 'before'
    host.addEventListener('probe-change', () => {
      log.push(`heard, state is ${state}`)
    })
    requestChange({
      apply: (next) => {
        state = next
        log.push(`applied ${next}`)
      },
      event: change,
      host,
      next: 'after',
    })
    expect(log).toEqual(['heard, state is before', 'applied after'])
  })

  test('a refusal stops it, and says so', () => {
    const { host } = target()
    let applied = false
    host.addEventListener('probe-change', (event) => {
      event.preventDefault()
    })
    const stood = requestChange({
      apply: () => {
        applied = true
      },
      event: change,
      host,
      next: 'after',
    })
    expect([stood, applied]).toEqual([false, false])
  })

  test('and nobody refusing means it stands', () => {
    const { host } = target()
    expect(requestChange({ apply: () => {}, event: change, host, next: 'after' })).toBe(true)
  })

  test('applies for a host that declared the state, since a prop is a seed and not a claim', () => {
    const { host } = target()
    let state = 'seeded'
    requestChange({
      apply: (next) => {
        state = next
      },
      event: change,
      host,
      next: 'moved',
    })
    expect(state).toBe('moved')
  })
})

describe('a value a reader moves', () => {
  test('asks with helix-before-change, applies, then sends a bubbling, composed change', () => {
    const host = new EventTarget()
    const heard: string[] = []
    let value = 'a'
    host.addEventListener('helix-before-change', (event) => {
      heard.push(`before ${(event as CustomEvent<{ value: string }>).detail.value}, value ${value}`)
    })
    host.addEventListener('change', (event) => {
      heard.push(`change ${event.bubbles} ${event.composed}, value ${value}`)
    })
    expect(
      requestValue(host, 'a, b', (next) => {
        value = next
      }),
    ).toBe(true)
    expect(heard).toEqual(['before a, b, value a', 'change true true, value a, b'])
  })

  test('a refusal leaves the value and sends no change', () => {
    const host = new EventTarget()
    let changes = 0
    host.addEventListener('helix-before-change', (event) => event.preventDefault())
    host.addEventListener('change', () => {
      changes += 1
    })
    let value = 'a'
    expect(
      requestValue(host, 'b', (next) => {
        value = next
      }),
    ).toBe(false)
    expect(value).toBe('a')
    expect(changes).toBe(0)
  })
})
