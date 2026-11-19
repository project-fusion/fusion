/**
 * The arithmetic a chart's readings move by: a number between two, an axis
 * between two ranges, the keys a chart knows its items by, and the curve a
 * chart grows in along.
 *
 * Kept apart from `ReadingsMotionController` because a frame between two
 * tables is arithmetic a picture hides: a tick drawn past the end of its axis,
 * or a name written at another category's place, shows for a frame and is
 * gone before anyone can point at it.
 */

/** A number `share` of the way from `from` to `to`, where `share` runs from 0 to 1. */
export const mix = (from: number, to: number, share: number): number =>
  share >= 1 ? to : share <= 0 ? from : from + (to - from) * share

/**
 * The key each item is known by from one table to the next, from its name:
 * the name itself, and where the same name comes again, the name and how
 * many times it came before. A chart matches its items across two tables by
 * these keys.
 */
export const keysOf = (names: readonly string[]): string[] => {
  const seen = new Map<string, number>()
  return names.map((name) => {
    const count = seen.get(name) ?? 0
    seen.set(name, count + 1)
    return count === 0 ? name : `${name}\u0000${count}`
  })
}

/** An axis as a chart publishes it: its range, the ticks on it, and the words and grid lines that go with them. */
export interface MovingAxis {
  labels?: readonly string[] | undefined
  range: readonly [number, number]
  rules?: readonly number[] | undefined
  ticks: readonly number[]
}

/**
 * The axis `share` of the way from `from` to `to`.
 *
 * **The range moves, and the ticks are the new axis's from the start**, each
 * at its own number, so they slide with the range as it eases to its new
 * ends. A tick, and its word, outside the range drawn this frame is left out
 * until the range reaches it, so nothing is written past the end of the axis.
 * The grid's lines are kept inside the range the same way.
 */
export const mixAxis = <A extends MovingAxis>(from: A, to: A, share: number): A => {
  if (share >= 1) {
    return to
  }
  const range: [number, number] = [
    mix(from.range[0], to.range[0], share),
    mix(from.range[1], to.range[1], share),
  ]
  const [low, high] = [Math.min(...range), Math.max(...range)]
  const inside = (value: number): boolean =>
    value >= low - 1e-9 * (high - low || 1) && value <= high + 1e-9 * (high - low || 1)
  const kept = to.ticks.flatMap((tick, at) => (inside(tick) ? [at] : []))
  return {
    ...to,
    range,
    ticks: kept.map((at) => to.ticks[at] as number),
    ...(to.labels ? { labels: kept.map((at) => to.labels?.[at] ?? '') } : {}),
    ...(to.rules ? { rules: to.rules.filter(inside) } : {}),
  }
}

/** How long one item takes to grow in, in milliseconds. */
const GROW = 1000

/** How long each step of a chart's items waits after the one before it, and the longest the last one waits, in milliseconds. */
const STAGGER = 110
const SPREAD = 660

/** The wait between one step's items and the next one's, as they grow in. */
const stepOf = (steps: number): number =>
  steps > 1 ? Math.min(STAGGER, SPREAD / (steps - 1)) : 0

/**
 * How much of its reading an item at `step` of `steps` has reached `elapsed`
 * milliseconds after a chart began to grow in, from 0 to 1. **In reading
 * order**, each step a little after the one before it, fast at first and slow
 * to rest, and never past its reading.
 */
export const grownAt = (step: number, steps: number, elapsed: number): number => {
  const t = (elapsed - step * stepOf(steps)) / GROW
  if (t <= 0) {
    return 0
  }
  return t >= 1 ? 1 : 1 - (1 - t) ** 3
}

/** How long the items of `steps` steps take to grow in, the last one included, in milliseconds. */
export const growTime = (steps: number): number =>
  GROW + stepOf(steps) * Math.max(0, steps - 1)
