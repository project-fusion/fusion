/**
 * A splitter's arithmetic, which the web element and a phone share: its
 * bounds as percentages of its length, where a dragged divider snaps, which
 * pane a position shuts, and which way a key moves the divider. Every
 * position is the start pane's share of the splitter, 0 to 100.
 */

/** Which pane of a split is shut. */
export type SplitterPane = 'end' | 'start'

/** Where a split's divider may stand, each a percentage. */
export interface SplitterBounds {
  readonly max: number
  readonly min: number
}

/**
 * Where a dragged divider lands: on the nearest snap point within `threshold`,
 * or where the pointer is.
 *
 * Every number is a percentage of the splitter's box, so the caller turns a
 * point written as a length, and the threshold, into one first. Ties go to the
 * point written first.
 */
export const snapTo = (position: number, points: readonly number[], threshold: number): number => {
  let best: number | undefined
  let distance = Number.POSITIVE_INFINITY
  for (const point of points) {
    const away = Math.abs(point - position)
    if (away <= threshold && away < distance) {
      best = point
      distance = away
    }
  }
  return best ?? position
}

/**
 * A bound written as a percentage or a length, as a percentage of a split
 * `extent` long: a bare number is a percentage, and `px`, `rem` and `em` are
 * lengths, a rem and an em `rem` long. `fallback` where it says neither, or
 * where the split has no length to measure against.
 */
export const splitterPercent = (
  value: unknown,
  fallback: number,
  extent: number,
  rem: number,
  em: number = rem,
): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback
  }
  if (typeof value !== 'string' || value.trim() === '') {
    return fallback
  }
  const text = value.trim()
  const bare = Number(text)
  if (Number.isFinite(bare)) {
    return bare
  }
  const length = /^(-?[\d.]+)(em|px|rem)$/.exec(text)
  if (length === null || !(extent > 0)) {
    return fallback
  }
  const amount = Number(length[1])
  const unit = length[2]
  const points = unit === 'px' ? amount : amount * (unit === 'rem' ? rem : em)
  return (points / extent) * 100
}

/**
 * Where a split's divider may stand: from `min` to `max`, and no nearer the
 * end than `endMin` leaves the end pane, each held to 0 to 100.
 */
export const splitterBounds = (min: number, max: number, endMin: number): SplitterBounds => {
  const least = Math.max(0, Math.min(100, min))
  const most = Math.max(least, Math.min(100, Math.min(max, 100 - endMin)))
  return { max: most, min: least }
}

/** A position held to its bounds, the least where it is no number. */
export const splitterClamp = (next: number, bounds: SplitterBounds): number =>
  Math.min(bounds.max, Math.max(bounds.min, Number.isFinite(next) ? next : bounds.min))

/** Whether `collapsible` lets `pane` shut: `both` where it says nothing. */
export const splitterCanShut = (collapsible: unknown, pane: SplitterPane): boolean => {
  const said = collapsible === 'start' || collapsible === 'end' || collapsible === 'none'
  const which = said ? collapsible : 'both'
  return which === 'both' || which === pane
}

/**
 * The pane a settled position shuts, if any: a position at or below the
 * collapsed size shuts the start pane, and one at or past the rest of the
 * split the end pane, where `collapsible` lets them.
 */
export const splitterShutAt = (
  position: number,
  sliver: number,
  collapsible: unknown,
): SplitterPane | undefined => {
  if (position <= sliver && splitterCanShut(collapsible, 'start')) {
    return 'start'
  }
  return position >= 100 - sliver && splitterCanShut(collapsible, 'end') ? 'end' : undefined
}

/** The collapsed size, a number held to 0 to 100. */
export const splitterSliver = (size: unknown): number => {
  const read = typeof size === 'string' && size.trim() !== '' ? Number(size) : size
  return typeof read === 'number' && Number.isFinite(read) ? Math.min(100, Math.max(0, read)) : 0
}

/**
 * Which way a key moves a divider, as a sign on its position, or `0` for a
 * key off its axis. **The arrow says where the divider goes on screen**: on
 * a right-to-left page the start pane stands at the right, so the left
 * arrow grows it there.
 */
export const splitterTravel = (key: string, vertical: boolean, rtl: boolean): -1 | 0 | 1 => {
  if (vertical) {
    return key === 'ArrowDown' ? 1 : key === 'ArrowUp' ? -1 : 0
  }
  if (key === 'ArrowRight') {
    return rtl ? -1 : 1
  }
  if (key === 'ArrowLeft') {
    return rtl ? 1 : -1
  }
  return 0
}

/** The places a dragged divider snaps to, from `snap`'s comma-separated list, as percentages. */
export const splitterSnaps = (snap: unknown, extent: number, rem: number): readonly number[] =>
  typeof snap !== 'string'
    ? []
    : snap
        .split(',')
        .map((point) => splitterPercent(point.trim(), Number.NaN, extent, rem))
        .filter((point) => Number.isFinite(point))
