import { describe, expect, test } from 'bun:test'
import { type Clock, moveClock, usesClock } from './clock.js'
import { el, type Scenario, say } from './format.js'

/** A clock that keeps what it was asked. */
const kept = () => {
  const asked: string[] = []
  const clock: Clock = {
    advance: (ms) => asked.push(`advance ${ms}`),
    setVisible: (visible) => asked.push(visible ? 'show' : 'hide'),
  }
  return { asked, clock }
}

const scenario = (intents: Scenario['intents']): Scenario => ({
  family: 'button',
  intents,
  name: 'waits',
  setup: el('helix-button', {}, ['Save']),
})

describe('the fake clock', () => {
  test('is used by a scenario that waits, hides, or shows, and by no other', () => {
    expect(usesClock(scenario([{ kind: 'wait', ms: 300 }]))).toBe(true)
    expect(usesClock(scenario([{ kind: 'hide' }]))).toBe(true)
    expect(usesClock(scenario([{ kind: 'press' }]))).toBe(false)
  })

  test('moves forward on a wait, and sends the page away and back', () => {
    const { asked, clock } = kept()
    expect(moveClock(clock, { kind: 'wait', ms: 300 })).toBeUndefined()
    moveClock(clock, { kind: 'hide' })
    moveClock(clock, { kind: 'show' })
    expect(asked).toEqual(['advance 300', 'hide', 'show'])
  })

  test('says why it cannot where a harness was given none', () => {
    expect(moveClock(undefined, { kind: 'wait', ms: 1 })).toBe(
      'The harness was given no fake clock.',
    )
  })

  test('names a scroll in a record by its offset', () => {
    expect(say({ kind: 'scroll', x: 40, y: 0 })).toBe('scroll to 40, 0')
  })

  test('names each intent in a record', () => {
    expect([say({ kind: 'wait', ms: 300 }), say({ kind: 'hide' }), say({ kind: 'show' })]).toEqual([
      'wait 300 ms',
      'hide the page',
      'show the page',
    ])
  })
})
