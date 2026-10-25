/**
 * A grid's track lists and a cell's placement, read from the text CSS writes
 * them in.
 */

/** How a track is sized at one end: a length, a share of the room left, or its content. */
export type Breadth =
  | { readonly kind: 'auto' }
  | { readonly kind: 'fr'; readonly share: number }
  | { readonly kind: 'length'; readonly length: string }

/** A track's least and greatest size, as `minmax()` writes them. */
export interface Track {
  readonly max: Breadth
  readonly min: Breadth
}

/** A track list: its tracks, and the tracks a `repeat(auto-fill | auto-fit, …)` repeats where it has one. */
export interface TrackList {
  /** The tracks a width-filling repeat stands among, after it and before it. */
  readonly after: readonly Track[]
  readonly before: readonly Track[]
  /** The repeat that fills the width, where the list has one. */
  readonly repeat?: { readonly fit: boolean; readonly tracks: readonly Track[] }
}

/** Where a cell goes along one axis: a line to start at, a line to end at, and how many tracks it spans. */
export interface Placement {
  readonly end?: number
  readonly span?: number
  readonly start?: number
}

export const AUTO: Breadth = { kind: 'auto' }

/** How far each parenthesis moves the depth a character stands at. */
const DEPTH: Readonly<Record<string, number>> = { '(': 1, ')': -1 }

/**
 * `text` split at each `at` outside parentheses, each piece trimmed and the
 * empty ones left out, or nothing where its parentheses do not balance.
 */
const split = (text: string, at: RegExp): string[] | undefined => {
  const pieces = ['']
  let depth = 0
  for (const character of text) {
    depth += DEPTH[character] ?? 0
    if (depth < 0) {
      return undefined
    }
    if (depth === 0 && at.test(character)) {
      pieces.push('')
    } else {
      pieces[pieces.length - 1] += character
    }
  }
  return depth === 0 ? pieces.map((one) => one.trim()).filter((one) => one !== '') : undefined
}

/** A track list's words, keeping each function call whole. */
const words = (text: string): string[] | undefined => split(text, /\s/)

/** A function call's arguments, split at its own commas. */
const argumentsOf = (call: string): string[] | undefined => {
  const inside = /^[a-z-]+\(([\s\S]*)\)$/i.exec(call)?.[1]
  return inside === undefined ? undefined : split(inside, /,/)
}

/** One end of a track: `auto` and the content keywords, a share in `fr`, or a length. */
const breadthOf = (word: string): Breadth | undefined => {
  if (/^(auto|min-content|max-content|fit-content\(.*\))$/i.test(word)) {
    return AUTO
  }
  const share = /^(\d+\.?\d*|\.\d+)fr$/i.exec(word)?.[1]
  if (share !== undefined) {
    return { kind: 'fr', share: Number(share) }
  }
  return /^-?[\d.]|^(calc|min|max|clamp)\(/i.test(word)
    ? { kind: 'length', length: word }
    : undefined
}

/** A track from its two ends. **A share is no least size**, and `auto` stands in for it. */
const between = (min: Breadth | undefined, max: Breadth | undefined): Track | undefined =>
  min === undefined || max === undefined ? undefined : { max, min: min.kind === 'fr' ? AUTO : min }

/** One track: a breadth, which is both its ends, or a `minmax()`. */
const trackOf = (word: string): Track | undefined => {
  if (!/^minmax\(/i.test(word)) {
    const breadth = breadthOf(word)
    return between(breadth, breadth)
  }
  const [least, most, ...rest] = argumentsOf(word) ?? []
  return rest.length > 0 || least === undefined || most === undefined
    ? undefined
    : between(breadthOf(least), breadthOf(most))
}

/** A `repeat()` as the count it says and the tracks it repeats, either of which may be nothing. */
const repeatOf = (
  word: string,
): { readonly count: string | undefined; readonly tracks: Track[] | undefined } => {
  const [count, ...rest] = argumentsOf(word) ?? []
  const inner = words(rest.join(','))
  return { count, tracks: inner === undefined ? undefined : tracksOf(inner) }
}

/** Tracks written in a row, with each `repeat()` of a count spelled out and line names left out. */
const tracksOf = (list: readonly string[]): Track[] | undefined => {
  const out: Track[] = []
  for (const word of list.filter((one) => !one.startsWith('['))) {
    if (!/^repeat\(/i.test(word)) {
      const track = trackOf(word)
      if (track === undefined) {
        return undefined
      }
      out.push(track)
      continue
    }
    const { count, tracks } = repeatOf(word)
    const times = Number(count)
    if (!Number.isInteger(times) || times < 1 || tracks === undefined) {
      return undefined
    }
    out.push(...Array.from({ length: times }, () => tracks).flat())
  }
  return out
}

/** A list with a width-filling repeat at `at`, or nothing where any part of it does not read. */
const filling = (list: readonly string[], at: number): TrackList | undefined => {
  const word = list[at] ?? ''
  const { count, tracks } = repeatOf(word)
  const before = tracksOf(list.slice(0, at))
  const after = tracksOf(list.slice(at + 1))
  if (tracks === undefined || tracks.length === 0 || before === undefined || after === undefined) {
    return undefined
  }
  return { after, before, repeat: { fit: /fit/i.test(count ?? ''), tracks } }
}

/**
 * A track list as CSS writes it, such as `repeat(3, minmax(0, 1fr))`,
 * `7rem minmax(0, 32rem)`, or `repeat(auto-fit, minmax(min(16rem, 100%), 1fr))`.
 * `undefined` where it is not one this reads, `none` and `subgrid` among them.
 */
export const trackList = (text: string): TrackList | undefined => {
  const list = words(text)
  if (list === undefined || list.length === 0 || /^(none|subgrid)$/i.test(text.trim())) {
    return undefined
  }
  const at = list.findIndex((word) => /^repeat\(\s*auto-(fill|fit)\s*,/i.test(word))
  if (at !== -1) {
    return filling(list, at)
  }
  const tracks = tracksOf(list)
  return tracks === undefined || tracks.length === 0 ? undefined : { after: [], before: tracks }
}

/** One side of a placement: a line, or a span. */
const sideOf = (written: string | undefined): Placement => {
  const [first, second, ...rest] = (written ?? '').trim().split(/\s+/)
  const amount = Number(first === 'span' ? second : first)
  const whole = Number.isInteger(amount) && rest.length === 0
  if (first === 'span') {
    return whole && amount > 0 ? { span: amount } : {}
  }
  return whole && amount !== 0 && second === undefined ? { start: amount } : {}
}

/**
 * Where a cell goes along one axis, as `grid-column` or `grid-row` writes it:
 * `2`, `span 2`, `1 / -1`, `1 / span 2`. Anything else, such as an area's
 * name, is placed automatically, one track wide.
 */
export const placementOf = (text: string | undefined): Placement => {
  const [first, second] = (text ?? '').split('/')
  const start = sideOf(first)
  if (second === undefined) {
    return start
  }
  const end = sideOf(second)
  if (end.start !== undefined) {
    return { ...start, end: end.start }
  }
  return end.span === undefined ? start : { ...start, span: end.span }
}
