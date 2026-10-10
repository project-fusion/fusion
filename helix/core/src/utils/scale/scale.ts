/** A mapping from one numeric interval onto another. */
export type Scale = (value: number) => number

/**
 * The smallest and largest of a set of numbers, as a scale's domain, and
 * `[Infinity, -Infinity]` for none, as `Math.min` and `Math.max` answer.
 *
 * A loop: spread into `Math.min`, four series of 100,000 readings are more
 * arguments than a call can take, and the spread threw a `RangeError`.
 */
export const extent = (values: readonly number[]): [number, number] => {
  let low = Number.POSITIVE_INFINITY
  let high = Number.NEGATIVE_INFINITY
  for (const value of values) {
    low = Math.min(low, value)
    high = Math.max(high, value)
  }
  return [low, high]
}

/**
 * Maps a domain onto a range, linearly.
 *
 * A pure function rather than a controller, which is the distinction the rules
 * draw: a controller reacts to a host's lifecycle, and this is arithmetic on
 * four numbers. It holds nothing, subscribes to nothing, and can be called from
 * `render` without anything being wired up first.
 *
 * The range is given rather than assumed, so an inverted one is ordinary: SVG
 * counts down from the top, so a chart passes `[height, 0]` and gets a larger
 * value drawn higher without anything here knowing why.
 *
 * **A flat domain maps to the middle of the range, and that is the case worth
 * naming.** Every value being equal makes the domain zero wide, and the obvious
 * arithmetic divides by it: seven identical readings drew a line at `NaN`, which
 * an `<svg>` renders as no line at all rather than as an error. A flat series is
 * a real thing to plot and it should come out as a flat line halfway up.
 */
export const linear = (
  domain: readonly [number, number],
  range: readonly [number, number],
): Scale => {
  const [from, to] = domain
  const [start, end] = range
  const span = to - from
  if (span === 0) {
    return () => (start + end) / 2
  }
  return (value) => start + ((value - from) / span) * (end - start)
}
