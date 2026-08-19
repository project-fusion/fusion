import {
  customElement,
  HelixFormElement,
  HelixNavigateEvent,
  hostAria,
  MixinControllerValue,
  requestControlledChange,
} from '@helix-io/core'
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
 * `helix-change` was `helix-select`, and it moved when the calendar became a
 * form control. A control whose value changes dispatches `helix-change` here:
 * `Input`, `Select`, `Listbox`, `Radio.Group` and `Toggle.Group` all do, and a
 * calendar submitting a date is the same kind of thing. `helix-select` stays
 * what it is elsewhere, which is a row or an item being chosen in something
 * that reports no value at all, such as `Menu` or `Tree`.
 *
 * Paging is `helix-navigate` and not either of those, because it chooses
 * nothing: the view moves and the answer does not.
 *
 * @event {HelixChangeEvent} helix-change - Fired before the dates change, and cancelable.
 * @event {HelixNavigateEvent} helix-navigate - Fired before the month on show changes, and cancelable.
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
 * @csspart cell - One column of a row, which is what a range paints.
 * @csspart day - The shape inside a cell, which is what a single date paints.
 */
@customElement('helix-base-calendar')
export class HelixBaseCalendar extends MixinControllerValue(HelixFormElement) {
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

  /**
   * The month on show, as `YYYY-MM`. Follows `value`, then the current month.
   *
   * Separate from `value` on purpose, so paging selects nothing and a consumer
   * can drive the view. It said that and could not do it: the calendar wrote
   * this when the reader paged, so a consumer holding it was overwritten and
   * never told. Reading gives the month on show; writing declares it theirs,
   * and `default-month` seeds one the calendar owns.
   */
  @property()
  get month(): string {
    /* What is on show, which is what the tag says it gives.
     *
     * It returned `''` while a month was plainly on display, because nothing had
     * declared one, and `show()` compares against it before moving: the guard
     * was dead, so the first arrow key wrote `monthState` and from then on the
     * grid stopped following `value`. A calendar whose consumer moved the value
     * showed the month the reader had last paged to instead. */
    return this.monthState ?? (this.defaultMonth || toIso(this.derivedMonth).slice(0, 7))
  }

  set month(next: string) {
    const previous = this.month
    this.monthState = next
    this.requestUpdate('month', previous)
  }

  /**
   * Accessible name for the control that pages back.
   *
   * A property because this is the one component in the library that takes a
   * `locale`, and it carried two hardcoded English names with no way to change
   * them: a calendar rendering its own month names in Japanese still announced
   * its controls in English. `attribute:` spelled out, since Lit lowercases a
   * camelCase name rather than dash-casing it.
   */
  @property({ attribute: 'previous-label' })
  previousLabel = 'Previous month'

  /** Accessible name for the control that pages forward. */
  @property({ attribute: 'next-label' })
  nextLabel = 'Next month'

  /** Month to open on, where nothing declared one. */
  @property({ attribute: 'default-month' })
  defaultMonth = ''

  /** The month on show, whoever set it, and `undefined` until somebody has. */
  private monthState: string | undefined = undefined

  /** Whether the consumer owns the view, decided once and then fixed. */
  private monthMode: boolean | undefined = undefined

