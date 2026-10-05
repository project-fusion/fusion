/**
 * Where a key moves the reading of a chart, as arithmetic with no element in
 * it.
 *
 * `ChartPointerController` hears the key and asks this where it goes, so the
 * map of keys to readings is one function every chart shares, and a spec can
 * hold it without a page.
 */

/** How the readings of a chart are laid out, which decides what each arrow does. */
export interface ReadingLayout {
  /**
   * The axis the readings run along: `inline` along the line of text, `block`
   * down the box, as a horizontal bar chart runs its categories, and `none`
   * for a ring or a plane, whose readings are walked in the table's order.
   */
  axis: 'block' | 'inline' | 'none'
  /** How many readings there are. */
  count: number
  /** How many readings stand in one column, for a grid. `1` is a row of them. */
  grid: number
  /** Whether the line of text runs right to left, which turns the inline arrows. */
  rtl: boolean
  /** How many series a reading holds, which the cross pair of arrows walks. */
  series: number
}

/** A reading and the series within it, `-1` for none and for the whole reading. */
export interface ReadingPlace {
  /** The reading, or `-1` for none. */
  at: number
  /** The series within it, by its place among the plotted ones, or `-1` for all of them. */
  series: number
}

const vertical = (key: string): number => (key === 'ArrowDown' ? 1 : key === 'ArrowUp' ? -1 : 0)

/* The arrow pointing along the line of text moves on, which is the right arrow
   on a left-to-right page and the left one on a right-to-left page: the same
   answer `inlineStep` gives an element. */
const inline = (key: string, rtl: boolean): number =>
  key === 'ArrowRight' ? (rtl ? -1 : 1) : key === 'ArrowLeft' ? (rtl ? 1 : -1) : 0

/**
 * Which way a key moves along the readings: `1`, `-1`, or `0` for a key that
 * moves something else.
 *
 * The arrows along the line on an inline chart, down the box on a block one,
 * and a whole column across on a grid. The cross pair walks the readings too
 * wherever a reading holds one series, so no arrow is dead.
 */
export const alongReadings = (key: string, layout: ReadingLayout): number => {
  const single = layout.grid > 1 || layout.series < 2
  if (layout.axis === 'block') {
    const down = vertical(key)
    return down !== 0 || !single ? down : inline(key, layout.rtl)
  }
  const across = inline(key, layout.rtl)
  if (across !== 0) {
    return across * Math.max(1, layout.grid)
  }
  return single ? vertical(key) : 0
}

/**
 * Which way a key moves among the series of a reading: the pair of arrows
 * that does not walk the readings, and only where a reading holds two or more.
 * Down the bubble's list for the arrow pointing down, or along the line.
 */
export const amongSeries = (key: string, layout: ReadingLayout): number => {
  if (layout.grid > 1 || layout.series < 2) {
    return 0
  }
  return layout.axis === 'block' ? inline(key, layout.rtl) : vertical(key)
}

/**
 * Where a key moves the reading, or `undefined` for a key that moves nothing,
 * which the page keeps.
 *
 * Home and End go to the first and the last. From no reading, an arrow moving
 * on starts at the first and one moving back at the last, so either arrow
 * starts somewhere a reader expects. A series key on no reading starts on the
 * first. Nothing walks off either end.
 */
export const stepReading = (
  key: string,
  from: ReadingPlace,
  layout: ReadingLayout,
): ReadingPlace | undefined => {
  const last = layout.count - 1
  if (last < 0) {
    return undefined
  }
  if (key === 'Home') {
    return { at: 0, series: from.series }
  }
  if (key === 'End') {
    return { at: last, series: from.series }
  }
  const along = alongReadings(key, layout)
  if (along !== 0) {
    const at = from.at < 0 ? (along > 0 ? 0 : last) : Math.min(Math.max(from.at + along, 0), last)
    return { at, series: from.series }
  }
  const among = amongSeries(key, layout)
  if (among !== 0) {
    return {
      at: Math.max(from.at, 0),
      series: Math.min(Math.max(from.series + among, -1), layout.series - 1),
    }
  }
  return undefined
}
