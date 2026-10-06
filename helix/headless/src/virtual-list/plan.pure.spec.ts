import { describe, expect, test } from 'bun:test'
import { drawPlan, itemsOf, stopAfter } from './plan.js'

describe('drawPlan', () => {
  test('draws the window, held to the set', () => {
    expect(drawPlan({ count: 5, drawn: [], first: 2, last: 8 })).toEqual({
      remove: new Set(),
      wanted: [2, 3, 4],
    })
  })

  test('removes the rows that leave the window', () => {
    const plan = drawPlan({ count: 100, drawn: [8, 9, 10, 11], first: 10, last: 14 })
    expect([...plan.remove]).toEqual([8, 9])
    expect(plan.wanted).toEqual([10, 11, 12, 13])
  })

  test('adds the kept item in its place, outside the window', () => {
    const plan = drawPlan({ count: 100, drawn: [3, 50], first: 50, kept: 3, last: 52 })
    expect(plan.wanted).toEqual([3, 50, 51])
    expect(plan.remove.size).toBe(0)
  })

  test('removes an element that holds no item, and every row on a redraw', () => {
    expect([...drawPlan({ count: 10, drawn: [Number.NaN, 0], first: 0, last: 2 }).remove]).toEqual([
      Number.NaN,
    ])
    const plan = drawPlan({ count: 10, drawn: [0, 1], first: 0, last: 2, redraw: true })
    expect([...plan.remove]).toEqual([0, 1])
  })
})

describe('stopAfter', () => {
  const window = { count: 500, first: 96, last: 114, onScreen: 100 }

  test('stays on the item that held it while its row is drawn', () => {
    expect(stopAfter(105, [104, 105, 106], window)).toBe(105)
  })

  test('moves to the first item on screen when its row left', () => {
    expect(stopAfter(3, [96, 97], window)).toBe(100)
  })

  test('is held inside the window and the set', () => {
    expect(stopAfter(3, [], { count: 5, first: 0, last: 18, onScreen: 9 })).toBe(4)
    expect(stopAfter(3, [], { count: 0, first: 0, last: 0, onScreen: 0 })).toBe(0)
    expect(stopAfter(3, [], { count: 500, first: 20, last: 30, onScreen: 2 })).toBe(20)
  })
})

describe('a grid', () => {
  test('draws the kept item with its whole line, held to the set', () => {
    const plan = drawPlan({ across: 4, count: 10, drawn: [], first: 0, kept: 9, last: 4 })
    expect(plan.wanted).toEqual([0, 1, 2, 3, 8, 9])
    const above = drawPlan({ across: 4, count: 100, drawn: [], first: 40, kept: 5, last: 44 })
    expect(above.wanted).toEqual([4, 5, 6, 7, 40, 41, 42, 43])
  })

  test('reads a span of lines as the items they hold', () => {
    expect(itemsOf({ first: 2, last: 5 }, 4, 18)).toEqual({ first: 8, last: 18 })
    expect(itemsOf({ first: 2, last: 5 }, 1, 18)).toEqual({ first: 2, last: 5 })
  })
})
