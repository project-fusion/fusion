import { customElement, HelixElement, HelixSelectEvent } from '@helix-io/core'
import { caretLeft, caretRight } from '@helix-io/icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'

/** Keys the grid answers to, per the APG date grid. */
const KEYS = new Set([
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'End',
  'Enter',
  'Home',
  'PageDown',
  'PageUp',
  ' ',
])

/**
 * Dates are held as `YYYY-MM-DD` and computed in UTC.
 *
 * A local-time `Date` shifts across a timezone or a daylight-saving boundary,
 * so the same calendar renders a different grid depending on where it is read.
 * Parsing and formatting both in UTC makes the string the source of truth and
 * the arithmetic total.
 */
const toUtc = (iso: string): Date | null => {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!parts) {
    return null
  }
  const date = new Date(Date.UTC(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])))
  return Number.isNaN(date.getTime()) ? null : date
}

const toIso = (date: Date): string => date.toISOString().slice(0, 10)

const addDays = (date: Date, days: number): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days))

/** Whether two dates fall in the same month of the same year. */
const sameMonth = (left: Date, right: Date): boolean =>
  left.getUTCFullYear() === right.getUTCFullYear() && left.getUTCMonth() === right.getUTCMonth()

const addMonths = (date: Date, months: number): Date => {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1))
  // Clamped, so the last of a long month lands on the last of a short one
  // instead of rolling into the month after it.
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  return new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), Math.min(date.getUTCDate(), last)),
  )
}

/**
 * @summary Shows a month, and takes a date from it.
 *
 * @description
 * A grid of days, per the APG date grid: the whole grid is one tab stop, arrows
 * move by day and week, `PageUp` and `PageDown` move by month, and `Home` and
 * `End` go to the ends of the week. Only the focused cell is in the tab
 * sequence.
 *
 * Roving `tabindex` is written on the cells, which is free here because they
 * are rendered into this shadow root rather than being markup a consumer wrote.
 *
 * Dates are `YYYY-MM-DD` strings and every calculation is in UTC. A local-time
 * `Date` shifts across a timezone or a daylight-saving boundary, so the string
 * is what the component holds and the arithmetic never leaves UTC.
 *
 * `month` is what the grid shows, separately from `value`, so paging through
 * months does not select anything and a consumer can drive the view. Left
 * unset, it follows the selected date, and then the current month.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Date grid, Month view
 * @documentation https://helix.fusion.dev/components/calendar
 *
 * @event {HelixSelectEvent} helix-select - Fired when a date is chosen, with the ISO date.
 *
 * @csspart header - The month name and its controls.
 * @csspart previous - The control that moves to the previous month.
 * @csspart next - The control that moves to the next month.
 * @csspart heading - The month and year being shown.
 * @csspart grid - The grid of days.
 * @csspart weekday - A column header naming a day of the week.
 * @csspart week - One row of days.
 * @csspart day - One day.
 */
@customElement('helix-base-calendar')
export class HelixBaseCalendar extends HelixElement {
  /** The selected date, as `YYYY-MM-DD`. */
  @property()
  value = ''

  /** The month on show, as `YYYY-MM`. Follows `value`, then the current month. */
  @property()
  month = ''

  /** Earliest selectable date, as `YYYY-MM-DD`. */
  @property()
  min = ''

  /** Latest selectable date, as `YYYY-MM-DD`. */
  @property()
  max = ''

  /** Accessible name for the grid. */
  @property()
  label = 'Calendar'

  /** First column of the week, `0` for Sunday through `6` for Saturday. */
  @property({ attribute: 'first-day', type: Number })
  firstDay = 0

  /** The date the grid's tab stop is on. Absent until the grid is used. */
  @state()
  private focused = ''

