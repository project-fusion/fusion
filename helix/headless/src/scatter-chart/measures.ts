import { seriesKey } from '@fusion.dev/helix-core'

/*
 * What each of a Scatter Chart's numeric columns measures, and how large a
 * point is drawn, as arithmetic with no element in it.
 *
 * Pure and beside the family's `index.ts`, so a spec holds the split of the
 * columns and the bubble sizes without a page.
 */

/** The numeric columns by what they measure. */
export interface Measures {
  /** The column across, the first one that is not the size. */
  across: number | undefined
  /** The column `size-by` names, which sizes the points. */
  size: number | undefined
  /** Every other column, each a series up. */
  ups: number[]
}

/**
 * The numeric columns by what they measure: the column whose heading
 * `sizeBy` names as the size, by its series key, then the first of the rest
 * across and every other one up.
 */
export const measuresOf = (
  columns: readonly number[],
  name: (column: number) => string,
  sizeBy: string,
): Measures => {
  const key = seriesKey(sizeBy)
  const size = key === '' ? undefined : columns.find((column) => seriesKey(name(column)) === key)
  const [across, ...ups] = columns.filter((column) => column !== size)
  return { across, size, ups }
}

/**
 * Each row's point size from its reading in the size column, by area, so a
 * point twice the measure is twice the ink: the square root of its share of
 * the largest. A size below zero is none, and a row with no size, or a column
 * whose largest is not above zero, has no weight.
 */
export const bubbleWeights = (sizes: readonly (number | undefined)[]): (number | undefined)[] => {
  const largest = Math.max(0, ...sizes.map((one) => one ?? 0))
  return sizes.map((one) =>
    one === undefined || largest <= 0 ? undefined : Math.sqrt(Math.max(0, one) / largest),
  )
}
