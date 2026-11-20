/**
 * A 3D treemap's blocks between two tables: each block's key from one table
 * to the next, and the blocks at a share of the way, which the chart draws
 * while its readings move.
 */

import type {
  MotionItem,
  MotionShares,
} from '../../controllers/readings-motion-controller/readings-motion-controller.js'
import { keysOf, mix, mixAxis } from '../readings-motion/readings-motion.js'
import type { FloorArea, TreemapBlock, TreemapField } from './blocks.js'

/**
 * The key of each block of `field`, in its order: its label, numbered where a
 * label comes again. A field drawn between two tables carries each block's
 * key with it.
 */
export const blockKeys = (field: TreemapField): string[] => {
  const keys = keysOf(field.blocks.map((block) => block.label))
  return field.blocks.map((block, index) => block.key ?? (keys[index] as string))
}

/** Each block as the chart's motion knows it: by its key, growing in in the table's order. */
export const blockItems = (field: TreemapField): MotionItem[] =>
  blockKeys(field).map((key, step) => ({ key, step }))

/** A part of the floor `share` of the way from one to another. */
const mixArea = (from: FloorArea, to: FloorArea, share: number): FloorArea => ({
  x0: mix(from.x0, to.x0, share),
  x1: mix(from.x1, to.x1, share),
  z0: mix(from.z0, to.z0, share),
  z1: mix(from.z1, to.z1, share),
})

/** The middle of a part of the floor, as a part with no size. */
const middleOf = (area: FloorArea): FloorArea => {
  const [x, z] = [(area.x0 + area.x1) / 2, (area.z0 + area.z1) / 2]
  return { x0: x, x1: x, z0: z, z1: z }
}

/**
 * The blocks `at` the shares between `from` and `to`, which the chart draws
 * while its readings move. **A block both tables hold moves** to its new
 * part of the floor and its new height. **A block only `to` holds grows**:
 * from the floor while the chart grows in, and in a later table from the
 * middle of its part of the floor as well, while its neighbors make room.
 * **A block only `from` held shrinks** to the middle of its part and to the
 * floor, after `to`'s blocks, and goes. The height's axis moves with
 * `at.axes`. With no `from`, every block rises from the floor where it
 * stands.
 */
export const blocksBetween = (
  from: TreemapField | undefined,
  to: TreemapField,
  at: MotionShares,
): TreemapField => {
  const before = new Map<string, TreemapBlock>()
  if (from) {
    const had = blockKeys(from)
    from.blocks.forEach((block, index) => {
      before.set(had[index] as string, block)
    })
  }
  const keys = blockKeys(to)
  const blocks: TreemapBlock[] = to.blocks.map((block, index) => {
    const key = keys[index] as string
    const share = at.share(key)
    const old = before.get(key)
    if (!old || at.floor(key)) {
      const start = old ? old.area : from ? middleOf(block.area) : block.area
      return { ...block, area: mixArea(start, block.area, share), grown: share, key }
    }
    const height =
      old.height !== undefined && block.height !== undefined
        ? mix(old.height, block.height, share)
        : block.height
    return {
      ...block,
      area: mixArea(old.area, block.area, share),
      grown: mix(old.grown ?? 1, 1, share),
      height,
      key,
    }
  })
  const kept = new Set(keys)
  for (const [key, old] of before) {
    const share = at.share(key)
    if (!kept.has(key) && share < 1) {
      blocks.push({
        ...old,
        area: mixArea(old.area, middleOf(old.area), share),
        grown: (old.grown ?? 1) * (1 - share),
        key,
      })
    }
  }
  if (!from || at.axes >= 1 || from.height !== to.height) {
    return { ...to, blocks }
  }
  const [fx, fy, fz] = from.axes.extent
  const [tx, ty, tz] = to.axes.extent
  return {
    ...to,
    axes: {
      ...to.axes,
      extent: [mix(fx, tx, at.axes), mix(fy, ty, at.axes), mix(fz, tz, at.axes)],
      y: mixAxis(from.axes.y, to.axes.y, at.axes),
    },
    blocks,
  }
}
