import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessDatePicker } from '@fusion.dev/helix-headless/date-picker'
import type { CSSResultGroup } from 'lit'
import { styles } from './date-picker-root.css.js'

/**
 * @summary A month calendar for choosing one or more dates.
 *
 * @description
 * Six week rows always, so the grid keeps one height and a month change does
 * not move whatever sits beneath it.
 *
 * The column track is wider than the day, and the day is centered in it. The
 * difference is the space between days, which belongs to the track rather than
 * to a `gap`, so a range can paint across the whole track and stay continuous.
 *
 * Days from the neighboring months stay in place, marked quieter rather than
 * hidden, so the first and last weeks are whole rows rather than ragged ones.
 * They are filler and take no click, which the pointer says: no hover, and the
 * cursor a box that does nothing has. At `months="2"` the same date is a
 * trailing cell in one grid and a real one in the next, so a filler day that
 * could be chosen would put one answer on the page twice.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @aliases Calendar, Date grid, Month view
 * @documentation https://fusion.dev/helix/components/date-picker
 *
 * @cssproperty --date-picker-columns - Months per row. Two unless there is only one.
 * @cssproperty --date-picker-day-size - Width and height of a day.
 * @cssproperty --date-picker-range-color - Band behind the days in a range.
 * @cssproperty --date-picker-row-size - Height of a week row.
 * @cssproperty --date-picker-selected-color - Fill behind a selected day.
 * @cssproperty --date-picker-track-size - Width of a column, which is what sets the space between days.
 */
@customElement('helix-date-picker')
export class HelixDatePicker extends HelixHeadlessDatePicker {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-date-picker': HelixDatePicker
  }
}
