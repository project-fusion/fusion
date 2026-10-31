/**
 * The one set of tracks a table's rows line up under, in points.
 *
 * **A phone has no grid**, so the table works its track list out once for every
 * row, as CSS's track sizing does for the tracks a table writes: a length is
 * itself, `max-content` is its widest cell, a share of `fr` divides the room the
 * others leave above its least, and `auto` is its widest cell and takes what is
 * still left. A table too wide for its frame scrolls across.
 */
import { type Basis, lengthOf } from '../style/grid/lengths'

/** One track as a table reads it. */
interface Sized {
  /** Its least, or nothing where its content sets it. */
  readonly least: number | undefined
  /** Whether what is still left once the shares are out stretches it. */
  readonly stretches: boolean
  /** Its share of the room, where it takes one. */
  readonly share: number | undefined
}

/** A track's two ends, as `minmax()` writes them. */
const endsOf = (track: string): readonly [string, string] => {
  const inside = /^minmax\(([\s\S]*)\)$/i.exec(track.trim())?.[1]
  if (inside === undefined) {
    return [track.trim(), track.trim()]
  }
  const comma = inside.indexOf(',')
  return [inside.slice(0, comma).trim(), inside.slice(comma + 1).trim()]
}

const CONTENT = /^(auto|min-content|max-content)$/i

/** A length in points. **A `ch` is half the font's size**, as the web takes it unmeasured. */
const pointsOf = (word: string, basis: Basis, frame: number): number | undefined =>
  lengthOf(
    word.replace(/(-?[\d.]+)ch\b/gi, (_, amount) => `${Number(amount) * basis.em * 0.5}px`),
    basis,
    frame,
  )

/** Whether a track reads the width of the cells in it, which it measures. */
export const readsContent = (track: string): boolean => {
  const [least, most] = endsOf(track)
  return CONTENT.test(least) && (CONTENT.test(most) || /fr$/i.test(most))
    ? true
    : CONTENT.test(most)
}

const shareOf = (word: string): number | undefined => {
  const share = /^([\d.]+)fr$/i.exec(word)?.[1]
  return share === undefined ? undefined : Number(share)
}

/** How one track is sized. A bare `1fr` has a least of nothing, as a cell's `min-inline-size` allows. */
const sizedOf = (track: string, basis: Basis, frame: number): Sized => {
  const [low, high] = endsOf(track)
  const share = shareOf(high)
  if (shareOf(low) !== undefined) {
    return { least: 0, share, stretches: false }
  }
  const least = CONTENT.test(low) ? undefined : (pointsOf(low, basis, frame) ?? 0)
  const fixed = CONTENT.test(high) || share !== undefined ? undefined : pointsOf(high, basis, frame)
  return {
    least: fixed === undefined ? least : Math.max(least ?? 0, fixed),
    share,
    stretches: /^auto$/i.test(high),
  }
}

/** The size of one `fr`, past the tracks whose least is more than their part. */
const frameShare = (
  bases: readonly number[],
  tracks: readonly Sized[],
  frame: number,
): { readonly size: number; readonly frozen: ReadonlySet<number> } => {
  const frozen = new Set<number>()
  for (;;) {
    let room = frame
    let shares = 0
    tracks.forEach((track, at) => {
      if (track.share === undefined || frozen.has(at)) {
        room -= bases[at] ?? 0
      } else {
        shares += track.share
      }
    })
    const size = Math.max(0, room / Math.max(1, shares))
    const over = tracks.findIndex(
      (track, at) =>
        track.share !== undefined && !frozen.has(at) && (bases[at] ?? 0) > size * track.share,
    )
    if (over < 0) {
      return { frozen, size }
    }
    frozen.add(over)
  }
}

/** Each track's width at `frame`, with `contents` the widest cell each has drawn. */
export const trackWidths = (
  written: readonly string[],
  contents: readonly number[],
  frame: number,
  basis: Basis,
): number[] => {
  const tracks = written.map((track) => sizedOf(track, basis, frame))
  const bases = tracks.map((track, at) => track.least ?? contents[at] ?? 0)
  const { frozen, size } = frameShare(bases, tracks, frame)
  const widths = tracks.map((track, at) =>
    track.share === undefined || frozen.has(at) ? (bases[at] ?? 0) : size * track.share,
  )
  const left = frame - widths.reduce((total, one) => total + one, 0)
  const stretching = tracks.flatMap((track, at) => (track.stretches ? [at] : []))
  if (left > 0 && stretching.length > 0 && !tracks.some((track) => track.share !== undefined)) {
    for (const at of stretching) {
      widths[at] = (widths[at] ?? 0) + left / stretching.length
    }
  }
  return widths
}
