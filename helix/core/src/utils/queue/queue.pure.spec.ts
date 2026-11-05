import { describe, expect, test } from 'bun:test'
import { type Queue, queueEnded, queueRemoved, queueStep } from './queue.js'

const QUEUE: Queue = { current: 'b', shuffle: false, values: ['a', 'b', 'c'] }

describe('a queue', () => {
  test('next and previous land on the entries either side', () => {
    expect(queueStep(QUEUE, 1).move).toEqual({ kind: 'play', to: 'c' })
    expect(queueStep(QUEUE, -1).move).toEqual({ kind: 'play', to: 'a' })
  })

  test('stops at either end, and goes round under repeat all', () => {
    expect(queueStep({ ...QUEUE, current: 'c' }, 1).move).toEqual({ kind: 'none' })
    expect(queueStep({ ...QUEUE, current: 'a' }, -1).move).toEqual({ kind: 'none' })
    expect(queueStep({ ...QUEUE, current: 'c', repeat: 'all' }, 1).move).toEqual({
      kind: 'play',
      to: 'a',
    })
  })

  test('a list of one under repeat all plays its entry again', () => {
    expect(
      queueStep({ current: 'a', repeat: 'all', shuffle: false, values: ['a'] }, 1).move,
    ).toEqual({ kind: 'replay' })
  })

  test('with nothing current, next starts at the first entry and previous goes nowhere', () => {
    expect(queueStep({ ...QUEUE, current: undefined }, 1).move).toEqual({ kind: 'play', to: 'a' })
    expect(queueStep({ ...QUEUE, current: undefined }, -1).move).toEqual({ kind: 'none' })
  })

  test('an end advances to the next entry, or stays where the queue does not advance', () => {
    expect(queueEnded(QUEUE, true).move).toEqual({ kind: 'play', to: 'c' })
    expect(queueEnded(QUEUE, false).move).toEqual({ kind: 'none' })
  })

  test('the last entry ending ends the queue, unless it repeats', () => {
    const last = { ...QUEUE, current: 'c' }
    expect(queueEnded(last, true).move).toEqual({ kind: 'end' })
    expect(queueEnded({ ...last, repeat: 'all' }, true).move).toEqual({ kind: 'play', to: 'a' })
    expect(queueEnded({ ...last, repeat: 'one' }, true).move).toEqual({ kind: 'replay' })
    expect(queueEnded({ ...last, repeat: 'one' }, false).move).toEqual({ kind: 'replay' })
  })

  test('shuffle deals an order led by the current entry, and previous retraces it', () => {
    const shuffled = { ...QUEUE, random: () => 0, shuffle: true, values: ['a', 'b', 'c', 'd'] }
    const first = queueStep(shuffled, 1)
    expect(first.dealt?.[0]).toBe('b')
    expect([...(first.dealt ?? [])].sort()).toEqual(['a', 'b', 'c', 'd'])
    const to = first.move.kind === 'play' ? first.move.to : ''
    expect(to).toBe(first.dealt?.[1] ?? 'none')
    const back = queueStep({ ...shuffled, current: to, dealt: first.dealt }, -1)
    expect(back.move).toEqual({ kind: 'play', to: 'b' })
    expect(back.dealt).toEqual(first.dealt)
  })

  test('a deal is dropped without shuffle, and dealt again once an entry arrives', () => {
    expect(queueStep({ ...QUEUE, dealt: ['c', 'b', 'a'] }, 1).dealt).toBeUndefined()
    const dealt = queueStep(
      { ...QUEUE, dealt: ['b', 'a'], random: () => 0, shuffle: true, values: ['a', 'b', 'c'] },
      1,
    ).dealt
    expect([...(dealt ?? [])].sort()).toEqual(['a', 'b', 'c'])
  })

  test('the current entry leaving moves to the one after it, or before it where it was last', () => {
    expect(queueRemoved(['a', 'b', 'c'], 'b', new Set(['a', 'c']))).toBe('c')
    expect(queueRemoved(['a', 'b', 'c'], 'c', new Set(['a', 'b']))).toBe('b')
    expect(queueRemoved(['a', 'b'], 'a', new Set())).toBeUndefined()
  })
})
