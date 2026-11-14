/**
 * The rows of segments a field holds, one for a date or a time and two for a
 * range, with no element in them: what a value reads as in each row, what the
 * rows add up to, and whether a reader has left them half set. The web's
 * segmented field and a phone's read the same rows.
 */

import type { MonthSystem } from '../calendar/calendar.js'
import {
  isPartial,
  type SegmentedKind,
  type SegmentSlot,
  type Segments,
  segmentsOf,
  segmentsValue,
} from './date-segments.js'

/** The rows a value names, one per row, empty where it names none. */
export const segmentRowsOf = (
  kind: SegmentedKind,
  value: string,
  count: number,
  system?: MonthSystem,
): Segments[] => {
  const values = count > 1 ? value.split(',') : [value]
  return Array.from({ length: count }, (_, row) =>
    segmentsOf(kind, (values[row] ?? '').trim(), system),
  )
}

/** The value the rows add up to: each row's, joined by commas, or empty while any row is not whole. */
export const segmentRowsValue = (
  kind: SegmentedKind,
  rows: readonly Segments[],
  layout: readonly SegmentSlot[],
  system?: MonthSystem,
): string => {
  const values = rows.map((one) => segmentsValue(kind, one, layout, system))
  return values.some((one) => one === '') ? '' : values.join(',')
}

/**
 * Whether the rows are half set: a row with some segments and not all, or,
 * while the value is empty, one row whole and the other empty, which is half a
 * range.
 */
export const segmentRowsPartial = (
  kind: SegmentedKind,
  rows: readonly Segments[],
  value: string,
  layout: readonly SegmentSlot[],
  system?: MonthSystem,
): boolean =>
  rows.some((one) => isPartial(kind, one, layout, system)) ||
  (value === '' && rows.some((one) => Object.values(one).some((part) => part !== undefined)))

/** Takes the parts a key left in one row, keeping the others. */
export const withRow = (rows: readonly Segments[], row: number, next: Segments): Segments[] =>
  rows.map((one, index) => (index === row ? next : one))
