import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessDatePicker } from '@fusion.dev/helix-headless/date-picker'
import type { CSSResultGroup } from 'lit'
import { styles } from './date-picker-root.css.js'

/**
 * @summary A month calendar for choosing one or more dates.
 *
 * @description
 * The grid always has six week rows, so it keeps one height and a month change
 * does not move the content below it.
 *
 * Each column track is wider than a day, with the day centered in it. The space
 * between days belongs to the track and is not set with `gap`, so a range can
 * paint across the whole track and stay continuous.
 *
 * Days from the neighboring months stay in place, styled quieter, so the first
 * and last weeks are full rows. They cannot be chosen, have no hover style, and
 * show the default cursor. With `months="2"`, a date can be a trailing cell in
 * one grid and a real cell in the next, so a selectable filler day would put
 * the same selection on the page twice.
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
