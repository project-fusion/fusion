import { customElement, reducedMotion } from '@fusion.dev/helix-core'
import { HelixHeadlessDatePicker } from '@fusion.dev/helix-headless/date-picker'
import type { CSSResultGroup, PropertyValues } from 'lit'
import { styles } from './date-picker-root.generated.css.js'

/**
 * @summary A month calendar for choosing one or more dates.
 *
 * @description
 * The grid always has six week rows, so it keeps one height and a month change
 * does not move the content below it. The next month slides in from the end
 * the reader pages toward, and an earlier one from the start; under
 * `prefers-reduced-motion` it changes at once.
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
 * @use A date or a range chosen on a calendar that stays open on the page.
 * @instead date-input - A date in a form field, typed or picked from a calendar that opens.
 * @instead time-picker - A time of day, chosen from a list.
 * @instead heatmap - Activity drawn day by day, such as contributions.
 * @anatomy previous
 * @anatomy heading
 * @anatomy next
 * @anatomy weekday
 * @anatomy day
 * @practice Write `value`, `min`, and `max` as `YYYY-MM-DD` strings. - Every calculation is in UTC, since a local-time `Date` shifts across a time zone or daylight-saving boundary.
 * @practice {controlled-month} Set `month` to choose the month on show apart from `value`. - Paging selects nothing, and an unset `month` follows the first chosen date, then the current month.
 * @documentation https://fusion.dev/helix/components/date-picker
 *
 * @cssproperty --date-picker-columns - Months per row. Two unless there is only one.
 * @cssproperty --date-picker-day-size - Width and height of a day.
 * @cssproperty --date-picker-feedback-color - The color of the message under the calendar, while `feedback` is set.
 * @cssproperty --date-picker-period-size - Height of a month or a year in the months and years views, where `max-view` is set.
 * @cssproperty --date-picker-range-color - Band behind the days in a range.
 * @cssproperty --date-picker-range-preview-color - Band behind the days a waiting range is drawn to, before its second end is chosen.
 * @cssproperty --date-picker-row-size - Height of a week row.
 * @cssproperty --date-picker-selected-background-color - Fill behind a selected day.
 * @cssproperty --date-picker-track-size - Width of a column, which is what sets the space between days.
 */
@customElement('helix-date-picker')
export class HelixDatePicker extends HelixHeadlessDatePicker {
  static override styles: CSSResultGroup = styles

  /**
   * When the first month on show began at the last render. Kept from then,
   * because by the next update the month asked for is already the one on
   * show.
   */
  private monthBefore: number | undefined

  /**
   * **The next month slides in from the end the reader is paging toward**,
   * and an earlier one from the start, fading in on the way, so paging reads
   * as moving along the year rather than as the grid's numbers changing. The
   * grid keeps its six rows, so nothing around it moves.
   */
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed)
    const before = this.monthBefore
    const now = this.shownTime
    this.monthBefore = now
    if (before === undefined || before === now || reducedMotion()) {
      return
    }
    const style = getComputedStyle(this)
    const written = style.getPropertyValue('--helix-duration-normal').trim()
    const amount = Number.parseFloat(written)
    const duration = written.endsWith('ms') ? amount : amount * 1000
    if (!(duration >= 1)) {
      return
    }
    const travel = style.getPropertyValue('--helix-space-lg').trim() || '1.5rem'
    const sign = (now > before ? 1 : -1) * (style.direction === 'rtl' ? -1 : 1)
    const easing = style.getPropertyValue('--helix-easing-decelerate').trim() || 'ease-out'
    for (const month of this.renderRoot.querySelectorAll<HTMLElement>('[part="month"]')) {
      month.animate?.(
        [
          { opacity: 0, transform: `translateX(calc(${travel} * ${sign}))` },
          { opacity: 1, transform: 'none' },
        ],
        { duration, easing },
      )
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-date-picker': HelixDatePicker
  }
}
