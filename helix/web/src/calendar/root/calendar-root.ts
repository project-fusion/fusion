import { customElement } from '@helix-io/core'
import { HelixBaseCalendar } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { styles } from './calendar-root.css.js'

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
 * @aliases Date grid, Month view
 * @documentation https://helix.fusion.dev/components/calendar
 *
 * @cssproperty --calendar-columns - Months per row. Two unless there is only one.
 * @cssproperty --calendar-day-size - Width and height of a day.
 * @cssproperty --calendar-track-size - Width of a column, which is what sets the space between days.
 * @cssproperty --calendar-row-size - Height of a week row.
 * @cssproperty --calendar-selected-color - Fill behind a selected day.
 * @cssproperty --calendar-range-color - Band behind the days in a range.
 */
@customElement('helix-calendar')
export class HelixCalendar extends HelixBaseCalendar {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-calendar': HelixCalendar
  }
}
