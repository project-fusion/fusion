/**
 * Each track's size, by CSS's track sizing in brief: each track starts at
 * its least, then tracks with room to grow share what is left up to their
 * greatest, then shares in `fr` divide the rest, then tracks sized by their
 * content share anything still left. A track `auto-fit` left empty is no
 * width, and the gaps beside it close.
 */
import { type Basis, lengthOf } from './lengths'
import type { Breadth, Track, TrackList } from './tracks'

/** A breadth in points where it is a length, against `percent`. */
export const fixed = (breadth: Breadth, basis: Basis, percent: number): number | undefined =>
  breadth.kind === 'length' ? lengthOf(breadth.length, basis, percent) : undefined

/** A track's size as the count of a repeat reads it: its greatest where that is a length, its least otherwise. */
const counted = (track: Track, basis: Basis, width: number): number =>
  fixed(track.max, basis, width) ?? fixed(track.min, basis, width) ?? 0

/**
 * How many times a width-filling repeat repeats: as many as fit beside the
 * other tracks and their gaps, and at least once.
 */
const repeats = (list: TrackList, width: number, gap: number, basis: Basis): number => {
  const repeat = list.repeat
  if (repeat === undefined) {
    return 0
  }
  const others = [...list.before, ...list.after]
  const room =
    width -
    others.reduce((total, track) => total + counted(track, basis, width), 0) -
    others.length * gap
  const each =
    repeat.tracks.reduce((total, track) => total + counted(track, basis, width), 0) +
    repeat.tracks.length * gap
  return each <= 0 ? 1 : Math.max(1, Math.floor((room + gap) / each))
}

/** A list's tracks at `width`, each marked where it is an `auto-fit` one, which collapses while empty. */
export const expanded = (
  list: TrackList,
  width: number,
  gap: number,
  basis: Basis,
): { readonly fits: readonly boolean[]; readonly tracks: readonly Track[] } => {
  const repeated = Array.from(
    { length: repeats(list, width, gap, basis) },
    () => list.repeat?.tracks ?? [],
  ).flat()
  const fit = list.repeat?.fit === true
  return {
    fits: [
      ...list.before.map(() => false),
      ...repeated.map(() => fit),
      ...list.after.map(() => false),
    ],
    tracks: [...list.before, ...repeated, ...list.after],
  }
}

/** The tracks being sized: each one's base, its limit, and whether it takes a share. */
interface Sizing {
  readonly base: number[]
  readonly limit: number[]
  readonly share: (number | undefined)[]
}

/** Each track's least and greatest, before any room is shared. */
const initial = (
  tracks: readonly Track[],
  collapsed: readonly boolean[],
  contents: readonly number[],
  width: number,
  basis: Basis,
): Sizing => {
  const sizing: Sizing = { base: [], limit: [], share: [] }
  tracks.forEach((track, index) => {
    const least = collapsed[index] ? 0 : Math.max(0, fixed(track.min, basis, width) ?? 0)
    const most = (() => {
      if (collapsed[index]) {
        return 0
      }
      if (track.max.kind === 'fr') {
        return Number.POSITIVE_INFINITY
      }
      return track.max.kind === 'auto'
        ? (contents[index] ?? 0)
        : (fixed(track.max, basis, width) ?? 0)
    })()
    sizing.base.push(least)
    sizing.limit.push(Math.max(least, most))
    sizing.share.push(!collapsed[index] && track.max.kind === 'fr' ? track.max.share : undefined)
  })
  return sizing
}

/** The room the bases leave of `room`. */
const left = (sizing: Sizing, room: number): number =>
  room - sizing.base.reduce((total, one) => total + one, 0)

/** Grows the tracks that have room to their greatest, sharing what is left equally. */
const grow = (sizing: Sizing, room: number): void => {
  const { base, limit, share } = sizing
  let free = left(sizing, room)
  let growing = base.map((_, index) => index).filter((index) => share[index] === undefined)
  growing = growing.filter((index) => (limit[index] ?? 0) > (base[index] ?? 0))
  while (free > 0.001 && growing.length > 0) {
    const each = free / growing.length
    for (const index of growing) {
      const grown = Math.min(limit[index] ?? 0, (base[index] ?? 0) + each)
      free -= grown - (base[index] ?? 0)
      base[index] = grown
    }
    growing = growing.filter((index) => (limit[index] ?? 0) > (base[index] ?? 0) + 0.001)
  }
}