  private get monthIsControlled(): boolean {
    return this.monthMode === true
  }

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
    const explicit = /^(\d{4})-(\d{2})$/.exec(this.monthState ?? this.defaultMonth)
    if (explicit) {
      return new Date(Date.UTC(Number(explicit[1]), Number(explicit[2]) - 1, 1))
    }
    return this.derivedMonth
  }

  /**
   * The month to open on when nothing has declared one.
   *
   * Split out from `shown` so `month` can report what is on display without the
   * two calling each other: `month` reading `shown` and `shown` reading `month`
   * is a stack overflow, and the specs found it immediately.
   */
  private get derivedMonth(): Date {
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

  /**
   * Whether a date is barred, by bound, by weekday, or by name.
   *
   * `barred`, not `disabled`: the calendar is a form control now, and
   * `HelixFormElement.disabled` is a boolean about the whole control. A method
   * and a flag cannot share a name, and of the two it is the method that should
   * move, because "disabled" on a control means one thing everywhere else in
   * the library.
   */
  private barred(date: Date): boolean {
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

  /**
   * Moves the view, announcing it first.
   *
   * `helix-navigate` and not `helix-change`: paging chooses nothing, and a
   * consumer driving the view has to hear that it moved without being told the
   * answer did. In controlled mode nothing moves and the consumer decides,
   * which is the point of them holding it.
   */
  private show(date: Date): void {
    if (this.disabled) {
      return
    }
    const next = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
    if (next === this.month) {
      return
    }
    requestControlledChange({
      apply: (month) => {
        if (this.monthIsControlled) {
          return
        }
        const previous = this.month
        this.monthState = month
        this.requestUpdate('month', previous)
      },
      controlled: this.monthIsControlled,
      event: (month) => new HelixNavigateEvent({ value: month }),
      host: this,
      label: 'month',
      next,
      read: () => this.month,
    })
  }

  private moveTo(date: Date): void {
    this.focused = toIso(date)
    this.show(date)
    this.updateComplete.then(() => {
      this.renderRoot.querySelector<HTMLElement>('[part="cell"][tabindex="0"]')?.focus()
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
    /* `disabled` meant nothing here beyond dropping the value at submit time:
       days still took a click, the keyboard still moved through the grid, and
       nothing said the control was off. Refused at the source rather than at
       each cell, so every path in is covered by one check. */
    if (this.disabled) {
      return
    }
    if (this.barred(date)) {
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

    /* Focus moves whatever happens, because the reader pressed there and the
       roving tab stop is about where they are rather than about what is
       chosen. The selection is the part that can be refused. */
    this.focused = iso

    /* Announced before it is written, which it was not: this set `value` and
       then dispatched, so a listener calling `preventDefault()` was refusing a
       date that had already been chosen. `requestControlledChange` is the one
       audited path its own documentation claims for every stateful change in
       the system, and this was not on it. */
    this.requestValue(next.join(','))
  }

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (!KEYS.has(event.key) || this.disabled) {
      return
    }
    /* Grid keys, from the grid.
     *
     * The listener is on the host and the host holds the previous and next
     * buttons as well, so Enter and Space pressed on one of those were read as
     * "choose the focused day" and then `preventDefault()`ed: the button's own
     * activation was cancelled and the month never moved. Every arrow was taken
     * from them too. */
    const path = event.composedPath()
    const grid = this.renderRoot?.querySelector('[part="grid"]')
    if (!grid || !path.includes(grid)) {
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
    // Only the first time, before anything reads it. See `MixinControllerOpen`.
    if (this.monthMode === undefined) {
      this.monthMode = this.monthState !== undefined
    }
    hostAria(this.internals, { label: this.label, role: 'group' })
    /* Announced as off, not merely inert. Removing it from the accessibility
       tree would take the dates with it; this says the control exists and
       cannot be used, which is the same call `HelixFormElement` documents. */
    this.internals.ariaDisabled = this.disabled ? 'true' : null
    this.internals.ariaInvalid = this.invalid ? 'true' : null
    this.report()
  }

  /**
   * Reports the dates to the form, one entry each.
   *
   * `FormData` rather than the comma-joined string the property holds, because
   * `mode="multiple"` is genuinely several answers and a server reading
   * `dates=2026-08-04,2026-08-06` has to know to split it on a convention this
   * library invented. One entry per date is what every other multi-valued
   * control on the platform sends, and `range` sends its two the same way, in
   * order, so start and end arrive as the pair they already are.
   *
   * **Nothing at all without a `name`, and that is the mechanism rather than a
   * detail.** It is what lets a calendar sit inside something that owns the
   * form value, which is how `DatePicker` will hold one. The guard has to be
   * explicit here in a way it does not for `Listbox`: a control reporting a
   * plain string is skipped by the form when it has no name, but a `FormData`
   * carries its own names and its entries are appended whatever the element is
   * called, so an unnamed calendar would submit empty-named dates.
   */
  private report(): void {
    const dates = this.selected
    if (this.name === '' || this.disabled || dates.length === 0) {
      this.internals.setFormValue(null)
      return
    }
    const data = new FormData()
    for (const date of dates) {
      data.append(this.name, date)
    }
    this.internals.setFormValue(data)
  }

  /**
   * How many months are shown, clamped once.
   *
   * `months` was clamped at the call site and read raw where the last month is
   * identified, so a zero, a negative or a non-numeric value rendered nothing
   * and took the forward control with it: `index === this.months - 1` is never
   * true for `NaN`. One getter both read.
   */
  private get monthCount(): number {
    return Math.max(1, Math.floor(this.months) || 1)
  }

  /**
   * The three date formatters, built once per locale rather than per render.
   *
   * `Intl.DateTimeFormat` is expensive to construct and these depend on nothing
   * but `locale`, and they were built inside the per-month render: three
   * constructions for every month on show, on every update, so a two-month
   * calendar rebuilt six of them each time an arrow key moved the anchor.
   * Measured elsewhere at about a quarter of a millisecond apiece, which is not
   * a crisis and is pure waste.
   *
   * Keyed on the locale so a change to it is picked up, which a plain lazy
   * field would not do.
   */
  private cachedFormats:
    | {
        full: Intl.DateTimeFormat
        heading: Intl.DateTimeFormat
        locale: string
        weekday: Intl.DateTimeFormat
      }
    | undefined

  private get formats(): {
    full: Intl.DateTimeFormat
    heading: Intl.DateTimeFormat
    weekday: Intl.DateTimeFormat
  } {
    if (this.cachedFormats?.locale === this.locale) {
      return this.cachedFormats
    }
    const locale = this.locale || undefined
    const built = {
      full: new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeZone: 'UTC' }),
      heading: new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC', year: 'numeric' }),
      locale: this.locale,
      weekday: new Intl.DateTimeFormat(locale, { timeZone: 'UTC', weekday: 'short' }),
    }
    this.cachedFormats = built
    return built
  }

  private renderMonth(month: Date, index: number): TemplateResult {
    const { full, heading, weekday } = this.formats
    const weeks = this.weeksOf(month)
    const anchor = toIso(this.anchor)
    /* Today, which nothing marked at all: not in the accessibility tree, where
       `aria-current="date"` is the word for it, and not on the cell either, so a
       consumer could not add the mark from CSS. Computed once per month rather
       than per cell. */
    const today = toIso(new Date())
    const range = this.range

    // One set of controls across the whole run: back on the first month,
    // forward on the last. A pair per month would offer six ways to make the
    // same move and leave the reader to work out which.
    const first = index === 0
    const last = index === this.monthCount - 1

    return html`<div part="month">
      <div part="header">
        ${
          first
            ? html`<button
                part="previous"
                type="button"
                aria-label=${this.previousLabel}
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
                aria-label=${this.nextLabel}
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
              const disabled = this.barred(date)
              const selected = this.isSelected(iso)
              // The cell is the column track and the day is the shape centered
              // in it. A range paints the track, so it runs continuously
              // between days and stops at the ends of a row on its own.
              return html`<span
                part="cell"
                role="gridcell"
                aria-disabled=${disabled ? 'true' : nothing}
                aria-label=${full.format(date)}
                aria-current=${iso === today ? 'date' : nothing}
                aria-selected=${selected ? 'true' : nothing}
                data-outside=${sameMonth(date, month) ? nothing : ''}
                data-range-end=${range && iso === range[1] ? '' : nothing}
                data-range-middle=${range && iso > range[0] && iso < range[1] ? '' : nothing}
                data-range-start=${range && iso === range[0] ? '' : nothing}
                data-today=${iso === today ? '' : nothing}
                tabindex=${sameMonth(date, month) && iso === anchor ? '0' : '-1'}
                @click=${() => this.select(date)}
                ><span part="day">${date.getUTCDate()}</span></span
              >`
            })}
          </div>`,
        )}
      </div>
    </div>`
  }

  protected override render(): TemplateResult {
    const shown = this.shown
    const count = this.monthCount
    /* The column count, written out for the tier above.
       Data rather than styling, the same arrangement Slider uses for its
       fraction: only this element knows how many months there are, and a
       stylesheet cannot count children into a `repeat()`. Capped at two, and a
       consumer wanting more sets `--calendar-columns`. */
    return html`<div part="months" style="--_calendar-columns: ${Math.min(count, 2)}">
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
