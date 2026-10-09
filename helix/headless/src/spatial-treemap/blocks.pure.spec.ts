import { describe, expect, test } from 'bun:test'
import { projectionOf } from '@fusion.dev/helix-core'
import { blocksDrawn, type FloorArea, paintOrder, squarified, treemapOf } from './blocks.js'

const row = (label: string, team: string, ...values: Array<number | undefined>) => ({
  cells: [
    { name: 'Team', text: team, value: undefined },
    ...values.map((value, at) => ({
      name: ['Requests', 'Errors'][at] ?? '',
      text: value === undefined ? '' : String(value),
      value,
    })),
  ],
  label,
})

const areaOf = (area: FloorArea): number => (area.x1 - area.x0) * (area.z1 - area.z0)

const FLOOR: FloorArea = { x0: -1, x1: 1, z0: -1, z1: 1 }

describe('the floor shared out', () => {
  test('in proportion to each size, filling the floor', () => {
    const areas = squarified([6, 6, 4, 3, 2, 2, 1], FLOOR)
    const whole = areaOf(FLOOR)
    const total = 24
    areas.forEach((area, at) => {
      expect(areaOf(area)).toBeCloseTo((whole * ([6, 6, 4, 3, 2, 2, 1][at] ?? 0)) / total)
    })
    expect(areas.reduce((sum, area) => sum + areaOf(area), 0)).toBeCloseTo(whole)
  })

  test('as near to square as a row allows, as in the paper that set it out', () => {
    /* Bruls, Huizing, and van Wijk's own example, whose worst part is 2.78. */
    for (const area of squarified([6, 6, 4, 3, 2, 2, 1], { x0: 0, x1: 6, z0: 0, z1: 4 })) {
      const [across, deep] = [area.x1 - area.x0, area.z1 - area.z0]
      expect(Math.max(across, deep) / Math.min(across, deep)).toBeLessThan(3)
    }
  })

  test('no two parts overlap', () => {
    const areas = squarified([5, 4, 3, 2, 1], FLOOR)
    for (const [at, one] of areas.entries()) {
      for (const other of areas.slice(at + 1)) {
        const apart =
          one.x1 <= other.x0 + 1e-9 ||
          other.x1 <= one.x0 + 1e-9 ||
          one.z1 <= other.z0 + 1e-9 ||
          other.z1 <= one.z0 + 1e-9
        expect(apart).toBe(true)
      }
    }
  })
})

describe('the table read as a treemap', () => {
  const rows = [
    row('Search', 'Platform', 40, 2),
    row('Billing', 'Payments', 25, 9),
    row('Auth', 'Platform', 20, 1),
    row('Refunds', 'Payments', 5, 3),
    row('Ledger', 'Payments', undefined, 4),
    row('Gateway', 'Platform', 0, 4),
  ]
  const field = treemapOf(rows, [1, 2], 'Team')

  test('the first numeric column is the size and the second the height, and a row with no size is left out', () => {
    expect(field.size).toBe('Requests')
    expect(field.height).toBe('Errors')
    expect(field.blocks.map((block) => block.label)).toEqual([
      'Search',
      'Billing',
      'Auth',
      'Refunds',
    ])
    expect(field.groups).toEqual(['Platform', 'Payments'])
  })

  test("a group's share of the floor is its total, less the space between groups", () => {
    const shareOf = (group: string) =>
      field.blocks
        .filter((block) => block.group === group)
        .reduce((sum, block) => sum + areaOf(block.area), 0)
    /* Platform's 60 against Payments' 30, give or take the gaps. */
    expect(shareOf('Platform') / shareOf('Payments')).toBeGreaterThan(1.6)
    expect(shareOf('Platform') / shareOf('Payments')).toBeLessThan(2.4)
  })

  test('the height axis runs from zero, and with no height column the blocks are one slab', () => {
    expect(field.axes.y.range[0]).toBe(0)
    expect(field.axes.y.name).toBe('Errors')
    const flat = treemapOf(rows, [1], 'Team')
    expect(flat.height).toBe('')
    expect(flat.axes.extent[1]).toBeLessThan(0.1)
    expect(flat.axes.y.ticks).toEqual([])
  })
})

describe('the order of painting', () => {
  test('a long block beside a small one goes first where its near end is behind it', () => {
    /* A long block across the back and a small one in front of its near
       end: the middle of the long one is nearer the camera than the small
       one's from this side, though the small one stands in front of it. */
    const field = treemapOf([row('Long', '', 9, 1), row('Small', '', 1, 1)], [1, 2])
    const projection = projectionOf({ tilt: 30, turn: 40 })
    const drawn = blocksDrawn(field, projection)
    const order = paintOrder(projection, drawn).map((block) => field.blocks[block.index]?.label)
    const [long, small] = [drawn[0], drawn[1]]
    const nearer = (one: typeof long, other: typeof long): boolean => {
      if (!one || !other) {
        return false
      }
      const [x, y] = projection.toward
      const apart =
        one.floor.x1 <= other.floor.x0
          ? x
          : one.floor.y1 <= other.floor.y0
            ? y
            : one.floor.x0 >= other.floor.x1
              ? -x
              : -y
      return apart < 0
    }
    expect(order.indexOf('Long') < order.indexOf('Small')).toBe(nearer(small, long))
  })

  test('every block is painted once', () => {
    const field = treemapOf(
      Array.from({ length: 30 }, (_, at) => row(`R${at}`, `G${at % 4}`, 30 - at, at)),
      [1, 2],
      'Team',
    )
    const projection = projectionOf({ tilt: 30, turn: 130 })
    const order = paintOrder(projection, blocksDrawn(field, projection))
    expect(new Set(order.map((block) => block.index)).size).toBe(30)
  })
})
