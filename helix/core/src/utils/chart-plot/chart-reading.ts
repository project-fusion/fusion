/**
 * Which reading of a chart a finger or a pointer is on, and the series a
 * table's rows hold, as arithmetic with no element in it, so a phone reads a
 * chart as the web's does.
 */

import type { Row, Series } from '../read-series/read-series.js'

/**
 * The reading at `fraction` of the plot along its readings, 0 at its start
 * and 1 at its end, or `-1` with no readings.
 *
 * **The same slot arithmetic the charts draw with**: reading `i` sits in the
 * middle of the `i`th of `count` equal slots, so the nearest is the slot the
 * finger is in, and the first and the last reading take as much of the plot
 * as any other.
 */
export const readingAt = (fraction: number, count: number): number => {
  if (count <= 0 || !Number.isFinite(fraction)) {
    return -1
  }
  return Math.min(Math.max(Math.floor(fraction * count), 0), count - 1)
}

/**
 * A table's rows read as series, one for each column that holds a number in
 * some row, as `readSeries` reads a table on the web: each series named by
 * its column's heading, or by `caption` where the table has one column of
 * numbers, and each point at the row it was read from.
 */
export const seriesOfRows = (rows: readonly Row[], caption = ''): Series[] => {
  const widest = rows.reduce((most, row) => Math.max(most, row.cells.length), 0)
  const all = Array.from({ length: widest }, (_, column) => ({
    name: rows.find((row) => row.cells[column]?.name)?.cells[column]?.name || caption,
    points: rows.flatMap((row, at) => {
      const value = row.cells[column]?.value
      return value === undefined
        ? []
        : [{ at, label: row.label, value, ...(row.when ? { when: row.when } : {}) }]
    }),
  }))
  return all.filter((one) => one.points.length > 0)
}

/**
 * Where a reading stands among those shown, in `words` with `{position}` and
 * `{count}` written by `write`, such as "3 of 7". Empty where no position is
 * said or no reading is shown.
 */
export const readingPosition = (
  words: string,
  place: number,
  count: number,
  write: (value: number) => string,
): string =>
  words === '' || place < 0
    ? ''
    : words
        .replaceAll('{position}', () => write(place + 1))
        .replaceAll('{count}', () => write(count))
