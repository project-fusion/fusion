/**
 * A 3D treemap's table read as blocks on a floor, each as large as its size.
 *
 * Kept apart from the element because it is arithmetic a picture hides: a
 * floor not shared out in proportion makes one item look larger than another
 * that is the same, and blocks painted in the wrong order cover the ones in
 * front of them.
 */

import { type Drawn, type PagePoint, type Projection, solid, ticks } from '@fusion.dev/helix-core'
import { type FieldRow, niceRange, type PlotAxis } from '../spatial-scatter-chart/field.js'
import { type BoxExtent, inBox } from '../spatial-scatter-chart/view.js'

/** How tall the box stands over its floor where a column gives each block a height. */
const HEIGHT = 0.6

/** How thick the slab is where no column gives a height, so the blocks read as a plan. */
const SLAB = 0.06

/** The space between two groups on the floor, in the box's own units, the floor being two across. */
const GROUP_GAP = 0.05

/** The space between two blocks in a group. */
const BLOCK_GAP = 0.018

/** A part of the floor: across from `x0` to `x1`, and in depth from `z0` to `z1`, each from -1 to 1. */
export interface FloorArea {
  x0: number
  x1: number
  z0: number
  z1: number
}

/** One row drawn as a block. */
export interface TreemapBlock {
  /** Its part of the floor, inside its group's. */
  area: FloorArea
  /** Its group, from the `group-by` column, or `''` where there is none. */
  group: string
  /** Its group's place among the groups, which its color is read by. */
  groupIndex: number
  /** Its height, from the second numeric column, where the table has one. */
  height?: number | undefined
  /** The row's own label. */
  label: string
  /** The row it was read from, counting from zero. */
  row: number
  /** Its size, from the first numeric column, which its share of the floor is. */
  size: number
}

/** The table as a 3D treemap reads it. */
export interface TreemapField {
  /**
   * Across and in depth, the floor, which the blocks share out and which
   * carries no measure; up, the height, from zero.
   */
  axes: { extent: BoxExtent; x: PlotAxis; y: PlotAxis; z: PlotAxis }
  /** Every block, in the table's order, which the keys walk. */
  blocks: TreemapBlock[]
  /** Every group, in the order its first row comes. */
  groups: string[]
  /** The height column's heading, or `''` where there is none. */
  height: string
  /** The size column's heading. */
  size: string
}

/** The sum of some numbers. */
const sum = (values: readonly number[]): number => values.reduce((total, value) => total + value, 0)

/**
 * The floor shared out among `sizes`, by squarified layout: in proportion to
 * each, and as near to square as a row of them allows, so a long, thin sliver
 * is rare and two sizes compare by area. `sizes` run from the largest down,
 * and so does what is returned, the largest at the low corner.
 */
export const squarified = (sizes: readonly number[], within: FloorArea): FloorArea[] => {
  const total = sum(sizes)
  const across = within.x1 - within.x0
  const deep = within.z1 - within.z0
  if (total <= 0 || across <= 0 || deep <= 0) {
    return sizes.map(() => ({ ...within, x1: within.x0, z1: within.z0 }))
  }
  const areas = sizes.map((size) => (size / total) * across * deep)
  const placed: FloorArea[] = []
  const free = { ...within }
  /* How far from square the worst of a row is, laid along a side this long. */
  const worst = (row: readonly number[], side: number): number => {
    const all = sum(row)
    const [most, least] = [Math.max(...row), Math.min(...row)]
    return Math.max((side * side * most) / (all * all), (all * all) / (side * side * least))
  }
  let at = 0
  while (at < areas.length) {
    const wide = free.x1 - free.x0 >= free.z1 - free.z0
    const side = wide ? free.z1 - free.z0 : free.x1 - free.x0
    const row = [areas[at] as number]
    let next = at + 1
    while (
      next < areas.length &&
      worst([...row, areas[next] as number], side) <= worst(row, side)
    ) {
      row.push(areas[next] as number)
      next++
    }
    /* The row stands along the shorter side, as thick as its areas need. */
    const thick = sum(row) / side
    let along = wide ? free.z0 : free.x0
    for (const area of row) {
      const length = area / thick
      placed.push(
        wide
          ? { x0: free.x0, x1: free.x0 + thick, z0: along, z1: along + length }
          : { x0: along, x1: along + length, z0: free.z0, z1: free.z0 + thick },
      )
      along += length
    }
    if (wide) {
      free.x0 += thick
    } else {
      free.z0 += thick
    }
    at = next
  }
  return placed
}

