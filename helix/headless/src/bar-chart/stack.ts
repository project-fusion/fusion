/*
 * Where each column of a category stands when a Bar Chart stacks them, as
 * arithmetic with no element in it.
 *
 * Pure and beside the family's `index.ts`, because how a stack adds up is a
 * fact about numbers, and a spec can hold it without a page.
 */

import { byRow, type Series } from '@fusion.dev/helix-core'

/** Where a column starts and ends along the measure, in the data's own units. */
export type Span = readonly [from: number, to: number]

/**
 * Each column's span in one category, in the order given: a positive reading
 * stacks up from zero on the positives before it, and a negative one down
 * from zero on the negatives before it, so neither hides the other. A blank
 * has no span.
 */
export const stackSpans = (values: readonly (number | undefined)[]): (Span | undefined)[] => {
  let up = 0
  let down = 0
  return values.map((value) => {
    if (value === undefined) {
      return undefined
    }
    const from = value >= 0 ? up : down
    const to = from + value
    if (value >= 0) {
      up = to
    } else {
      down = to
    }
    return [from, to]
  })
}

/**
 * Every end a stack reaches across the categories, which is what its scale
 * has to hold: the top of each stack of positives and the foot of each stack
 * of negatives. `categories` holds each category's readings, one per column.
 */
export const stackEnds = (categories: readonly (readonly (number | undefined)[])[]): number[] =>
  categories.flatMap((values) =>
    stackSpans(values).flatMap((span) => (span === undefined ? [] : [span[1]])),
  )

/**
 * The readings a stacked scale has to hold, over `count` categories: every
 * reading of a series drawn as a line, which `lined` says, and the top and
 * foot of each category's stack of the others.
 *
 * The plot's scale and the tooltip's placing ask the same question, and
 * answered apart they disagreed about the lines.
 */
export const stackedReadings = (
  group: readonly Series[],
  count: number,
  lined: (one: Series) => boolean,
): number[] => {
  const slots = group.filter((one) => !lined(one)).map((one) => byRow(one, count))
  return [
    ...group.filter(lined).flatMap((one) => one.points.map((point) => point.value)),
    ...stackEnds(Array.from({ length: count }, (_, at) => slots.map((one) => one[at]?.value))),
  ]
}
