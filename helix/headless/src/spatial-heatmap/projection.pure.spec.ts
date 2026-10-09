import { describe, expect, test } from 'bun:test'
import { ACROSS, heightsOf, highestOf, MARGIN, reliefOf, THICKNESS } from './projection.js'

/** The corners of path data written `Mx yLx y…Z`, as numbers. */
const corners = (data: string): Array<[number, number]> =>
  data
    .replace(/^M|Z$/g, '')
    .split('L')
    .map((pair) => pair.split(' ').map(Number) as [number, number])

describe('heights', () => {
  test('stand from zero, as a share of the highest reading', () => {
    expect(heightsOf([2, 4, 1], 4, 3)).toEqual([1.5, 3, 0.75])
  })

  test('a blank, a zero, and a negative reading stand at zero', () => {
    expect(heightsOf([undefined, 0, -3, 6], 6, 2)).toEqual([0, 0, 0, 2])
  })

  /* The highest is taken over the whole table, so a narrow strip that draws
     the newest readings keeps the heights a wide one draws. */
  test('a reading drawn against a higher one it does not draw keeps its share', () => {
    expect(heightsOf([5], 10, 4)).toEqual([2])
  })

  test('with nothing above zero, everything is flat', () => {
    expect(heightsOf([0, undefined], highestOf([0, undefined]), 3)).toEqual([0, 0])
  })

  test('the highest is the largest positive reading', () => {
    expect(highestOf([3, undefined, 9, -12])).toBe(9)
    expect(highestOf([])).toBe(0)
  })
})

describe('the relief', () => {
  test('fills down a column of rows, then across', () => {
    const { prisms } = reliefOf([0, 0, 0, 0], 2, 1)
    /* The third reading starts the second column, one step down to the right
       of the first. */
    expect(prisms[2]?.peak.x).toBeCloseTo((prisms[0]?.peak.x ?? 0) + ACROSS)
    expect(prisms[2]?.peak.y).toBeCloseTo((prisms[0]?.peak.y ?? 0) + 0.5)
    /* The second reading is the next row, one step down to the left. */
    expect(prisms[1]?.peak.x).toBeCloseTo((prisms[0]?.peak.x ?? 0) - ACROSS)
    expect(prisms[1]?.peak.y).toBeCloseTo((prisms[0]?.peak.y ?? 0) + 0.5)
  })

  test('a prism is raised by its height, and its sides span it', () => {
    const { prisms } = reliefOf([2], 1, 1)
    const top = corners(prisms[0]?.top ?? '')
    const right = corners(prisms[0]?.right ?? '')
    expect(prisms[0]?.peak.y).toBeCloseTo(0.5 - 2)
    /* The right face runs from the top's front and right corners down to the
       floor beneath them. */
    expect(right[0]).toEqual(top[2] as [number, number])
    expect(right[1]).toEqual(top[1] as [number, number])
    expect((right[2]?.[1] ?? 0) - (right[1]?.[1] ?? 0)).toBeCloseTo(2)
  })

  /**
   * **Each prism is painted after the neighbors it can cover.** The one before
   * it in its column and the one in the same row of the column before stand
   * behind it, so their tops are higher on the page; the next in each
   * direction stands in front, lower.
   */
  test('the order of the readings is back to front', () => {
    const { prisms } = reliefOf(Array(14).fill(1), 7, 1)
    const depth = (index: number) => prisms[index]?.peak.y ?? Number.NaN
    expect(depth(8)).toBeGreaterThan(depth(7))
    expect(depth(8)).toBeGreaterThan(depth(1))
  })

  test('the footprint leaves a gap between neighbors', () => {
    const whole = corners(reliefOf([0], 1, 1).prisms[0]?.top ?? '')
    const most = corners(reliefOf([0], 1, 0.8).prisms[0]?.top ?? '')
    /* The right corner, pulled in by a tenth of a cell at each end. */
    expect((whole[1]?.[0] ?? 0) - (most[1]?.[0] ?? 0)).toBeCloseTo(0.2 * ACROSS)
  })

  test('the box holds every corner, the tallest top included', () => {
    const { box, prisms } = reliefOf([0, 3, 1, 0], 2, 1)
    const all = prisms.flatMap((prism) => [prism.top, prism.left, prism.right].flatMap(corners))
    for (const [x, y] of all) {
      expect(x).toBeGreaterThanOrEqual(box.x - 1e-3)
      expect(x).toBeLessThanOrEqual(box.x + box.width + 1e-3)
      expect(y).toBeGreaterThanOrEqual(box.y - 1e-3)
      expect(y).toBeLessThanOrEqual(box.y + box.height + 1e-3)
    }
    /* The second reading is the tallest, three cells above the floor. */
    expect(box.y).toBeCloseTo(0.5 - 3)
  })

  test('the slab reaches past the grid, and the box holds it', () => {
    const { box, base, corners } = reliefOf([1, 2, 3, 4, 5], 2, 1)
    /* Three columns of two rows, the last still filling: the slab is the
       whole grid, its left corner under the first column's last row. */
    expect(corners?.start.x).toBeCloseTo((-MARGIN - (2 + MARGIN)) * ACROSS)
    expect(corners?.start.y).toBeCloseTo((-MARGIN + 2 + MARGIN) / 2 + THICKNESS)
    expect(corners?.end.x).toBeCloseTo((3 + MARGIN - (2 + MARGIN)) * ACROSS)
    expect(corners?.end.y).toBeCloseTo((3 + MARGIN + 2 + MARGIN) / 2 + THICKNESS)
    expect(box.x).toBeCloseTo(corners?.start.x ?? 0)
    expect(box.y + box.height).toBeCloseTo(corners?.end.y ?? 0)
    expect(base?.top.startsWith('M')).toBe(true)
  })

  test('no readings draw nothing in an empty box', () => {
    expect(reliefOf([], 7, 1)).toEqual({
      base: undefined,
      box: { height: 0, width: 0, x: 0, y: 0 },
      corners: undefined,
      prisms: [],
    })
  })

  test('a number is written short, and never as minus zero', () => {
    const { prisms } = reliefOf([0], 1, 1)
    expect(prisms[0]?.top).toBe('M0 0L0.866 0.5L0 1L-0.866 0.5Z')
  })
})
