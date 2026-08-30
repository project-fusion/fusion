/**
 * Which tone a reading gets, and how many readings fit.
 *
 * Kept apart from the element because both answers are arithmetic and both are
 * easy to get subtly wrong in ways a picture hides: a threshold comparison off
 * by one boundary colors a handful of cells wrong out of ninety, and a fit
 * calculation off by one drops a day silently. Neither is visible in a
 * screenshot of a strip.
 */

/** A reading, reduced to what the bucketing needs. */
export interface Reading {
  tone?: string | undefined
  value: number
}

/**
 * The tone for one reading, from its own `data-tone` or from the thresholds.
 *
 * **The cell's own tone wins**, and that ordering is the whole reason both
 * exist. A status page already knows a day was degraded; making it encode that
 * as a number so a component can decode it again is work for nothing, and the
 * encoding would have to agree with the thresholds or the colors would drift
 * from the truth. A contribution graph has only counts and wants the buckets.
 *
 * Thresholds are read as lower bounds, in the order given, and the last one that
 * a value reaches wins. `thresholds="0,1,3,6"` with `tones="muted,info,accent,success"`
 * puts 0 in `muted`, 1 and 2 in `info`, 3 to 5 in `accent`, and 6 upward in
 * `success`. A value below the first bound gets no tone rather than the first
 * one: an empty cell in a contribution graph is a day with nothing in it, and
 * painting it as the lowest bucket claims a reading that does not exist.
 */
export const toneOf = (
  reading: Reading,
  thresholds: readonly number[],
  tones: readonly string[],
): string | undefined => {
  if (reading.tone) {
    return reading.tone
  }
  if (thresholds.length === 0) {
    return undefined
  }
  let chosen: string | undefined
  for (const [index, bound] of thresholds.entries()) {
    if (reading.value >= bound) {
      chosen = tones[index] ?? chosen
    }
  }
  return chosen
}

/** A comma or space separated list of numbers, in the order written. */
export const numbers = (source: string): number[] =>
  source
    .split(/[\s,]+/)
    .filter((one) => one !== '')
    .map(Number)
    .filter((one) => Number.isFinite(one))

/** A comma or space separated list of names, in the order written. */
export const words = (source: string): string[] =>
  source.split(/[\s,]+/).filter((one) => one !== '')

/**
 * How many readings fit across a given width, and which ones they are.
 *
 * **Ninety cells in 320 pixels is three and a half pixels each**, which is not a
 * strip, it is a smear. So a narrow container shows fewer cells rather than
 * thinner ones, and it shows the *most recent* ones, because a status strip that
 * drops the newest days to keep the oldest is answering a question nobody asked.
 *
 * **The count it returns is what the summary has to be recomputed against.** A
 * strip labeled "99.2% over 90 days" that is drawing 45 of them is telling the
 * reader something false about the picture in front of them, and nothing about
 * the picture says so. That is the one fault in this component that a screenshot
 * cannot show, which is why the element reflects the number and announces it.
 *
 * **What crosses the width is a column, and `rows` is how many cells are in
 * one.** Counting cells is the same number only while `rows` is 1. Divide by
 * the wrong thing at `rows="7"` and a ten week graph comes back as fifty-nine
 * readings in a 592px box: eleven days dropped to fit a strip that wanted 156
 * pixels, and fifty-nine is not a multiple of seven, so every column after the
 * cut is offset by a day and the day-of-week rows stop meaning anything. A
 * calendar heatmap that silently rotates its own weekdays is worse than one
 * that drops a week.
 *
 * The count is therefore always a whole number of columns, which is what keeps
 * the tail slice aligned.
 */
export const fits = (
  total: number,
  width: number,
  minimum: number,
  gap: number,
  rows = 1,
): number => {
  if (!Number.isFinite(width) || width <= 0 || minimum <= 0) {
    return total
  }
  /* n columns need n widths and n-1 gaps, so solving for n gives the +gap on
     both sides. Written as `width / (minimum + gap)` it is short by one column
     at every size, which is the off-by-one that reads as "the strip has a
     margin". */
  const columns = Math.max(1, Math.floor((width + gap) / (minimum + gap)))
  return Math.min(total, columns * Math.max(1, rows))
}
