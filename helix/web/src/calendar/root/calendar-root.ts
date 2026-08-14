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
 * Days from the neighbouring months stay in place and stay selectable, marked
 * quieter rather than hidden, so the first and last weeks are whole and the
 * grid reads as a continuous run of dates.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Date grid, Month view
 * @documentation https://helix.fusion.dev/components/calendar
 *
 * @cssproperty --calendar-day-size - Width and height of a day.
 * @cssproperty --calendar-selected-color - Fill behind the selected day.
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
