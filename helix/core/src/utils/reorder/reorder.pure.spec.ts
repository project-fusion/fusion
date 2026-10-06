import { describe, expect, test } from 'bun:test'
import {
  centersOf,
  dropMark,
  edgeSpeed,
  IDLE,
  passedCount,
  placeKey,
  type ReorderInput,
  type ReorderState,
  reorderKey,
  reorderStep,
} from './reorder.js'

const press: ReorderInput = { from: 1, key: 'b', pointer: 7, type: 'press', x: 10, y: 10 }
const pressed: ReorderState = { from: 1, key: 'b', phase: 'pressed', pointer: 7, x: 10, y: 10 }
const keyHeld: ReorderState = { by: 'keyboard', from: 1, key: 'b', phase: 'held', to: 1 }
const pointerHeld: ReorderState = { by: 'pointer', from: 1, key: 'b', phase: 'held', to: 2 }

describe('a pointer on a grip', () => {
  test('a press is held as pressed, and only from idle', () => {
    expect(reorderStep(IDLE, press)).toEqual(pressed)
    expect(reorderStep(keyHeld, press)).toBeNull()
  })

  test('a press becomes a drag once it has traveled the slop', () => {
    expect(reorderStep(pressed, { slop: 4, to: 1, type: 'drag', x: 12, y: 11 })).toBeNull()
    expect(reorderStep(pressed, { slop: 4, to: 2, type: 'drag', x: 10, y: 16 })).toEqual({
      by: 'pointer',
      from: 1,
      key: 'b',
      phase: 'held',
      to: 2,
    })
  })

  test('a drag moves the place, and a drag over the same place changes nothing', () => {
    expect(reorderStep(pointerHeld, { slop: 4, to: 0, type: 'drag', x: 0, y: 0 })).toEqual({
      ...pointerHeld,
      to: 0,
    })
    expect(reorderStep(pointerHeld, { slop: 4, to: 2, type: 'drag', x: 0, y: 0 })).toBeNull()
  })

  test('a drag does not move an item the keys hold', () => {
    expect(reorderStep(keyHeld, { slop: 4, to: 2, type: 'drag', x: 0, y: 0 })).toBeNull()
  })

  test('a release ends a press with nothing moved, and drops a dragged item', () => {
    expect(reorderStep(pressed, { type: 'release' })).toEqual(IDLE)
    expect(reorderStep(pointerHeld, { type: 'release' })).toEqual({
      ...pointerHeld,
      phase: 'dropped',
    })
    expect(reorderStep(keyHeld, { type: 'release' })).toBeNull()
  })
})

describe('a key or a click on a grip', () => {
  test('a pick holds the item where it is', () => {
    expect(reorderStep(IDLE, { from: 1, key: 'b', type: 'pick' })).toEqual(keyHeld)
  })

  test('a second pick on the same grip drops it, and a pick on another grip does nothing', () => {
    const moved = { ...keyHeld, to: 3 } as ReorderState
    expect(reorderStep(moved, { from: 1, key: 'b', type: 'pick' })).toEqual({
      ...moved,
      phase: 'dropped',
    } as ReorderState)
    expect(reorderStep(moved, { from: 0, key: 'a', type: 'pick' })).toBeNull()
  })

  test('a step moves the place, and a step to the same place changes nothing', () => {
    expect(reorderStep(keyHeld, { to: 0, type: 'step' })).toEqual({ ...keyHeld, to: 0 })
    expect(reorderStep(keyHeld, { to: 1, type: 'step' })).toBeNull()
    expect(reorderStep(IDLE, { to: 0, type: 'step' })).toBeNull()
  })

  test('a click on another item drops the held one there', () => {
    expect(reorderStep(keyHeld, { to: 3, type: 'target' })).toEqual({
      ...keyHeld,
      phase: 'dropped',
      to: 3,
    } as ReorderState)
    expect(reorderStep(pointerHeld, { to: 3, type: 'target' })).toBeNull()
  })

  test('drop and cancel end a hold', () => {
    expect(reorderStep(keyHeld, { type: 'drop' })).toEqual({ ...keyHeld, phase: 'dropped' })
    expect(reorderStep(keyHeld, { type: 'cancel' })).toEqual({
      by: 'keyboard',
      key: 'b',
      phase: 'canceled',
    })
    expect(reorderStep(pointerHeld, { type: 'cancel' })).toEqual({
      by: 'pointer',
      key: 'b',
      phase: 'canceled',
    })
    expect(reorderStep(pressed, { type: 'cancel' })).toEqual(IDLE)
    expect(reorderStep(IDLE, { type: 'cancel' })).toBeNull()
    expect(reorderStep(IDLE, { type: 'drop' })).toBeNull()
  })

  test('settle returns an ended move to idle, and nothing else', () => {
    expect(reorderStep({ ...keyHeld, phase: 'dropped' }, { type: 'settle' })).toEqual(IDLE)
    expect(
      reorderStep({ by: 'keyboard', key: 'b', phase: 'canceled' }, { type: 'settle' }),
    ).toEqual(IDLE)
    expect(reorderStep(keyHeld, { type: 'settle' })).toBeNull()
  })
})