/**
 * Divides the room the other tracks leave among the shares in `fr`, where no
 * track's least is more than its part: such a track keeps its least, and the
 * rest divide what is left again.
 */
const flex = (sizing: Sizing, room: number): void => {
  const { base, share } = sizing
  const sharing = new Set(
    base.map((_, index) => index).filter((index) => share[index] !== undefined),
  )
  let size = frOf(sizing, room, sharing)
  let over = [...sharing].filter((index) => (base[index] ?? 0) > size * (share[index] ?? 0))
  while (over.length > 0) {
    for (const index of over) {
      sharing.delete(index)
    }
    size = frOf(sizing, room, sharing)
    over = [...sharing].filter((index) => (base[index] ?? 0) > size * (share[index] ?? 0))
  }
  for (const index of sharing) {
    base[index] = Math.max(base[index] ?? 0, size * (share[index] ?? 0))
  }
}

/** The size of one `fr`: the room the tracks not `sharing` leave, over the shares of those that are. */
const frOf = (sizing: Sizing, room: number, sharing: ReadonlySet<number>): number => {
  const rest =
    room - sizing.base.reduce((total, one, index) => total + (sharing.has(index) ? 0 : one), 0)
  const shares = [...sharing].reduce((total, index) => total + (sizing.share[index] ?? 0), 0)
  return Math.max(0, rest / Math.max(1, shares))
}

/** Gives what is still left to the tracks sized by their content, equally. */
const stretch = (
  sizing: Sizing,
  room: number,
  tracks: readonly Track[],
  collapsed: readonly boolean[],
): void => {
  const free = left(sizing, room)
  const stretching = tracks
    .map((_, index) => index)
    .filter((index) => !collapsed[index] && tracks[index]?.max.kind === 'auto')
  if (free <= 0.001) {
    return
  }
  for (const index of stretching) {
    sizing.base[index] = (sizing.base[index] ?? 0) + free / stretching.length
  }
}

/** Each column's width at `width`, with `gap` between each two shown. */
export const sized = (
  tracks: readonly Track[],
  collapsed: readonly boolean[],
  contents: readonly number[],
  width: number,
  gap: number,
  basis: Basis,
): number[] => {
  const shown = collapsed.filter((one) => !one).length
  const room = width - Math.max(0, shown - 1) * gap
  const sizing = initial(tracks, collapsed, contents, width, basis)
  grow(sizing, room)
  flex(sizing, room)
  stretch(sizing, room, tracks, collapsed)
  return sizing.base
}

/**
 * A row's height as its track sets it: `height` where lengths set both its
 * ends, and `least` where a length sets a floor its tallest cell may pass.
 */
export interface RowSize {
  readonly height?: number
  readonly least?: number
}

/** A breadth in points where it is a length, and nothing where it is a share, a percentage, or content. */
const points = (breadth: Breadth, basis: Basis): number | undefined => {
  const length = fixed(breadth, basis, Number.NaN)
  return length === undefined || Number.isNaN(length) ? undefined : Math.max(0, length)
}

/**
 * Each row's height, as the web sizes a row of a grid whose own height is
 * its content's. **A row grows to its greatest where a length sets it**, as
 * the free space of a grid sized by its content is unbounded: `minmax(4rem,
 * 8rem)` is 8rem whatever its cells hold, and `minmax(auto, 8rem)` is at
 * least 8rem and as tall as its tallest cell. **A row whose greatest is its
 * content or a share is at least its least**, so `minmax(30rem, auto)` is
 * 30rem until a cell is taller. A row with no length at either end is as
 * tall as its tallest cell.
 */
export const rowSizes = (
  list: TrackList | undefined,
  count: number,
  gap: number,
  basis: Basis,
): RowSize[] => {
  const tracks = list === undefined ? [] : expanded(list, 0, gap, basis).tracks
  return Array.from({ length: count }, (_, index) => {
    const track = tracks[index]
    const least = track === undefined ? undefined : points(track.min, basis)
    const most = track === undefined ? undefined : points(track.max, basis)
    if (most !== undefined) {
      return least === undefined ? { least: most } : { height: Math.max(least, most) }
    }
    return least === undefined || least === 0 ? {} : { least }
  })
}
