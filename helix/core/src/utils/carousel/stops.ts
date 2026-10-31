/**
 * Where a carousel's track stops when it moves several slides at a time, as
 * arithmetic over its positions.
 *
 * A position is a slide the track can start at: six slides four across have
 * three, 0, 1 and 2. Moving `perMove` slides at a time stops at every
 * `perMove`th of them from the first, and always at the last, so the end of
 * the run is reachable whatever the count.
 */

/** The positions the track stops at, in order: every `perMove`th from 0, and the last. */
export const stopsOf = (positions: number, perMove = 1): number[] => {
  const step = Number.isFinite(perMove) ? Math.max(1, Math.floor(perMove)) : 1
  const last = Math.max(0, positions - 1)
  const stops: number[] = []
  for (let at = 0; at < last; at += step) {
    stops.push(at)
  }
  stops.push(last)
  return stops
}

/** Which stop a position is at or past: the last stop at or before it, as an index into `stops`. */
export const stopFor = (stops: readonly number[], position: number): number => {
  let found = 0
  stops.forEach((stop, at) => {
    if (stop <= position) {
      found = at
    }
  })
  return found
}

/**
 * The position a move of one stop forward (`1`) or back (`-1`) lands on.
 *
 * From a position between two stops, back goes to the stop before it. Past
 * either end it wraps where `loop` says so, and stays at the end otherwise.
 */
export const stepStop = (
  stops: readonly number[],
  position: number,
  step: -1 | 1,
  loop: boolean,
): number => {
  const at = stopFor(stops, position)
  let next = step < 0 && stops[at] !== position ? at : at + step
  if (loop) {
    next = (next + stops.length) % stops.length
  } else {
    next = Math.min(Math.max(next, 0), stops.length - 1)
  }
  return stops[next] ?? 0
}

/** How many panes of at least `least` fit `room` with `gap` between each pair, and one at least. */
export const fittedAcross = (room: number, gap: number, least: number): number => {
  const pane = least + gap
  return pane > 0 ? Math.max(1, Math.floor((room + gap) / pane)) : 1
}

/** A declared count as a track reads it: a whole number, one at least. */
export const acrossOf = (asked: unknown): number =>
  typeof asked === 'number' && Number.isFinite(asked) ? Math.max(1, Math.floor(asked)) : 1

/** One pane's length, when `across` panes with `gap` between them share `room`. */
export const paneLength = (room: number, gap: number, across: number): number =>
  Math.max(0, (room - (across - 1) * gap) / across)

/** How many places `slides` panes `across` at a time can stand: one at least. */
export const positionsOf = (slides: number, across: number): number =>
  Math.max(1, slides - across + 1)

/**
 * Which of `offsets` stands nearest `at`, as an index into them, for a scroller
 * that has come to rest and is asked where it stands. Zero where there are none.
 */
export const nearestOffset = (offsets: readonly number[], at: number): number => {
  let found = 0
  offsets.forEach((offset, index) => {
    if (Math.abs(offset - at) < Math.abs((offsets[found] ?? 0) - at)) {
      found = index
    }
  })
  return found
}
