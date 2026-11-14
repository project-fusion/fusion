import { describe, expect, test } from 'bun:test'
import {
  gapKey,
  gapTarget,
  type Hidden,
  pageCount,
  pageRange,
  pageSizes,
  paginationSlots,
  type Slot,
} from './pagination.js'

/** A row as a reader sees it, with a gap as an ellipsis. */
const row = (slots: readonly Slot[]) =>
  slots.map((slot) => (typeof slot === 'number' ? String(slot) : '…')).join(' ')

const at = (total: number, current: number) =>
  row(paginationSlots(total, current, { boundaries: 1, siblings: 1 }))

describe('pageCount', () => {
  test('takes pages first, then the total over the size, then one', () => {
    expect(pageCount(7, 100, 10)).toBe(7)
    expect(pageCount(0, 248, 25)).toBe(10)
    expect(pageCount(0, 0, 25)).toBe(1)
  })
})

describe('paginationSlots', () => {
  test('shows every page below its widest', () => {
    expect(at(7, 4)).toBe('1 2 3 4 5 6 7')
  })

  test('holds one run at each end', () => {
    expect(at(12, 1)).toBe('1 2 3 4 5 … 12')
    expect(at(12, 12)).toBe('1 … 8 9 10 11 12')
  })

  test('holds a gap on each side in the middle', () => {
    expect(at(12, 6)).toBe('1 … 5 6 7 … 12')
  })

  test('takes a negative or a broken setting as none', () => {
    expect(row(paginationSlots(5, 1, { boundaries: -1, siblings: Number.NaN }))).toBe('1 2 …')
  })
})

describe('a gap', () => {
  const hidden: Hidden = { from: 2, to: 95 }

  test('goes to the middle of what it hides', () => {
    expect(gapTarget(hidden)).toBe(49)
  })

  test('is keyed by its side of the current page', () => {
    expect(gapKey(hidden, 97)).toBe('gap-before')
    expect(gapKey({ from: 99, to: 127 }, 97)).toBe('gap-after')
  })
})

describe('pageRange', () => {
  test('holds the last item to the total', () => {
    expect(pageRange(10, 25, 248)).toEqual({ from: 226, to: 248 })
  })

  test('holds a page past the end to the last page', () => {
    expect(pageRange(99, 25, 248)).toEqual({ from: 226, to: 248 })
  })

  test('says nothing with no count', () => {
    expect(pageRange(1, 0, 248)).toBeUndefined()
    expect(pageRange(1, 25, 0)).toBeUndefined()
  })
})

describe('pageSizes', () => {
  test('keeps the whole positive numbers', () => {
    expect(pageSizes('10, 25,x,-1,0,50')).toEqual([10, 25, 50])
  })
})
