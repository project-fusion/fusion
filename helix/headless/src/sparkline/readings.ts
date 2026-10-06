/*
 * What a Sparkline says and marks about its readings, as arithmetic with no
 * element in it.
 *
 * Pure and beside the family's `index.ts`, because where the readings stand
 * and how they are put into words are facts about a list of numbers, and a
 * spec can hold them without a page. Which reading is the highest is core's
 * `extremesOf`, which Heatmap asks too.
 */

import { extremesOf, fillTemplate, type Point } from '@fusion.dev/helix-core'

/**
 * A reading in words, for the readout: the row's name where a table gave one,
 * the reading as it is written, and where it stands in brackets, such as
 * "Mon: 12 (3 of 7)". The same order every chart's readout uses.
 */
export const readingWords = (label: string, text: string, position: string): string => {
  const named = label === '' ? text : text === '' ? label : `${label}: ${text}`
  return position === '' ? named : `${named} (${position})`
}

/**
 * The readings in their places: `count` slots, each holding the value read at
 * that place, or nothing where the place is blank. A point outside the places
 * is left out.
 */
export const slotsOf = (
  points: readonly { at: number; value: number }[],
  count: number,
): (number | undefined)[] => {
  const slots: (number | undefined)[] = Array.from({ length: count }, () => undefined)
  for (const point of points) {
    if (point.at >= 0 && point.at < count) {
      slots[point.at] = point.value
    }
  }
  return slots
}

/** One unbroken stretch of the line: its drawn path and the points it runs through. */
export interface Run {
  /** The path the line draws through the points. */
  path: string
  /** The points, in drawing coordinates. */
  run: readonly Point[]
}

/**
 * Each run of the line closed down to `floor`, the path the wash fills: the
 * run's own path, then down from its last point, across and back up to its
 * first. Empty where there are no runs.
 */
export const areaPath = (runs: readonly Run[], floor: number): string =>
  runs
    .map((one) => {
      const first = one.run[0] as Point
      const last = one.run.at(-1) as Point
      return `${one.path}L${last[0]},${floor}L${first[0]},${floor}Z`
    })
    .join('')

/**
 * What the readings come to, in `template`: `{first}` and `{last}` for the
 * first and the last reading, `{high}` and `{low}` for the highest and the
 * lowest, each written by `write`. Empty where there are fewer than two
 * readings, which make no trend.
 */
export const overviewWords = (
  template: string,
  slots: readonly (number | undefined)[],
  write: (at: number) => string,
): string => {
  const placed = slots.flatMap((value, at) => (value === undefined ? [] : [at]))
  const first = placed[0]
  const last = placed.at(-1)
  const { high, low } = extremesOf(slots)
  if (placed.length < 2 || first === undefined || last === undefined) {
    return ''
  }
  return fillTemplate(template, {
    first: write(first),
    high: write(high as number),
    last: write(last),
    low: write(low as number),
  })
}