  /** The month being shown, resolved from `month`, then `value`, then today. */
  private get shown(): Date {
    const explicit = /^(\d{4})-(\d{2})$/.exec(this.month)
    if (explicit) {
      return new Date(Date.UTC(Number(explicit[1]), Number(explicit[2]) - 1, 1))
    }
    const selected = toUtc(this.value)
    const from = selected ?? new Date()
    return new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1))
  }

  /**
   * The date the tab stop sits on, which is where the arrows move from.
   *
   * It has to be a date the grid actually renders, so the month is compared
   * with its year. Comparing the month alone puts the stop on the same date a
   * year away, which is rendered nowhere, and the grid is left with no tab stop
   * at all and no way into it from the keyboard.
   *
   * Each candidate is tested in turn rather than the first one winning
   * outright. Where the last date focused is in some other month, the selected
   * date still holds the stop, and only with neither in view does it fall to
   * the first of the month.
   */
  private get anchor(): Date {
    const shown = this.shown
    for (const candidate of [toUtc(this.focused), toUtc(this.value)]) {
      if (candidate && sameMonth(candidate, shown)) {
        return candidate
      }
    }
    return shown
  }

  /** Six weeks of dates, so the grid does not change height between months. */
  private get weeks(): Date[][] {
    const shown = this.shown
    const offset = (shown.getUTCDay() - this.firstDay + 7) % 7
    const start = addDays(shown, -offset)
    return Array.from({ length: 6 }, (_, week) =>
      Array.from({ length: 7 }, (_, day) => addDays(start, week * 7 + day)),
    )
  }

  private outOfRange(date: Date): boolean {
    const iso = toIso(date)
    return (this.min !== '' && iso < this.min) || (this.max !== '' && iso > this.max)
  }

  private show(date: Date): void {
    this.month = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
  }

  private moveTo(date: Date): void {
    this.focused = toIso(date)
    this.show(date)
    this.updateComplete.then(() => {
      this.renderRoot.querySelector<HTMLElement>('[part="day"][tabindex="0"]')?.focus()
    })
  }

  private select(date: Date): void {
    if (this.outOfRange(date)) {
      return
    }
    const iso = toIso(date)
    this.value = iso
    this.focused = iso
    this.dispatchEvent(new HelixSelectEvent({ value: iso }))
  }

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (!KEYS.has(event.key)) {
      return
    }
    const from = this.anchor

    if (event.key === 'Enter' || event.key === ' ') {
      this.select(from)
    } else if (event.key === 'ArrowLeft') {
      this.moveTo(addDays(from, -1))
    } else if (event.key === 'ArrowRight') {
      this.moveTo(addDays(from, 1))
    } else if (event.key === 'ArrowUp') {
      this.moveTo(addDays(from, -7))
    } else if (event.key === 'ArrowDown') {
      this.moveTo(addDays(from, 7))
    } else if (event.key === 'Home') {
      this.moveTo(addDays(from, -((from.getUTCDay() - this.firstDay + 7) % 7)))
    } else if (event.key === 'End') {
      this.moveTo(addDays(from, 6 - ((from.getUTCDay() - this.firstDay + 7) % 7)))
    } else {
      // Shift pages by a year, which is the same move twelve months over.
      const step = event.key === 'PageUp' ? -1 : 1
      this.moveTo(addMonths(from, event.shiftKey ? step * 12 : step))
    }

    event.preventDefault()
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('keydown', this.handleKeydown)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('keydown', this.handleKeydown)
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    this.internals.role = 'group'
    this.internals.ariaLabel = this.label
  }

  protected override render(): TemplateResult {
    const shown = this.shown
    const anchor = toIso(this.anchor)
    const names = new Intl.DateTimeFormat(undefined, {
      month: 'long',
      timeZone: 'UTC',
      year: 'numeric',
    })
    const weekday = new Intl.DateTimeFormat(undefined, { timeZone: 'UTC', weekday: 'short' })
    const full = new Intl.DateTimeFormat(undefined, { dateStyle: 'full', timeZone: 'UTC' })

    return html`<div part="header">
        <button
          part="previous"
          type="button"
          aria-label="Previous month"
          @click=${() => this.show(addMonths(shown, -1))}
        >
          <svg fill="currentColor" viewBox=${caretLeft.viewBox} aria-hidden="true">
            ${unsafeSVG(caretLeft.content)}
          </svg>
        </button>
        <span part="heading" aria-live="polite">${names.format(shown)}</span>
        <button
          part="next"
          type="button"
          aria-label="Next month"
          @click=${() => this.show(addMonths(shown, 1))}
        >
          <svg fill="currentColor" viewBox=${caretRight.viewBox} aria-hidden="true">
            ${unsafeSVG(caretRight.content)}
          </svg>
        </button>
      </div>
      <div part="grid" role="grid" aria-label=${names.format(shown)}>
        <div part="week" role="row">
          ${this.weeks[0]?.map(
            (date) =>
              html`<span part="weekday" role="columnheader" abbr=${weekday.format(date)}
                >${weekday.format(date)}</span
              >`,
          )}
        </div>
        ${this.weeks.map(
          (week) => html`<div part="week" role="row">
            ${week.map((date) => {
              const iso = toIso(date)
              const outside = !sameMonth(date, shown)
              const disabled = this.outOfRange(date)
              return html`<span
                part="day"
                role="gridcell"
                aria-disabled=${disabled ? 'true' : nothing}
                aria-label=${full.format(date)}
                aria-selected=${iso === this.value ? 'true' : nothing}
                data-outside=${outside ? '' : nothing}
                tabindex=${iso === anchor ? '0' : '-1'}
                @click=${() => this.select(date)}
                >${date.getUTCDate()}</span
              >`
            })}
          </div>`,
        )}
      </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-calendar': HelixBaseCalendar
  }
}
