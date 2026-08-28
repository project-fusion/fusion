import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessDatePicker } from '@fusion.dev/helix-headless/date-picker'
import type { CSSResultGroup } from 'lit'
import { styles } from './date-picker-root.css.js'

/**
 * @summary Shows a month, and takes a date from it.
 *
 * @description
 * Six week rows always, so the grid keeps one height and a month change does
 * not move whatever sits beneath it.
 *
 * The column track is wider than the day, and the day is centered in it. The
 * difference is the space between days, which belongs to the track rather than
 * to a `gap`, so a range can paint across the whole track and stay continuous.
 *
 * Days from the neighbouring months stay in place and stay selectable, marked
 * quieter rather than hidden, so the first and last weeks are whole and the
 * grid reads as a continuous run of dates.
 *
 * @since 0.1.0
 * @status experimental
 * @category forms
 * @aliases Calendar, Date grid, Month view
 * @documentation https://helix.fusion.dev/components/date-picker
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