describe('the place under the pointer', () => {
  test('counts the middles the pointer has passed', () => {
    expect(passedCount([10, 30, 50], 5)).toBe(0)
    expect(passedCount([10, 30, 50], 31)).toBe(2)
    expect(passedCount([10, 30, 50], 99)).toBe(3)
  })

  test('counts from the right on a right-to-left row', () => {
    expect(passedCount([50, 30, 10], 55, true)).toBe(0)
    expect(passedCount([50, 30, 10], 29, true)).toBe(2)
  })
})

describe('the middles of the items', () => {
  test('are halfway along each box', () => {
    expect(
      centersOf([
        { end: 20, start: 0 },
        { end: 50, start: 20 },
      ]),
    ).toEqual([10, 35])
  })

  test('put an item a window did not draw before or after the drawn ones', () => {
    const centers = centersOf([
      undefined,
      { end: 20, start: 0 },
      undefined,
      { end: 60, start: 40 },
      undefined,
    ])
    expect(centers).toEqual([Number.NEGATIVE_INFINITY, 10, 10, 50, Number.POSITIVE_INFINITY])
    /* Above the drawn rows, only the one the window left out above is passed. */
    expect(passedCount(centers, -5)).toBe(1)
    expect(passedCount(centers, 999)).toBe(4)
  })

  test('turn the ends around on a row laid out from the right', () => {
    expect(centersOf([undefined, { end: 20, start: 0 }, undefined], true)).toEqual([
      Number.POSITIVE_INFINITY,
      10,
      Number.NEGATIVE_INFINITY,
    ])
  })
})

describe('the keys that move a held item', () => {
  const rows = { axis: 'block' as const, count: 4, rtl: false, to: 1 }

  test('Up and Down move a row one place, held to the ends', () => {
    expect(reorderKey('ArrowDown', rows)).toBe(2)
    expect(reorderKey('ArrowUp', rows)).toBe(0)
    expect(reorderKey('ArrowUp', { ...rows, to: 0 })).toBe(0)
    expect(reorderKey('ArrowDown', { ...rows, to: 3 })).toBe(3)
  })

  test('Home and End move it to either end', () => {
    expect(reorderKey('Home', rows)).toBe(0)
    expect(reorderKey('End', rows)).toBe(3)
  })

  test('Left and Right do not move a row, and other keys move nothing', () => {
    expect(reorderKey('ArrowLeft', rows)).toBeNull()
    expect(reorderKey('a', rows)).toBeNull()
  })

  test('Left and Right move a column along the writing direction', () => {
    const columns = { axis: 'inline' as const, count: 4, rtl: false, to: 1 }
    expect(reorderKey('ArrowRight', columns)).toBe(2)
    expect(reorderKey('ArrowLeft', columns)).toBe(0)
    expect(reorderKey('ArrowLeft', { ...columns, rtl: true })).toBe(2)
    expect(reorderKey('ArrowDown', columns)).toBeNull()
  })
})

describe('the drop indicator', () => {
  test('sits before the item a move back lands on, and after the one a move forward lands on', () => {
    expect(dropMark(3, 0)).toEqual({ edge: 'before', index: 0 })
    expect(dropMark(0, 2)).toEqual({ edge: 'after', index: 2 })
  })

  test('is not drawn while the item stays where it is', () => {
    expect(dropMark(2, 2)).toBeUndefined()
  })
})

describe('the new order', () => {
  test('puts the key at its new place', () => {
    expect(placeKey(['a', 'b', 'c', 'd'], ['a', 'b', 'c', 'd'], 'a', 2)).toEqual([
      'b',
      'c',
      'a',
      'd',
    ])
    expect(placeKey(['a', 'b', 'c', 'd'], ['a', 'b', 'c', 'd'], 'd', 0)).toEqual([
      'd',
      'a',
      'b',
      'c',
    ])
  })

  test('keeps a key that is not shown in its place among the rest', () => {
    /* `x` is hidden. Moving `c` to the front puts it before `a`, and `x` stays
       between `a` and `b`. */
    expect(placeKey(['a', 'x', 'b', 'c'], ['a', 'b', 'c'], 'c', 0)).toEqual(['c', 'a', 'x', 'b'])
    expect(placeKey(['a', 'x', 'b', 'c'], ['a', 'b', 'c'], 'a', 1)).toEqual(['x', 'b', 'a', 'c'])
  })

  test('changes nothing where there is nothing else to move past', () => {
    expect(placeKey(['a'], ['a'], 'a', 0)).toEqual(['a'])
  })
})

describe('scrolling near an edge', () => {
  test('is still away from the edges', () => {
    expect(edgeSpeed(200, 0, 400)).toBe(0)
  })

  test('rises toward an edge and is the most at it and past it', () => {
    expect(edgeSpeed(30, 0, 400)).toBe(-3)
    expect(edgeSpeed(0, 0, 400)).toBe(-12)
    expect(edgeSpeed(-50, 0, 400)).toBe(-12)
    expect(edgeSpeed(380, 0, 400)).toBe(6)
    expect(edgeSpeed(500, 0, 400)).toBe(12)
  })

  test('shrinks the zones to half of a small box', () => {
    expect(edgeSpeed(25, 0, 50)).toBe(0)
    expect(edgeSpeed(0, 0, 50)).toBe(-12)
    expect(edgeSpeed(5, 5, 5)).toBe(0)
  })
})
