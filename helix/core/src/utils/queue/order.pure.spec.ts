import { describe, expect, test } from 'bun:test'
import { playOrder, shuffled, stepTo } from './order.js'

/** A source of chance that says the same thing every time it is asked. */
const fixed = (...draws: number[]): (() => number) => {
  let at = 0
  return () => {
    const draw = draws[at % draws.length] ?? 0
    at += 1
    return draw
  }
}

describe('a shuffled list', () => {
  test('holds every value once', () => {
    const order = shuffled(['a', 'b', 'c', 'd', 'e'], undefined, fixed(0.9, 0.1, 0.5))
    expect([...order].sort()).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  test('puts the entry being watched first', () => {
    for (const draw of [0, 0.3, 0.6, 0.99]) {
      expect(shuffled(['a', 'b', 'c', 'd'], 'c', fixed(draw))[0]).toBe('c')
    }
  })

  test('and moves the rest', () => {
    /* A zero every time swaps each value with the first of the rest. */
    expect(shuffled(['a', 'b', 'c', 'd'], 'a', fixed(0))).toEqual(['a', 'c', 'd', 'b'])
  })

  test('ignores a first value the list does not hold', () => {
    expect(shuffled(['a', 'b'], 'z', fixed(0.9))).toEqual(['a', 'b'])
  })
})

describe('the order a playlist plays in', () => {
  test('is the written order without shuffle', () => {
    expect(playOrder(['a', 'b', 'c'], false, ['c', 'b', 'a'], 'b')).toEqual(['a', 'b', 'c'])
  })

  test('keeps the order it holds while the entries are the same', () => {
    /* Or a step back would not return to what just played. */
    expect(playOrder(['a', 'b', 'c'], true, ['c', 'a', 'b'], 'a', fixed(0))).toEqual([
      'c',
      'a',
      'b',
    ])
  })

  test('shuffles again, led by the current entry, once the entries change', () => {
    const order = playOrder(['a', 'b', 'c', 'd'], true, ['c', 'a', 'b'], 'b', fixed(0.5))
    expect(order[0]).toBe('b')
    expect([...order].sort()).toEqual(['a', 'b', 'c', 'd'])
  })
})

describe('a step', () => {
  test('moves along the order', () => {
    expect(stepTo(['a', 'b', 'c'], 'a', 1, false)).toBe('b')
    expect(stepTo(['a', 'b', 'c'], 'c', -1, false)).toBe('b')
  })

  test('stops at either end', () => {
    expect(stepTo(['a', 'b', 'c'], 'c', 1, false)).toBeUndefined()
    expect(stepTo(['a', 'b', 'c'], 'a', -1, false)).toBeUndefined()
  })

  test('goes round with `wrap`, both ways', () => {
    expect(stepTo(['a', 'b', 'c'], 'c', 1, true)).toBe('a')
    expect(stepTo(['a', 'b', 'c'], 'a', -1, true)).toBe('c')
  })

  test('lands on the only entry of a list of one, with `wrap`', () => {
    expect(stepTo(['a'], 'a', 1, true)).toBe('a')
    expect(stepTo(['a'], 'a', 1, false)).toBeUndefined()
  })

  test('starts at the first entry from nothing, and goes nowhere back', () => {
    expect(stepTo(['a', 'b'], undefined, 1, false)).toBe('a')
    expect(stepTo(['a', 'b'], undefined, -1, true)).toBeUndefined()
    expect(stepTo([], undefined, 1, true)).toBeUndefined()
  })
})
