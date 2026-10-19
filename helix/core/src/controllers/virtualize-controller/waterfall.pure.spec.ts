import { describe, expect, test } from 'bun:test'
import { Waterfall } from './waterfall.js'

/* Five items of 100, 50, 80, 30 and 60 down two columns. */
const wall = (sizes = [100, 50, 80, 30, 60], lanes = 2): Waterfall => {
  const waterfall = new Waterfall()
  waterfall.lanes = lanes
  waterfall.place(sizes.length, (index) => sizes[index] ?? 0, 'one')
  return waterfall
}

describe('a waterfall', () => {
  test('puts each item under the column that ends highest, the leftmost of a tie', () => {
    const waterfall = wall()
    expect([0, 1, 2, 3, 4].map((at) => waterfall.lane(at))).toEqual([0, 1, 1, 0, 0])
    expect([0, 1, 2, 3, 4].map((at) => waterfall.start(at))).toEqual([0, 0, 50, 100, 130])
    expect([0, 1, 2, 3, 4].map((at) => waterfall.reachThrough(at))).toEqual([100, 100, 130, 130, 190])
    expect(waterfall.length()).toBe(190)
  })

  test('finds the first item that reaches an offset and the first that starts past it', () => {
    const waterfall = wall()
    // Items 0 and 1 end at 100 and 50, so item 2 is the first past 100.
    expect(waterfall.from(99)).toBe(0)
    expect(waterfall.from(100)).toBe(2)
    expect(waterfall.to(100)).toBe(3)
    expect(waterfall.to(101)).toBe(4)
    expect(waterfall.to(1000)).toBe(5)
  })

  test('is placed again only when what it was placed from changes', () => {
    const waterfall = new Waterfall()
    waterfall.lanes = 3
    let asked = 0
    const size = (): number => {
      asked += 1
      return 10
    }
    waterfall.place(4, size, 'a')
    waterfall.place(4, size, 'a')
    expect(asked).toBe(4)
    waterfall.place(4, size, 'b')
    expect(asked).toBe(8)
    waterfall.lanes = 2
    waterfall.place(4, size, 'b')
    expect(asked).toBe(12)
  })

  describe('by key', () => {
    test('Down and Up stay in the column', () => {
      const waterfall = wall()
      expect(waterfall.step('ArrowDown', 0, 5, 0)).toBe(3)
      expect(waterfall.step('ArrowDown', 3, 5, 0)).toBe(4)
      expect(waterfall.step('ArrowDown', 1, 5, 0)).toBe(2)
      expect(waterfall.step('ArrowUp', 2, 5, 0)).toBe(1)
      expect(waterfall.step('ArrowDown', 2, 5, 0)).toBeUndefined()
      expect(waterfall.step('ArrowUp', 0, 5, 0)).toBeUndefined()
    })

    test('across goes to the item beside it the most, in the next column or the one before', () => {
      const waterfall = wall()
      // Item 3 runs from 100 to 130, beside item 2's 50 to 130.
      expect(waterfall.step('next', 3, 5, 0)).toBe(2)
      // Item 2 runs from 50 to 130: 50 beside item 0, 30 beside item 3.
      expect(waterfall.step('previous', 2, 5, 0)).toBe(0)
      // Item 4 runs from 130 to 190, below the end of the second column.
      expect(waterfall.step('next', 4, 5, 0)).toBe(2)
      expect(waterfall.step('previous', 0, 5, 0)).toBeUndefined()
      expect(waterfall.step('next', 1, 5, 0)).toBeUndefined()
    })

    test('Page Down and Page Up move a box down or up the column', () => {
      const waterfall = wall([40, 40, 40, 40, 40, 40, 40, 40], 2)
      // Column 0 holds 0, 2, 4 and 6, at 0, 40, 80 and 120.
      expect(waterfall.step('PageDown', 0, 8, 100)).toBe(4)
      // To the item at the place a box above, 20 from the top, which is item 0.
      expect(waterfall.step('PageUp', 6, 8, 100)).toBe(0)
      expect(waterfall.step('PageUp', 6, 8, 80)).toBe(2)
      expect(waterfall.step('PageDown', 6, 8, 100)).toBeUndefined()
    })

    test('takes no other key', () => {
      expect(wall().step('Home', 2, 5, 0)).toBeUndefined()
    })
  })
})