/** A part of the floor less a margin round it, never more than a quarter of its shorter side. */
const inset = (area: FloorArea, gap: number): FloorArea => {
  const margin = Math.min(gap / 2, (area.x1 - area.x0) / 4, (area.z1 - area.z0) / 4)
  return {
    x0: area.x0 + margin,
    x1: area.x1 - margin,
    z0: area.z0 + margin,
    z1: area.z1 - margin,
  }
}

/** An axis that carries no measure: the floor from edge to edge, with no ticks and no grid. */
const FLOOR: PlotAxis = { name: '', range: [-1, 1], rules: [], ticks: [] }

/**
 * Reads the table: **the first numeric column is each block's size, and the
 * second, where there is one, its height**, and `groupBy` names a column
 * whose text puts each block in a group. A row with no size, or a size of
 * zero or less, has no share of the floor and is left out.
 *
 * The floor is shared among the groups by their totals, and each group's
 * share among its blocks, so a group's whole area is its total. **The
 * largest stand at the back left**, where they hide the least.
 */
export const treemapOf = (
  rows: readonly FieldRow[],
  columns: readonly number[],
  groupBy = '',
): TreemapField => {
  const nameOf = (column: number | undefined): string =>
    column === undefined ? '' : (rows.find((row) => row.cells[column])?.cells[column]?.name ?? '')
  const [sizeAt, heightAt] = columns.filter((column) => nameOf(column) !== groupBy)
  const groups: string[] = []
  const blocks: TreemapBlock[] = []
  rows.forEach((row, at) => {
    const size = sizeAt === undefined ? undefined : row.cells[sizeAt]?.value
    if (size === undefined || !Number.isFinite(size) || size <= 0) {
      return
    }
    const height = heightAt === undefined ? undefined : row.cells[heightAt]?.value
    const group = groupBy ? (row.cells.find((cell) => cell.name === groupBy)?.text ?? '') : ''
    let groupIndex = groups.indexOf(group)
    if (groupIndex < 0) {
      groupIndex = groups.push(group) - 1
    }
    blocks.push({
      area: { x0: 0, x1: 0, z0: 0, z1: 0 },
      group,
      groupIndex,
      height: Number.isFinite(height) ? height : undefined,
      label: row.label,
      row: at,
      size,
    })
  })
  const totals = groups.map((_, index) =>
    sum(blocks.filter((block) => block.groupIndex === index).map((block) => block.size)),
  )
  const byTotal = groups
    .map((_, index) => index)
    .sort((one, other) => (totals[other] ?? 0) - (totals[one] ?? 0))
  const shares = squarified(
    byTotal.map((index) => totals[index] ?? 0),
    { x0: -1, x1: 1, z0: -1, z1: 1 },
  )
  byTotal.forEach((index, at) => {
    const share = shares[at]
    if (!share) {
      return
    }
    const members = blocks
      .filter((block) => block.groupIndex === index)
      .sort((one, other) => other.size - one.size)
    const areas = squarified(
      members.map((block) => block.size),
      groups.length > 1 ? inset(share, GROUP_GAP) : share,
    )
    members.forEach((block, place) => {
      block.area = inset(areas[place] as FloorArea, BLOCK_GAP)
    })
  })
  const heights = blocks.flatMap((block) => (block.height === undefined ? [] : [block.height]))
  const tall = heightAt !== undefined
  const [low, high] = [Math.min(0, ...heights), Math.max(0, ...heights)]
  const range: [number, number] = !tall || low === high ? [0, 1] : niceRange(low, high)
  return {
    axes: {
      extent: [1, tall ? HEIGHT : SLAB, 1],
      x: FLOOR,
      y: tall ? { name: nameOf(heightAt), range, ticks: ticks(range) } : { ...FLOOR, range },
      z: FLOOR,
    },
    blocks,
    groups,
    height: nameOf(heightAt),
    size: nameOf(sizeAt),
  }
}

/** A block as the chart's own drawing paints it. */
export interface DrawnBlock {
  /** Its eight corners on the page, which a drawing with no box is framed around. */
  corners: PagePoint[]
  drawn: Drawn
  /** Its footprint on the projection's floor: across from `x0` to `x1`, and back from `y0` to `y1`. */
  floor: { x0: number; x1: number; y0: number; y1: number }
  /** Its place in `field.blocks`. */
  index: number
}

/**
 * Each block as a solid, seen through `projection`: on its part of the floor,
 * from zero to its height, or as a slab where the table gives no heights. A
 * height below zero hangs from zero.
 */
