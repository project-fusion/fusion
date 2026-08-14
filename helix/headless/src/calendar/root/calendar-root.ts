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

/** Splits a comma-separated attribute, tolerating spaces and empty entries. */
const list = (value: string): string[] =>
  value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)

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
 * unset, it follows the first selected date, and then the current month.
 *
 * `mode` decides how many dates are held. Absent takes one. `range` takes two
 * and marks everything between them, starting over on the third click rather
 * than replacing an end at random. `multiple` toggles, so clicking a chosen
 * date takes it out. All three read and write the same comma-separated
 * `value`.
 *
 * `locale` is worth setting where the output is compared across environments.
 * Left unset, month and day names come from the runtime's own locale, and a
 * server and a browser need not agree on what that is.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Date grid, Month view
 * @documentation https://helix.fusion.dev/components/calendar
 *
 * @event {HelixSelectEvent} helix-select - Fired when a date is chosen, with the ISO date.
 *
 * @csspart months - The run of months.
 * @csspart month - One month, its header and its grid.
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
  /**
   * The selected dates, comma separated, as `YYYY-MM-DD`.
   *
   * One date in `single`. Two in `range`, the earlier first. Any number in
   * `multiple`. One attribute across all three, so a consumer reads and writes
   * the same thing whatever the mode is.
   */
  @property()
  value = ''

  /** How many dates can be held at once. */
  @property({ reflect: true })
  mode?: 'range' | 'multiple'

  /** How many months to show, side by side. */
  @property({ type: Number })
  months = 1

  /** Locale for month and day names. Absent uses the runtime's own. */
  @property()
  locale = ''

  /** Dates that cannot be chosen, comma separated, as `YYYY-MM-DD`. */
  @property({ attribute: 'disable-dates' })
  disableDates = ''

  /** Days of the week that cannot be chosen, comma separated, `0` to `6`. */
  @property({ attribute: 'disable-days' })
  disableDays = ''

  /** Whether the current selection fails validation. */
  @property({ reflect: true, type: Boolean })
  invalid = false

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
  @property({ attribute: 'first-day-of-week', type: Number })
  firstDayOfWeek = 0

  /** The date the grid's tab stop is on. Absent until the grid is used. */
  @state()
  private focused = ''

  /** The selected dates, in order. */
  private get selected(): string[] {
    return list(this.value)
  }

  /** The range's ends, when there are two and the mode asks for them. */
  private get range(): [string, string] | null {
    const dates = this.selected
    if (this.mode !== 'range' || dates.length < 2) {
      return null
    }
    const [first, second] = [dates[0] as string, dates[1] as string]
    return first <= second ? [first, second] : [second, first]
  }

  private isSelected(iso: string): boolean {
    const range = this.range
    if (range) {
      return iso >= range[0] && iso <= range[1]
    }
    return this.selected.includes(iso)
  }

  /** The month being shown, resolved from `month`, then `value`, then today. */
  private get shown(): Date {
    const explicit = /^(\d{4})-(\d{2})$/.exec(this.month)
    if (explicit) {
      return new Date(Date.UTC(Number(explicit[1]), Number(explicit[2]) - 1, 1))
    }
    const from = toUtc(this.selected[0] ?? '') ?? new Date()
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
    for (const candidate of [toUtc(this.focused), toUtc(this.selected[0] ?? '')]) {
      if (candidate && sameMonth(candidate, shown)) {
        return candidate
      }
    }
    return shown
  }

  /** Six weeks of dates, so a grid does not change height between months. */
  private weeksOf(month: Date): Date[][] {
    const offset = (month.getUTCDay() - this.firstDayOfWeek + 7) % 7
    const start = addDays(month, -offset)
    return Array.from({ length: 6 }, (_, week) =>
      Array.from({ length: 7 }, (_, day) => addDays(start, week * 7 + day)),
    )
  }

  /** Whether a date is barred, by bound, by weekday, or by name. */
  private disabled(date: Date): boolean {
    const iso = toIso(date)
    if (this.min !== '' && iso < this.min) {
      return true
    }
    if (this.max !== '' && iso > this.max) {
      return true
    }
    if (list(this.disableDays).includes(String(date.getUTCDay()))) {
      return true
    }
    return list(this.disableDates).includes(iso)
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

  /**
   * Adds a date to the selection, as the mode allows.
   *
   * `range` starts over once it holds two, so a third click begins a new range
   * rather than extending or replacing an end at random. `multiple` toggles, so
   * clicking a chosen date takes it out.
   */
  private select(date: Date): void {
    if (this.disabled(date)) {
      return
    }
    const iso = toIso(date)
    const held = this.selected

    let next: string[]
    if (this.mode === 'range') {
      next = held.length === 1 ? [...held, iso].sort() : [iso]
    } else if (this.mode === 'multiple') {
      next = held.includes(iso) ? held.filter((entry) => entry !== iso) : [...held, iso].sort()
    } else {
      next = [iso]
    }

    this.value = next.join(',')
    this.focused = iso
    this.dispatchEvent(new HelixSelectEvent({ value: this.value }))
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
      this.moveTo(addDays(from, -((from.getUTCDay() - this.firstDayOfWeek + 7) % 7)))
    } else if (event.key === 'End') {
      this.moveTo(addDays(from, 6 - ((from.getUTCDay() - this.firstDayOfWeek + 7) % 7)))
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
    this.internals.ariaInvalid = this.invalid ? 'true' : null
  }

  private renderMonth(month: Date, index: number): TemplateResult {
    const locale = this.locale || undefined
    const heading = new Intl.DateTimeFormat(locale, {
      month: 'long',
      timeZone: 'UTC',
      year: 'numeric',
    })
    const weekday = new Intl.DateTimeFormat(locale, { timeZone: 'UTC', weekday: 'short' })
    const full = new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeZone: 'UTC' })
    const weeks = this.weeksOf(month)
    const anchor = toIso(this.anchor)
    const range = this.range

    // One set of controls across the whole run: back on the first month,
    // forward on the last. A pair per month would offer six ways to make the
    // same move and leave the reader to work out which.
    const first = index === 0
    const last = index === this.months - 1

    return html`<div part="month">
      <div part="header">
        ${
          first
            ? html`<button
                part="previous"
                type="button"
                aria-label="Previous month"
                @click=${() => this.show(addMonths(this.shown, -1))}
              >
                <svg fill="currentColor" viewBox=${caretLeft.viewBox} aria-hidden="true">
                  ${unsafeSVG(caretLeft.content)}
                </svg>
              </button>`
            : nothing
        }
        <span part="heading">${heading.format(month)}</span>
        ${
          last
            ? html`<button
                part="next"
                type="button"
                aria-label="Next month"
                @click=${() => this.show(addMonths(this.shown, 1))}
              >
                <svg fill="currentColor" viewBox=${caretRight.viewBox} aria-hidden="true">
                  ${unsafeSVG(caretRight.content)}
                </svg>
              </button>`
            : nothing
        }
      </div>
      <div part="grid" role="grid" aria-label=${heading.format(month)}>
        <div part="week" role="row">
          ${weeks[0]?.map(
            (date) => html`<span part="weekday" role="columnheader">${weekday.format(date)}</span>`,
          )}
        </div>
        ${weeks.map(
          (week) => html`<div part="week" role="row">
            ${week.map((date) => {
              const iso = toIso(date)
              const disabled = this.disabled(date)
              const selected = this.isSelected(iso)
              return html`<span
                part="day"
                role="gridcell"
                aria-disabled=${disabled ? 'true' : nothing}
                aria-label=${full.format(date)}
                aria-selected=${selected ? 'true' : nothing}
                data-outside=${sameMonth(date, month) ? nothing : ''}
                data-range-end=${range && iso === range[1] ? '' : nothing}
                data-range-start=${range && iso === range[0] ? '' : nothing}
                tabindex=${iso === anchor ? '0' : '-1'}
                @click=${() => this.select(date)}
                >${date.getUTCDate()}</span
              >`
            })}
          </div>`,
        )}
      </div>
    </div>`
  }

  protected override render(): TemplateResult {
    const shown = this.shown
    const count = Math.max(1, this.months)
    return html`<div part="months">
      ${Array.from({ length: count }, (_, index) =>
        this.renderMonth(addMonths(shown, index), index),
      )}
    </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-calendar': HelixBaseCalendar
  }
}
