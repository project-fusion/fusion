/*
 * How a Scatter Chart's measures move together, as arithmetic with no element
 * in it: the correlation its summary gives and the line its `trend` draws.
 *
 * Pure and beside the family's `index.ts`, because a fit is a fact about
 * pairs of numbers, and a spec can hold it without a page.
 */

/** The mean of some numbers. */
const mean = (values: readonly number[]): number =>
  values.reduce((sum, one) => sum + one, 0) / values.length

/** Pearson's r, or nothing where there are too few points or no spread to have one. */
export const correlation = (
  pairs: ReadonlyArray<readonly [number, number]>,
): number | undefined => {
  if (pairs.length < 3) {
    return undefined
  }
  const across = mean(pairs.map(([x]) => x))
  const up = mean(pairs.map(([, y]) => y))
  let both = 0
  let xs = 0
  let ys = 0
  for (const [x, y] of pairs) {
    both += (x - across) * (y - up)
    xs += (x - across) ** 2
    ys += (y - up) ** 2
  }
  return xs === 0 || ys === 0 ? undefined : both / Math.sqrt(xs * ys)
}

/** A straight line, as the measure up at any measure across. */
export interface Fit {
  /** The measure up where the measure across is zero. */
  intercept: number
  /** How far up the line goes for each step across. */
  slope: number
}

/**
 * The straight line nearest the points, by least squares, or nothing where
 * there are fewer than two points or they share one measure across, which no
 * line up the page can be fitted to.
 */
export const leastSquares = (pairs: ReadonlyArray<readonly [number, number]>): Fit | undefined => {
  if (pairs.length < 2) {
    return undefined
  }
  const across = mean(pairs.map(([x]) => x))
  const up = mean(pairs.map(([, y]) => y))
  let both = 0
  let xs = 0
  for (const [x, y] of pairs) {
    both += (x - across) * (y - up)
    xs += (x - across) ** 2
  }
  if (xs === 0) {
    return undefined
  }
  const slope = both / xs
  return { intercept: up - slope * across, slope }
}
