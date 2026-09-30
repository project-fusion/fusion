import { describe, expect, test } from 'bun:test'
import { groupOf } from './canvas-document.js'

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
