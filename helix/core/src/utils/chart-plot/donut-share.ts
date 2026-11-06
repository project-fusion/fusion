/**
 * What a Donut Chart says of a slice's share, as words with no element in
 * them: the share as the locale writes a percentage, and the rows a slice's
 * bubble reads with that share after its amount.
 */

import type { Row } from '../read-series/read-series.js'
import type { DonutShare } from './donut-plot.js'

/* Built once per locale and kept, `Intl.NumberFormat` being expensive to
   construct and cheap to call. */
const PERCENTS = new Map<string, Intl.NumberFormat>()

/** A share from 0 to 1 as a whole percentage, the way the locale writes one. */
export const percentIn = (locale: string): Intl.NumberFormat => {
  let found = PERCENTS.get(locale)
  if (!found) {
    found = new Intl.NumberFormat(locale || undefined, {
      maximumFractionDigits: 0,
      style: 'percent',
    })
    PERCENTS.set(locale, found)
  }
  return found
}

/**
 * The rows a slice's bubble reads, with the slice's share of the whole after
 * its amount in the plotted `column`, as Area Chart writes a part's share:
 * "612 (24%)". The share is what the ring shows and the table does not, so a
 * reading said by key gives it too, as the summary does.
 */
export const rowsWithShare = <R extends Row>(
  rows: readonly R[],
  column: number | undefined,
  share: DonutShare,
  format: Intl.NumberFormat,
): R[] => {
  const row = rows[share.row]
  const cell = column === undefined ? undefined : row?.cells[column]
  if (!row || !cell || column === undefined) {
    return [...rows]
  }
  const cells = [...row.cells]
  cells[column] = { ...cell, text: `${cell.text} (${format.format(share.fraction)})` }
  return rows.map((one, index) => (index === share.row ? { ...row, cells } : one))
}
