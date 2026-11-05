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
 * whole. Every name is kept, and where two axes' labels meet, the axis with
 * fewer keeps its own. A category has no neighbor to read it from, so it is
 * left out only where its ink would meet another label's.
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
  ticks: readonly {
    at: number
    /** Whether this is a category's name, which the labels beside it do not give. */
    category?: boolean
    text: string
  }[]
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

/** A label's box on the page: its middle, its half width and height, and how far its ink reaches above and below its middle. */
interface Area {
  half: { height: number; width: number }
  ink: { down: number; up: number }
  x: number
  y: number
}

/**
 * How far a label's ink reaches above and below its middle, as shares of its
 * height, from the letters in it. **The ink is not centered on the line.**
 * Measured on Fusion Sans with the middle as the baseline, November 3, 2026: a
 * capital, a figure, or a tall letter reaches 0.44 to 0.48 up, and a word of
 * small letters 0.27; a word with no descender reaches 0.29 down, a
 * parenthesis 0.38, and `g`, `j`, `p`, `q`, or `y` 0.44. So "Virginia (ms)" is
 * 0.92 of a line tall and "North" 0.73. One share for every label, the four
 * fifths of a line this was, put the first too short: four names 11.5 pixels
 * apart at 12 were judged clear with their descenders on the capitals below.
 */
const inkOf = (text: string): { down: number; up: number } => ({
  down: /[gjpqyçÇ]/.test(text) ? 0.44 : /[()[\]{},;|/]/.test(text) ? 0.38 : 0.29,
  up: /^[acemnorsuvwxz\s.,:;-]*$/.test(text) ? 0.27 : 0.48,
})

/** Whether two labels would cover each other, by their ink and `pad` more. */
const overlaps = (one: Area, other: Area, pad: number): boolean =>
  Math.abs(one.x - other.x) < one.half.width + other.half.width + pad &&
  one.y - one.ink.up < other.y + other.ink.down + pad &&
  other.y - other.ink.up < one.y + one.ink.down + pad

/** How far two labels' inks are from meeting down the page, or less than nothing where they meet. */
const inkApart = (above: Area, below: Area): number =>
  below.y - below.ink.up - (above.y + above.ink.down)

/** The clear space kept between two categories' inks, as a share of a number's height: a pixel and a half at 12. */
const CLEAR = 0.125

/** The furthest a category's name moves off its place to stand clear, as a share of a number's height. */
const NUDGE = 0.4

/**
 * Moves an axis' category names apart down the page where their inks would
 * meet or come within `clear` of meeting, each by no more than `NUDGE` of a
 * line, so every name is kept and stays beside its own place.
 *
 * **A name is moved and not left out.** The names of a slanted edge stand a
 * step apart down the page, and in a narrow plot the step is about a line:
 * measured on November 3, 2026 at 342 wide, a ribbon chart's four series 11.5
 * apart at 12, with 0.6 of a pixel between one's descenders and the next one's
 * capitals. A number reads from its neighbors and is thinned where it would
 * cover another; a category has no neighbor to read it from, so each pair is
 * pushed apart, half each, until they stand clear, and only a name still meeting
 * another after that is left out.
 */
const spread = (names: Area[], clear: number): void => {
  const placed = names.map((name) => ({ from: name.y, name }))
  const order = [...placed].sort((one, other) => one.from - other.from).map((one) => one.name)
  for (let round = 0; round < 32; round += 1) {
    let moved = false
    for (const [step, below] of order.entries()) {
      const above = order[step - 1]
      if (above === undefined) {
        continue
      }
      const short = clear - inkApart(above, below)
      if (
        short <= clear * 1e-3 ||
        Math.abs(above.x - below.x) >= above.half.width + below.half.width
      ) {
        continue
      }
      above.y -= short / 2
      below.y += short / 2
      moved = true
    }
    if (!moved) {
      break
    }
  }
  for (const { from, name } of placed) {
    const most = name.half.height * 2 * NUDGE
    name.y = Math.min(from + most, Math.max(from - most, name.y))
  }
}

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
     nearest `at` a gap away.
   *
     **The nearest side is the box's corner where `out` slants**, which is
     how far the box reaches toward the edge: half its width times the
     slant across, and half its height times the slant down. Moved by the
     square of each slant, which is what this was, a wide name off a slanted
     edge came back over it by a third of its width, and the names of a
     ribbon chart ran into the ends of the ribbons standing on that edge. */
  const off = (
    at: PagePoint,
    out: PagePoint,
    box: { height: number; width: number },
    by: number,
    text: string,
  ): Area => {
    const reach = by + (Math.abs(out.x) * box.width) / 2 + (Math.abs(out.y) * box.height) / 2
    const ink = inkOf(text)
    return {
      half: { height: box.height / 2, width: box.width / 2 },
      ink: { down: ink.down * box.height, up: ink.up * box.height },
      x: at.x + out.x * reach,
      y: at.y + out.y * reach,
    }
  }
  const names: Array<Area & { text: string }> = []
  const ticks: Array<Area & { category: boolean; text: string; of: number }> = []
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
    const first = ticks.length
    for (const tick of axis.ticks) {
      const box = size(tick.text, false)
      ticks.push({
        ...off(seen(along(tick.at)), out, box, sizes.gap, tick.text),
        category: tick.category === true,
        of: axis.ticks.length,
        text: tick.text,
      })
      deepest = Math.max(deepest, Math.abs(out.x) * box.width + Math.abs(out.y) * box.height)
    }
    spread(
      ticks.slice(first).filter((tick) => tick.category),
      sizes.tick * CLEAR,
    )
    if (axis.name === '') {
      continue
    }
    const box = size(axis.name, true)
    /* Clear of the number at the top of the upright, where there is one,
       which the name stood on and so left out. */
    const topped = axis.ticks.some((tick) => tick.at > 1 - 1e-6)
    names.push({
      ...(key === 'y'
        ? /* Over the top of the upright, where a name reads level. */
          off(to, { x: 0, y: -1 }, box, sizes.gap + (topped ? sizes.tick / 2 : 0), axis.name)
        : off(seen(along(0)), out, box, sizes.gap * 2 + deepest, axis.name)),
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
  /* **The fewer an axis' labels, the more each one carries**, so an axis of
     four series' names keeps them where they meet the last of fourteen
     dates. Stable, so each axis keeps its own order. */
  for (const tick of [...ticks].sort((one, other) => one.of - other.of)) {
    if (kept.some((other) => overlaps(tick, other, tick.category ? 0 : sizes.gap / 2))) {
      continue
    }
    kept.push(tick)
    labels.push({ name: false, text: tick.text, x: tick.x, y: tick.y })
  }
  return labels
}
