import {
  valueAsDate as asDate,
  customElement,
  dateAsValue as fromDate,
  HelixFormElement,
  HelixNavigateEvent,
  hostAria,
  inlineStep,
  MixinControllerValue,
  requestChange,
} from '@fusion.dev/helix-core'
import { caretLeft, caretRight } from '@fusion.dev/helix-icons'
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
 * Today, in the reader's own timezone.
 *
 * **`toISOString` converts to UTC first, which makes "today" a different day
 * for most of the planet.** Anywhere west of UTC, from late afternoon onward,
 * `fromDate(new Date())` names tomorrow. The parts are read locally instead and
 * pasted together, which is the only way to get a calendar date out of a `Date`
 * without a conversion happening on the way.
 */
const localToday = (): string => {
  const now = new Date()
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  const day = `${now.getDate()}`.padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

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
 * move by day and week, `PageUp` and `PageDown` by month, `Home` and `End` to
 * the ends of the week. Only the focused cell is in the tab sequence.
 *
 * **Dates are `YYYY-MM-DD` strings and every calculation is in UTC.** A
 * local-time `Date` shifts across a timezone or a daylight-saving boundary.
 *
 * `month` is what the grid shows, separately from `value`, so paging does not
 * select anything and a consumer can drive the view. Left unset it follows the
 * first selected date, then the current month.
 *
 * `mode` decides how many dates are held: absent takes one, `range` takes two
 * and marks everything between them, `multiple` toggles. All three read and
 * write the same comma-separated `value`.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @aliases Calendar, Date grid, Month view
 * @documentation https://fusion.dev/helix/components/date-picker
 *
 * @slot next-icon - The glyph on the control that moves forward a month, usually a caret.
 * @slot previous-icon - The glyph on the control that moves back a month, usually a caret.
 *
 * @event {Event} change - Announced once the value has moved.
 * @event {HelixBeforeChangeEvent} helix-before-change - Fired before the dates change, and cancelable.
 * @event {HelixNavigateEvent} helix-navigate - Fired before the month on show changes, and cancelable.
 * @event {Event} input - Announced once the value has moved.
 *
 * @csspart cell - One column of a row, which is what a range paints.
 * @csspart cell-range-end - The cell of a range's last day, beside `cell`.
 * @csspart cell-range-middle - A cell between a range's ends, beside `cell`.
 * @csspart cell-range-start - The cell of a range's first day, beside `cell`.
 * @csspart day - The shape inside a cell, which is what a single date paints.
 * @csspart day-disabled - A day that cannot be chosen, beside `day`.
 * @csspart day-outside - A day from a neighboring month, filling the grid out, beside `day`.
 * @csspart day-selected - The chosen day, or either end of a chosen range, beside `day`.
 * @csspart day-today - Today, beside `day`.
 * @csspart grid - The grid of days.
 * @csspart header - The month name and its controls.
 * @csspart heading - The month and year being shown.
 * @csspart month - One month, its header and its grid.
 * @csspart months - The run of months.
 * @csspart next - The control that moves to the next month.
 * @csspart next-mark - The glyph on the next month control, where none is slotted.
 * @csspart previous - The control that moves to the previous month.
 * @csspart previous-mark - The glyph on the previous month control, where none is slotted.
 * @csspart week - One row of days.
 * @csspart weekday - A column header naming a day of the week.
 *
 * @cssproperty --date-picker-column-count - How many month columns are drawn, capped at two. `--date-picker-columns` overrides it.
 */
@customElement('helix-headless-date-picker')
export class HelixHeadlessDatePicker extends MixinControllerValue(HelixFormElement) {
  /**
   * Month to open on, where nothing declared one.
   */
  @property({ attribute: 'default-month' })
  defaultMonth = ''

  /**
   * Dates that cannot be chosen, comma separated, as `YYYY-MM-DD`.
   */
  @property({ attribute: 'disable-dates' })
  disableDates = ''

  /**
   * Days of the week that cannot be chosen, comma separated, `0` to `6`.
   */
  @property({ attribute: 'disable-days' })
  disableDays = ''

  /**
   * First column of the week, `0` for Sunday through `6` for Saturday.
   */
  @property({ attribute: 'first-day-of-week', type: Number })
  firstDayOfWeek = 0

  /**
   * Whether the current selection fails validation.
   */
  @property({ reflect: true, type: Boolean })
  invalid = false

  /**
   * Accessible name for the grid.
   */
  @property()
  label = 'Date Picker'

  /**
   * Locale for month and day names.
   *
   * Absent uses the runtime's own.
   */
  @property()
  locale = ''

  /**
   * Latest selectable date, as `YYYY-MM-DD`.
   */
  @property()
  max = ''

  /**
   * Earliest selectable date, as `YYYY-MM-DD`.
   */
  @property()
  min = ''

  /**
   * How many dates can be held at once.
   */
  @property({ reflect: true })
  mode?: 'range' | 'multiple'

  /** The month on show, whoever set it, and `undefined` until somebody has. */
  private monthState: string | undefined = undefined

  /**
   * The month on show, as `YYYY-MM`. Follows `value`, then the current month.
   *
   * Separate from `value` on purpose, so paging selects nothing and a consumer
   * can drive the view. Reading gives the month on show; writing sets it, and
   * `default-month` seeds one the calendar keeps until somebody does.
   */
  @property()
  get month(): string {
    /* What is on show, which is what the tag says it gives.
     *
     * `show()` compares the requested month against this before moving, so a
     * getter returning `''` while a month is on display leaves that guard dead:
     * the first arrow key writes `monthState` and from then on the grid stops
     * following `value`. */
    return this.monthState ?? (this.defaultMonth || fromDate(this.derivedMonth).slice(0, 7))
  }

  set month(next: string) {
    const previous = this.month
    this.monthState = next
    this.requestUpdate('month', previous)
  }

  /**
   * How many months to show, side by side.
   */
  @property({ type: Number })
  months = 1

  /**
   * Accessible name for the control that pages forward.
   */
  @property({ attribute: 'next-label' })
  nextLabel = 'Next month'

  /**
   * Accessible name for the control that pages back.
   *
   * A property because a calendar rendering its own month names from `locale`
   * would otherwise still announce its controls in English. `attribute:`
   * spelled out, since Lit lowercases a camelCase name rather than dash-casing
   * it.
   */
  @property({ attribute: 'previous-label' })
  previousLabel = 'Previous month'

  /**
   * Whether the control refuses changes while still submitting its value.
   *
   * **Enforced by refusing every request in one place**, which is the seam this
   * component already has: `requestValue` is what every path here comes through,
   * and gating it once is what stops the next call site from being written
   * without the check.
   *
   * Not `disabled`, which is the confusion worth naming: a disabled control
   * submits nothing and leaves the tab order, and a read-only one submits its
   * value and stays reachable, which is what a form showing a value somebody
   * else set needs.
   */
  @property({ attribute: 'readonly', reflect: true, type: Boolean })
  readOnly = false

  /**
   * The date the grid's tab stop is on.
   *
   * Absent until the grid is used.
   */
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
   * is a stack overflow.
   */
  private get derivedMonth(): Date {
    const from = asDate(this.selected[0] ?? '') ?? new Date()
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
    for (const candidate of [asDate(this.focused), asDate(this.selected[0] ?? '')]) {
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
   * `barred`, not `disabled`: `HelixFormElement.disabled` is a boolean about the
   * whole control, and a method and a flag cannot share a name. "Disabled" on a
   * control means one thing everywhere else in the library, so the method is the
   * one that moves.
   */
  private barred(date: Date): boolean {
    const iso = fromDate(date)
    if (this.min !== '' && iso < this.min) {
      return true
    }
    if (this.max !== '' && iso > this.max) {
      return true
    }
    if (list(this.disableDays).includes(String(date.getUTCDay()))) {
      return true
    }
    /* Counted from `min` where there is one and from the epoch where there is
       not, which is what the platform does with a `step` and no `min`. Whole
       days, because both ends are midnight UTC and neither carries a time. */
    const step = Math.max(1, Math.floor(this.step) || 1)
    if (step > 1) {
      const base = this.min === '' ? 0 : (asDate(this.min)?.getTime() ?? 0)
      const days = Math.round((date.getTime() - base) / 86_400_000)
      if (days % step !== 0) {
        return true
      }
    }
    return list(this.disableDates).includes(iso)
  }

  /**
   * Moves the view, announcing it first.
   *
   * `helix-navigate` and not `helix-change`: paging chooses nothing, and a
   * consumer driving the view has to hear that it moved without being told the
   * answer did. Refusing the event is how they take the decision, and nothing
   * moves.
   */
  private show(date: Date): void {
    if (this.disabled) {
      return
    }
    const next = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
    if (next === this.month) {
      return
    }
    requestChange({
      apply: (month) => {
        const previous = this.month
        this.monthState = month
        this.requestUpdate('month', previous)
      },
      event: (month) => new HelixNavigateEvent({ value: month }),
      host: this,
      next,
    })
  }

  private moveTo(date: Date): void {
    this.focused = fromDate(date)
    this.show(date)
    this.updateComplete.then(() => {
      this.renderRoot.querySelector<HTMLElement>('[part~="cell"][tabindex="0"]')?.focus()
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
    /* Refused at the source rather than at each cell, so every path in is
       covered by one check. */
    if (this.disabled) {
      return
    }
    if (this.barred(date)) {
      return
    }
    const iso = fromDate(date)
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

    /* Announced before it is written, so a listener calling `preventDefault()`
       refuses a date that has not been chosen yet. `requestChange` is the one
       path every stateful change in the library goes through. */
    this.requestValue(next.join(','))
  }

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (!KEYS.has(event.key) || this.disabled) {
      return
    }
    /* Grid keys, from the grid.
     *
     * The listener is on the host, which holds the previous and next buttons as
     * well, so without this check Enter and Space pressed on one of those read
     * as "choose the focused day" and are then `preventDefault()`ed: the
     * button's own activation is canceled and the month never moves. */
    const path = event.composedPath()
    const grid = this.partNamed('grid')
    if (!grid || !path.includes(grid)) {
      return
    }
    const from = this.anchor
    /* A day along the week, which runs from the right on a right-to-left page:
       the left arrow there is tomorrow, the day it points at. */
    const along = inlineStep(this, event.key)

    if (event.key === 'Enter' || event.key === ' ') {
      this.select(from)
    } else if (along !== 0) {
      this.moveTo(addDays(from, along))
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

  /**
   * Whether the form refuses to submit while nothing is chosen.
   */
  @property({ reflect: true, type: Boolean })
  required = false

  /** Refuses every change while read-only. See `readOnly`. */
  override requestValue(next: string): boolean {
    if (this.readOnly) {
      return false
    }
    return super.requestValue(next)
  }

  /**
   * How far apart the selectable dates are, in days.
   *
   * `<input type="date" step>`'s own unit, counted from `min` where there is
   * one and from 1 January 1970 where there is not, which is the platform's own
   * base. A booking calendar that only takes Mondays is `step="7"` with a `min`
   * on a Monday, which `disable-dates` cannot express: it takes a list, and a
   * year of Mondays is not a list anybody writes.
   *
   * One is every date and needs no rule, which is why anything below one is
   * treated as one rather than as an error: a step of zero would block every
   * date including the one already chosen.
   */
  @property({ type: Number })
  step = 1

  /**
   * Reports "required and empty", or clears it.
   *
   * Written out rather than taken from `MixinField`, which is where the seven
   * form controls get this. That mixin brings a label, a hint and a feedback
   * region with it, and this is a grid rather than a field: it is composed
   * *into* the field that has those, so taking the mixin would give one control
   * two of each. What is shared is five lines, and the anchor is what the
   * browser points its bubble at.
   */
  private reportRequired(): void {
    const anchor = this.partNamed('grid') ?? undefined
    if (this.required && this.value === '') {
      this.internals.setValidity({ valueMissing: true }, 'Choose a date.', anchor)
      return
    }
    /* **A value the calendar cannot read is bad input.** The grid draws only
       what it can parse, so `value="not-a-date"` would otherwise select
       nothing, report `:valid` and hand the string to the form.

       `asDate` rather than the shape alone, which is the half `DateInput`'s own
       regex still misses: `2026-02-30` matches `YYYY-MM-DD` and is not a day,
       and `valueAsDate` reads the parts back after constructing to say so. */
    const held = this.selected
    if (held.length > 0 && held.some((one) => asDate(one) === null)) {
      this.internals.setValidity(
        { badInput: true },
        this.mode === undefined
          ? 'Enter a date as YYYY-MM-DD.'
          : 'Enter dates as YYYY-MM-DD, separated by commas.',
        anchor,
      )
      return
    }
    this.internals.setValidity({})
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    hostAria(this.internals, { label: this.label, role: 'group' })
    /* Announced as off, not merely inert. Removing it from the accessibility
       tree would take the dates with it; this says the control exists and
       cannot be used, which is the same call `HelixFormElement` documents. */
    /* `isDisabled` and not `disabled`, which is the whole reason the getter
       exists: a calendar inside a disabled fieldset is disabled and its own
       property says nothing about it. Writing `disabled` here also overwrote
       the answer `HelixFormElement.willUpdate` had just computed. */
    this.internals.ariaDisabled = this.isDisabled ? 'true' : null
    this.internals.ariaInvalid = this.invalid ? 'true' : null
    this.report()
  }

  /**
   * Reports validity after render, because the bubble needs somewhere to point.
   *
   * `updated` and not `willUpdate`: the anchor is a rendered part, and on the
   * first pass through `willUpdate` there is no grid yet, so the browser would
   * put the message in the corner of the viewport rather than on the calendar.
   */
  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.reportRequired()
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
    /* The value as the state, or the browser keeps the form data as it and
       hands that back on a restore, where the value is read as a string. */
    this.internals.setFormValue(data, this.value)
  }

  /**
   * How many months are shown, clamped once.
   *
   * One getter for both readers. Clamping at the call site while the last month
   * is identified from the raw `months` renders nothing for a zero, a negative
   * or a non-numeric value, and takes the forward control with it, since
   * `index === this.months - 1` is never true for `NaN`.
   */
  private get monthCount(): number {
    return Math.max(1, Math.floor(this.months) || 1)
  }

  /**
   * The three date formatters, built once per locale rather than per render.
   *
   * `Intl.DateTimeFormat` costs about a quarter of a millisecond to construct
   * and these depend on nothing but `locale`, so building them inside the
   * per-month render is three constructions for every month on show, on every
   * update: a two-month calendar rebuilds six each time an arrow key moves the
   * anchor.
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

  /**
   * The caret saying which way the month moves, behind a seam.
   *
   * Slot fallback, so a consumer replaces it by slotting; and a method, so the
   * tier above replaces it by overriding. Those answer different people, which
   * is the same pairing `Select` records on its indicator.
   *
   * **One of each is rendered at most**, whatever `months` is set to: the
   * controls are drawn on the first month and the last rather than once per
   * month, so a duplicate `<slot name="previous-icon">` cannot arise. A second
   * slot of the same name is assigned nothing, which would have left one of two
   * calendars with no mark and no error.
   */
  protected renderPreviousMark(): TemplateResult {
    return html`<slot name="previous-icon">
      <svg part="previous-mark" data-mirror fill="currentColor" viewBox=${caretLeft.viewBox} aria-hidden="true">
        ${unsafeSVG(caretLeft.content)}
      </svg>
    </slot>`
  }

  protected renderNextMark(): TemplateResult {
    return html`<slot name="next-icon">
      <svg part="next-mark" data-mirror fill="currentColor" viewBox=${caretRight.viewBox} aria-hidden="true">
        ${unsafeSVG(caretRight.content)}
      </svg>
    </slot>`
  }

  private renderMonth(month: Date, index: number): TemplateResult {
    const { full, heading, weekday } = this.formats
    const weeks = this.weeksOf(month)
    const anchor = fromDate(this.anchor)
    /* Today, marked with `aria-current="date"` in the accessibility tree and as
       `day-today` on the day, so a consumer can add a mark from CSS. Computed
       once per month rather than per cell. */
    const today = localToday()
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
                ${this.renderPreviousMark()}
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
                ${this.renderNextMark()}
              </button>`
            : nothing
        }
      </div>
      <div
        part="grid"
        role="grid"
        aria-label=${heading.format(month)}
        data-unset=${this.value === '' ? '' : nothing}
      >
        <div part="week" role="row">
          ${weeks[0]?.map(
            (date) => html`<span part="weekday" role="columnheader">${weekday.format(date)}</span>`,
          )}
        </div>
        ${weeks.map(
          (week) => html`<div part="week" role="row">
            ${week.map((date) => {
              const iso = fromDate(date)
              const disabled = this.barred(date)
              const selected = this.isSelected(iso)
              /* A day from a neighboring month is filler, so the grid is a
                 rectangle, and nothing else. It takes no click and shows no
                 selection: at `months="2"` the same date is a trailing cell in
                 one grid and a real cell in the next, so marking both puts one
                 answer on the page twice and runs the range band through two
                 rows. The band stops at the last day the grid owns and picks up
                 in the next, which is where those dates actually are. */
              const outside = !sameMonth(date, month)
              const start = !outside && range !== null && iso === range[0]
              const end = !outside && range !== null && iso === range[1]
              const middle = !outside && range !== null && iso > range[0] && iso < range[1]
              // The cell is the column track and the day is the shape centered
              // in it. A range paints the track, so it runs continuously
              // between days and stops at the ends of a row on its own.
              //
              // Each state is written twice, as an attribute and as a second
              // part name on the box it is drawn on: the attribute for this
              // tier's own sheet and the accessibility tree, the name for a
              // stylesheet outside, which cannot follow `::part()` with one.
              // `day-selected` is the solid mark, so a day between a range's
              // ends is not one: its cell carries the band instead.
              return html`<span
                part="cell${start ? ' cell-range-start' : ''}${middle ? ' cell-range-middle' : ''}${end ? ' cell-range-end' : ''}"
                role="gridcell"
                aria-disabled=${disabled ? 'true' : nothing}
                aria-label=${full.format(date)}
                aria-current=${iso === today ? 'date' : nothing}
                aria-selected=${!outside && selected ? 'true' : nothing}
                data-outside=${outside ? '' : nothing}
                data-range-end=${end ? '' : nothing}
                data-range-middle=${middle ? '' : nothing}
                data-range-start=${start ? '' : nothing}
                data-today=${iso === today ? '' : nothing}
                tabindex=${!outside && iso === anchor ? '0' : '-1'}
                @click=${outside ? nothing : () => this.select(date)}
                ><span
                  part="day${!outside && selected && !middle ? ' day-selected' : ''}${iso === today ? ' day-today' : ''}${outside ? ' day-outside' : ''}${disabled ? ' day-disabled' : ''}"
                  >${date.getUTCDate()}</span
                ></span
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
       consumer wanting more sets `--date-picker-columns`. */
    return html`<div part="months" style="--date-picker-column-count: ${Math.min(count, 2)}">
      ${Array.from({ length: count }, (_, index) =>
        this.renderMonth(addMonths(shown, index), index),
      )}
    </div>`
  }

  /**
   * The value as a `Date`, at midnight UTC, or `null` while there is no date.
   *
   * The platform's own pair on `<input type="date">`, and this control holds the
   * same `YYYY-MM-DD` string, so a consumer moving from one to the other reads
   * the same two properties. UTC because the platform chose UTC: a date that is
   * the same date everywhere must not become a different one by crossing a
   * timezone, and midnight local would do exactly that for anybody west of
   * Greenwich.
   *
   * `null` while the value is half typed, which is most of the keystrokes a
   * reader makes in one of these.
   */
  get valueAsDate(): Date | null {
    return asDate(this.value)
  }

  set valueAsDate(date: Date | null) {
    this.value = fromDate(date)
  }

  /** The value as milliseconds since the epoch, or `NaN` while there is no date. */
  get valueAsNumber(): number {
    return asDate(this.value)?.getTime() ?? Number.NaN
  }

  set valueAsNumber(ms: number) {
    this.value = Number.isNaN(ms) ? '' : fromDate(new Date(ms))
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-date-picker': HelixHeadlessDatePicker
  }
}
