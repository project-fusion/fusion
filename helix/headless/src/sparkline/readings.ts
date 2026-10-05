/*
 * What a Sparkline says and marks about its readings, as arithmetic with no
 * element in it.
 *
 * Pure and beside the family's `index.ts`, because which reading is the
 * highest and how a reading is put into words are facts about a list of
 * numbers, and a spec can hold them without a page.
 */

/** Where the highest and the lowest readings are, by place, or none. */
export interface Extremes {
  /** The place of the highest reading, the first where several tie. */
  high?: number
  /** The place of the lowest reading, the first where several tie. */
  low?: number
}

/**
 * Where the highest and the lowest readings stand. A blank slot is passed
 * over, and a list with nothing in it has neither.
 */
export const extremesOf = (slots: readonly (number | undefined)[]): Extremes => {
  const found: Extremes = {}
  slots.forEach((value, at) => {
    if (value === undefined) {
      return
    }
    if (found.high === undefined || value > (slots[found.high] as number)) {
      found.high = at
    }
    if (found.low === undefined || value < (slots[found.low] as number)) {
      found.low = at
    }
  })
  return found
}

/**
 * A reading in words, for the readout: the row's name where a table gave one,
 * the reading as it is written, and where it stands in brackets, such as
 * "Mon: 12 (3 of 7)". The same order every chart's readout uses.
 */
export const readingWords = (label: string, text: string, position: string): string => {
  const named = label === '' ? text : text === '' ? label : `${label}: ${text}`
  return position === '' ? named : `${named} (${position})`
}
