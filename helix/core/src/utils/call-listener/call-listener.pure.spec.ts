import { afterEach, describe, expect, test } from 'bun:test'
import { callListener } from './call-listener.js'

const SLOT = Symbol.for('fusion.dev/helix/spec-listener')
const store = globalThis as Record<symbol, unknown>
const original = console.error

afterEach(() => {
  delete store[SLOT]
  console.error = original
})

describe('callListener', () => {
  test('answers undefined where nothing listens', () => {
    expect(callListener(SLOT, 'spec', 'nothing happened')).toBeUndefined()
  })

  test('hands the listener its arguments and answers what it returned', () => {
    store[SLOT] = (a: number, b: number) => a + b
    expect(callListener(SLOT, 'spec', 'nothing happened', 2, 3)).toBe(5)
  })

  test('prints a failure once for each kind, and answers undefined', () => {
    const printed: unknown[][] = []
    console.error = (...args: unknown[]) => {
      printed.push(args)
    }
    const error = new Error('a listener')
    store[SLOT] = () => {
      throw error
    }
    expect(callListener(SLOT, 'first', 'the element rendered as usual')).toBeUndefined()
    callListener(SLOT, 'first', 'the element rendered as usual')
    callListener(SLOT, 'second', 'the warning is printed here')
    expect(printed).toEqual([
      [
        'helix: a first listener threw, and the element rendered as usual. Later failures are not printed.',
        error,
      ],
      [
        'helix: a second listener threw, and the warning is printed here. Later failures are not printed.',
        error,
      ],
    ])
  })
})
