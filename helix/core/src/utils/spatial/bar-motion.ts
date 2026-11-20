/**
 * A 3D bar chart's bars between two tables: each cell's key from one table
 * to the next, and the bars at a share of the way, which the chart draws
 * while its readings move.
 */

import type {
  MotionItem,
  MotionShares,
} from '../../controllers/readings-motion-controller/readings-motion-controller.js'
import { keysOf, mix, mixAxis } from '../readings-motion/readings-motion.js'
import type { BarCell, BarField } from './bars.js'

/** The key a cell is known by from one table to the next: its category's key and its series'. */
const cellKey = (category: string, series: string): string => `${category}\u0001${series}`

/**
 * The key of each cell of `field`, in the order of its cells: its
 * category's name and its series', each numbered where it comes again. A
 * field drawn between two tables carries each cell's key with it.
 */
export const barKeys = (field: BarField): string[] => {
  const categories = keysOf(field.categories)
  const series = keysOf(field.series)
  return field.cells.map(
    (cell) => cell.key ?? cellKey(categories[cell.across] ?? cell.label, series[cell.depth] ?? ''),
  )
}

/** Each cell of `field` as the chart's motion knows it: by its key, growing in with its category. */
export const barItems = (field: BarField): MotionItem[] => {
  const keys = barKeys(field)
  return field.cells.map((cell, index) => ({ key: keys[index] as string, step: cell.across }))
}

/** A cell `share` of the way from the floor to its reading: its block and where it starts, both from zero. */
const grownTo = (cell: BarCell, share: number): Pick<BarCell, 'from' | 'value'> => ({
  from: cell.from * share,
  value: cell.value === undefined ? undefined : cell.value * share,
})

/**
 * The bars `at` the shares between `from` and `to`, which the chart draws
 * while its readings move: `to`'s cells, each at its share of the way from
 * its reading in `from` to its reading in `to`, then each cell `from` had
 * and `to` does not, shrinking to the floor. **A cell moves along the floor
 * as well as up**, so a category added before it slides it across. The axes
 * move with `at.axes`, and the value axis's ticks are the new ones from the
 * start. With no `from`, every bar grows from the floor.
 */
export const barsBetween = (
  from: BarField | undefined,
  to: BarField,
  at: MotionShares,
): BarField => {
  const keys = barKeys(to)
  const before = new Map<string, BarCell>()
  if (from) {
    const had = barKeys(from)
    from.cells.forEach((cell, index) => {
      before.set(had[index] as string, cell)
    })
  }
  const cells: BarCell[] = to.cells.map((cell, index) => {
    const key = keys[index] as string
    const share = at.share(key)
    const old = before.get(key)
    if (!old || at.floor(key) || old.value === undefined) {
      return { ...cell, key, ...grownTo(cell, share) }
    }
    if (cell.value === undefined) {
      /* A reading that went shrinks where it stood. */
      return share >= 1 ? { ...cell, key } : { ...old, key, ...grownTo(old, 1 - share) }
    }
    return {
      ...cell,
      across: mix(old.across, cell.across, share),
      from: mix(old.from, cell.from, share),
      key,
      lane: mix(old.lane, cell.lane, share),
      value: mix(old.value, cell.value, share),
      ...(old.depth !== cell.depth && share < 1 ? { wore: { depth: old.depth, share } } : {}),
    }
  })
  const kept = new Set(keys)
  for (const [key, old] of before) {
    const share = at.share(key)
    if (!kept.has(key) && share < 1 && old.value !== undefined) {
      cells.push({ ...old, key, ...grownTo(old, 1 - share) })
    }
  }
  if (!from || at.axes >= 1) {
    return { ...to, cells }
  }
  const [fx, fy, fz] = from.axes.extent
  const [tx, ty, tz] = to.axes.extent
  return {
    ...to,
    axes: {
      extent: [mix(fx, tx, at.axes), mix(fy, ty, at.axes), mix(fz, tz, at.axes)],
      x: mixAxis(from.axes.x, to.axes.x, at.axes),
      y: mixAxis(from.axes.y, to.axes.y, at.axes),
      z: mixAxis(from.axes.z, to.axes.z, at.axes),
    },
    cells,
  }
}