export const blocksDrawn = (field: TreemapField, projection: Projection): DrawnBlock[] => {
  const [ex, ey, ez] = field.axes.extent
  const zero = inBox(field.axes.y, 0) * ey
  const tall = field.height !== ''
  return field.blocks.map((block, index): DrawnBlock => {
    const top = inBox(field.axes.y, tall ? (block.height ?? 0) : 1) * ey
    const base = Math.min(zero, top)
    const height = Math.abs(top - zero)
    /* The floor's way back is the box's depth turned round, as the box's own
       places are. */
    const floor = {
      x0: block.area.x0 * ex,
      x1: block.area.x1 * ex,
      y0: -block.area.z1 * ez,
      y1: -block.area.z0 * ez,
    }
    const lifted: Projection = {
      ...projection,
      at: (px, py, pz = 0) => projection.at(px, py, pz + base),
    }
    const corners: PagePoint[] = []
    for (const cx of [floor.x0, floor.x1]) {
      for (const cy of [floor.y0, floor.y1]) {
        corners.push(lifted.at(cx, cy, 0), lifted.at(cx, cy, height))
      }
    }
    return {
      corners,
      drawn: solid(
        lifted,
        'block',
        (floor.x0 + floor.x1) / 2,
        (floor.y0 + floor.y1) / 2,
        floor.x1 - floor.x0,
        height,
        floor.y1 - floor.y0,
      ),
      floor,
      index,
    }
  })
}

/** Below this, a direction along the floor is level with the view, and orders nothing. */
const LEVEL = 1e-9

/**
 * The blocks in the order to paint them, back to front.
 *
 * **Two blocks whose footprints do not overlap are parted by a line across or
 * in depth**, and the camera sees the far side of that line first, so the
 * block on it goes first. Ordering by each block's middle alone fails on a
 * treemap, where a long block beside a small one has its middle further back
 * though its near end stands in front. Where two lines give opposite orders,
 * no view sees one block through the other, and neither is held first.
 */
export const paintOrder = (projection: Projection, blocks: readonly DrawnBlock[]): DrawnBlock[] => {
  const [ax, ay] = projection.toward
  /** `-1` where `one` goes first, `1` where `other` does, and `0` where either may. */
  const along = (
    oneLow: number,
    oneHigh: number,
    otherLow: number,
    otherHigh: number,
    toward: number,
  ): number => {
    if (Math.abs(toward) < LEVEL) {
      return 0
    }
    if (oneHigh <= otherLow) {
      return toward > 0 ? -1 : 1
    }
    if (otherHigh <= oneLow) {
      return toward > 0 ? 1 : -1
    }
    return 0
  }
  const count = blocks.length
  const after: number[][] = Array.from({ length: count }, () => [])
  const waiting = new Array<number>(count).fill(0)
  for (let one = 0; one < count; one++) {
    for (let other = one + 1; other < count; other++) {
      const [a, b] = [(blocks[one] as DrawnBlock).floor, (blocks[other] as DrawnBlock).floor]
      const across = along(a.x0, a.x1, b.x0, b.x1, ax)
      const back = along(a.y0, a.y1, b.y0, b.y1, ay)
      const order = across !== 0 && back !== 0 && across !== back ? 0 : across || back
      if (order < 0) {
        after[one]?.push(other)
        waiting[other] = (waiting[other] ?? 0) + 1
      } else if (order > 0) {
        after[other]?.push(one)
        waiting[one] = (waiting[one] ?? 0) + 1
      }
    }
  }
  /* Of the blocks nothing still waits on, the furthest back goes first, which
     also settles a ring of orders, should one arise, the way the middles do. */
  const depthOf = blocks.map((block) =>
    projection.depth((block.floor.x0 + block.floor.x1) / 2, (block.floor.y0 + block.floor.y1) / 2),
  )
  const done = new Array<boolean>(count).fill(false)
  const order: DrawnBlock[] = []
  for (let step = 0; step < count; step++) {
    let pick = -1
    for (let at = 0; at < count; at++) {
      if (done[at]) {
        continue
      }
      const free = waiting[at] === 0
      const best = pick < 0 ? undefined : waiting[pick] === 0
      if (
        pick < 0 ||
        (free && !best) ||
        (free === best && (depthOf[at] ?? 0) < (depthOf[pick] ?? 0))
      ) {
        pick = at
      }
    }
    done[pick] = true
    order.push(blocks[pick] as DrawnBlock)
    for (const next of after[pick] ?? []) {
      waiting[next] = (waiting[next] ?? 0) - 1
    }
  }
  return order
}
