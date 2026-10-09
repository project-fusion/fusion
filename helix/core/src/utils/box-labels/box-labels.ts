/**
 * Where a box's numbers and names stand on the page, from whichever side it
 * is seen: the box a spatial chart draws its readings in, in SVG or with
 * three.js.
 *
 * **Each axis is written along the edge that faces the reader**, outside the
 * box. Across and depth are written along the floor's two edges nearest the
 * reader, and up along the upright edge at the left of the box on the page.
 * Each number stands off its edge on the side away from the box, the side of
 * it nearest the edge, and each name stands beyond its numbers. So a turn
 * moves the numbers to the edges that face the reader, and none is written
 * behind the box or inside it.
 *
 * **A number that would cover another label is left out**, which thins an
 * axis seen at a slant, and an axis whose edge is seen end on is left out
 * whole. Every name is kept.
 *
 * Pure, and measured in the page's own units: the SVG drawing passes its
 * drawing's units, and three.js passes pixels.
 */

import type { PagePoint } from '../projection/projection.js'

/** A place in the box: across, up, and in depth toward the reader, each from -1 to 1. */
export type BoxPlace = readonly [number, number, number]

/** A place on the page, and how near the reader it stands: the larger, the nearer. */
export interface SeenPlace extends PagePoint {
  depth: number
}

/** One axis' name, and its numbers at their places along it, from -1 to 1. */
export interface BoxAxisText {
  name: string
  ticks: readonly { at: number; text: string }[]
}

/** A number or a name, centered on its place on the page. */
export interface BoxLabel {
  /** Whether it is an axis' name, which is written larger. */
  name: boolean
  text: string
  x: number
  y: number
}

/** How large the labels are, in the page's units. */
export interface BoxLabelSizes {
  /** The space between an edge and its numbers, and between the numbers and the name. */
  gap: number
  /** How tall a name is. */
  name: number
  /** How tall a number is. */
  tick: number
  /** How wide a character is, as a share of its height, which is near enough to keep labels apart. */
  wide: number
}

/** A label's box on the page: its middle and its half width and height. */
interface Area {
  half: { height: number; width: number }
  x: number
  y: number
}

/**
 * Whether two labels would cover each other. **By their ink**, which stands
 * about four fifths of a line tall: measured by the whole line, the names of
 * a bar chart's categories, a line and a quarter apart down a slanted edge,
 * read as touching and every other one was left out.
 */
const INK = 0.8
const overlaps = (one: Area, other: Area, pad: number): boolean =>
  Math.abs(one.x - other.x) < one.half.width + other.half.width + pad &&
  Math.abs(one.y - other.y) < (one.half.height + other.half.height) * INK + pad

/**
 * The numbers and names of a box's three axes, placed on the page for a
 * view `seen` takes each place in the box through.
 */
export const boxLabels = (
  seen: (place: BoxPlace) => SeenPlace,
  axes: { x: BoxAxisText; y: BoxAxisText; z: BoxAxisText },
  sizes: BoxLabelSizes,
): BoxLabel[] => {
  const corners: SeenPlace[] = []
  for (const x of [-1, 1]) {
    for (const y of [-1, 1]) {
      for (const z of [-1, 1]) {
        corners.push(seen([x, y, z]))
      }
    }
  }
  const middle = {
    x: corners.reduce((sum, corner) => sum + corner.x, 0) / corners.length,
    y: corners.reduce((sum, corner) => sum + corner.y, 0) / corners.length,
  }
  const reach = Math.max(
    Math.max(...corners.map((corner) => corner.x)) - Math.min(...corners.map((corner) => corner.x)),
    Math.max(...corners.map((corner) => corner.y)) - Math.min(...corners.map((corner) => corner.y)),
  )
  /* The floor's edges nearest the reader, and the upright furthest left on
     the page, the nearer of two that stand one over the other. */
  const back = seen([0, -1, 1]).depth >= seen([0, -1, -1]).depth ? 1 : -1
  const side = seen([1, -1, 0]).depth >= seen([-1, -1, 0]).depth ? 1 : -1
  let upright: { at: SeenPlace; x: number; z: number } | undefined
  for (const x of [-1, 1]) {
    for (const z of [-1, 1]) {
      const at = seen([x, -1, z])
      const further = upright === undefined || at.x < upright.at.x - reach * 1e-3
      const level = upright !== undefined && Math.abs(at.x - upright.at.x) <= reach * 1e-3
      if (further || (level && upright !== undefined && at.depth > upright.at.depth)) {
        upright = { at, x, z }
      }
    }
  }
  const { x: ux, z: uz } = upright as { x: number; z: number }
  const edges: Array<{ along: (t: number) => BoxPlace; key: 'x' | 'y' | 'z' }> = [
    { along: (t) => [t, -1, back], key: 'x' },
    { along: (t) => [side, -1, t], key: 'z' },
    { along: (t) => [ux, t, uz], key: 'y' },
  ]
  const size = (text: string, name: boolean): { height: number; width: number } => {
    const height = name ? sizes.name : sizes.tick
    return { height, width: text.length * height * sizes.wide }
  }
  /* A label of this size off `at` in direction `out`, the side of it
     nearest `at` a gap away. */
  const off = (
    at: PagePoint,
    out: PagePoint,
    box: { height: number; width: number },
    by: number,
  ): Area => ({
    half: { height: box.height / 2, width: box.width / 2 },
    x: at.x + out.x * by + (out.x * box.width) / 2,
    y: at.y + out.y * by + (out.y * box.height) / 2,
  })
  const names: Array<Area & { text: string }> = []
  const ticks: Array<Area & { text: string }> = []
  for (const { along, key } of edges) {
    const axis = axes[key]
    const [from, to] = [seen(along(-1)), seen(along(1))]
    const length = Math.hypot(to.x - from.x, to.y - from.y)
    /* Seen end on: its numbers would stand on one another. */
    if (length < reach * 0.05) {
      continue
    }
    /* Square to the edge on the page, away from the middle of the box. */
    let out = { x: -(to.y - from.y) / length, y: (to.x - from.x) / length }
    const away = { x: (from.x + to.x) / 2 - middle.x, y: (from.y + to.y) / 2 - middle.y }
    if (out.x * away.x + out.y * away.y < 0) {
      out = { x: -out.x, y: -out.y }
    }
    let deepest = 0
    for (const tick of axis.ticks) {
      const box = size(tick.text, false)
      ticks.push({ ...off(seen(along(tick.at)), out, box, sizes.gap), text: tick.text })
      deepest = Math.max(deepest, Math.abs(out.x) * box.width + Math.abs(out.y) * box.height)
    }
    if (axis.name === '') {
      continue
    }
    const box = size(axis.name, true)
    names.push({
      ...(key === 'y'
        ? /* Over the top of the upright, where a name reads level. */
          off(to, { x: 0, y: -1 }, box, sizes.gap)
        : off(seen(along(0)), out, box, sizes.gap * 2 + deepest)),
      text: axis.name,
    })
  }
  const kept: Area[] = [...names]
  const labels: BoxLabel[] = names.map((one) => ({
    name: true,
    text: one.text,
    x: one.x,
    y: one.y,
  }))
  for (const tick of ticks) {
    if (kept.some((other) => overlaps(tick, other, sizes.gap / 2))) {
      continue
    }
    kept.push(tick)
    labels.push({ name: false, text: tick.text, x: tick.x, y: tick.y })
  }
  return labels
}
