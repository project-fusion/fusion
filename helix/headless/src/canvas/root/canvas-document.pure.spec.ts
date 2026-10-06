import { describe, expect, test } from 'bun:test'
import { distanceTo, groupOf } from './canvas-document.js'

/**
 * Which group a card sits in, which moving a group moves it with.
 */
describe('groupOf', () => {
  const card = { height: 100, id: 'a', type: 'text' as const, width: 200, x: 0, y: 0 }
  const outer = { height: 600, id: 'outer', type: 'group' as const, width: 800, x: -100, y: -100 }
  const inner = { height: 300, id: 'inner', type: 'group' as const, width: 400, x: -20, y: -20 }

  test('is the smallest group that holds the card whole', () => {
    expect(groupOf(card, [outer, inner])?.id).toBe('inner')
  })

  test('is none where no group holds it', () => {
    expect(groupOf({ ...card, x: 2000 }, [outer, inner])).toBeUndefined()
  })
})

/**
 * How far a point is from a card, which a connection let go near one is
 * measured by.
 */
describe('distanceTo', () => {
  const card = { height: 100, width: 200, x: 0, y: 0 }

  test('is nothing inside the card and on its edge', () => {
    expect(distanceTo(card, { x: 50, y: 50 })).toBe(0)
    expect(distanceTo(card, { x: 200, y: 100 })).toBe(0)
  })

  test('is the way to the nearest edge beside it, and to the corner past it', () => {
    expect(distanceTo(card, { x: 215, y: 50 })).toBe(15)
    expect(distanceTo(card, { x: 50, y: -12 })).toBe(12)
    expect(distanceTo(card, { x: 203, y: 104 })).toBe(5)
  })
})
