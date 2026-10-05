import {
  valueAsDate as asDate,
  customElement,
  fillTemplate,
  dateAsValue as fromDate,
  HelixFormElement,
  HelixNavigateEvent,
  hostAria,
  inlineStep,
  MixinControllerValue,
  reportValues,
  requestChange,
} from '@fusion.dev/helix-core'
import { caretLeft, caretRight } from '@fusion.dev/helix-icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'
import {
  addDays,
  addMonths,
  barredBy,
  type CalendarView,
  datesIn as list,
  localToday,
  monthOf,
  periodMove,
  sameMonth,
  weekStartOf,
  YEARS_SHOWN,
  yearPageOf,
} from '../calendar.js'

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
 * @summary A month calendar for choosing one or more dates.
 *
 * @description
 * A grid of days that follows the APG date grid pattern:
 *
 * - The grid is one tab stop. Only the focused cell is in the tab sequence.
 * - Arrow keys move by day and by week.
 * - `PageUp` and `PageDown` move by month.
 * - `Home` and `End` move to the start and end of the week.
 *
 * **Dates are `YYYY-MM-DD` strings, and every calculation is in UTC**, because
 * a local-time `Date` shifts across a time zone or daylight-saving boundary.
 *
 * `month` sets which month the grid shows, separately from `value`, so paging
 * selects nothing and you can control the view. When unset, it follows the
 * first selected date, then the current month.
 *
 * `mode` sets how many dates are held. Unset holds one, `range` holds two and
 * marks the dates between them, and `multiple` toggles each date. All three
 * read and write the same comma-separated `value`.
 *
 * `max-view` makes the heading a button that steps back to the months of the
 * year, and with `year` to a page of years, as Zag's date picker does. The
 * arrows, Home, End and the page keys move there, Enter or a press chooses, and
 * Escape goes back to the days.
 *
 * `isDateUnavailable` and `dayContent` are properties for a script: a rule
 * that bars dates, and what each day shows in place of its number.
 *
 * The month heading is a live region, so a screen reader hears the new month
 * when Previous or Next is pressed. Neither moves past `min` or `max`, and the
 * keys stop at them too. A value outside the bounds, on a barred day, or off
 * `step` reports `rangeUnderflow`, `rangeOverflow`, `badInput` or
 * `stepMismatch`, so a form does not submit it.
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
 * @event {Event} change - Fired after the value changes.
 * @event {HelixBeforeChangeEvent} helix-before-change - Fired before the dates change, and cancelable.
 * @event {HelixNavigateEvent} helix-navigate - Fired before the month on show changes, and cancelable.
 * @event {Event} input - Fired after the value changes.
 *
 * @csspart cell - One column of a week row. A range is painted on the cells.
 * @csspart cell-range-end - The cell of a range's last day, beside `cell`.
 * @csspart cell-range-middle - A cell between a range's ends, beside `cell`.
 * @csspart cell-range-start - The cell of a range's first day, beside `cell`.
 * @csspart day - The shape inside a cell. A single chosen date is painted on it.
 * @csspart day-disabled - A day that cannot be chosen, beside `day`.
 * @csspart day-outside - A day from a neighboring month, filling the grid out, beside `day`.
 * @csspart day-selected - The chosen day, or either end of a chosen range, beside `day`.
 * @csspart day-today - Today, beside `day`.
 * @csspart grid - The grid of days.
 * @csspart header - The month name and its controls.
 * @csspart heading - The month and year being shown.
 * @csspart heading-button - The heading as a button that shows the months or the years, where `max-view` is set.
 * @csspart month - One month, its header and its grid.
 * @csspart months - The run of months.
 * @csspart next - The control that moves to the next month.
 * @csspart next-mark - The glyph on the next month control, where none is slotted.
 * @csspart period - One month in the months view, or one year in the years view.
 * @csspart period-current - This month or this year, beside `period`.
 * @csspart period-disabled - A month or a year wholly outside `min` and `max`, beside `period`.
 * @csspart period-row - One row of three months or years.
 * @csspart period-selected - The month or the year on show, beside `period`.
 * @csspart periods - The grid of months or years.
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
   * The validation message for a value that is not a date.
   *
   * **Every sentence a control raises in the browser's bubble is a property**,
   * named for the validity flag it reports, so a form in another language
   * speaks it. Absent is the control's own sentence, in English.
   */
  @property({ attribute: 'bad-input-message' })
  badInputMessage?: string

  /**
   * What each day shows, in place of its number: a function given the date as
   * `YYYY-MM-DD` that returns text, an element or a Lit template.
   *
   * For a price or a dot under the number, as React Aria's `CalendarCell`
   * takes children. The cell is still named by its whole date, so what you
   * draw here is for the eye; say anything a reader must hear in the date's
   * description elsewhere. Return the day's number with it where it should
   * still show. A property only, there being no way to write a function in
   * markup.
   */
  @property({ attribute: false })
  dayContent?: ((date: string) => unknown) | undefined

  /**
   * The month to open on when `month` is not set.
   */
  @property({ attribute: 'default-month' })
  defaultMonth = ''

  /**
   * Dates that cannot be chosen, as `YYYY-MM-DD`, separated by commas or
   * spaces.
   */
  @property({ attribute: 'disable-dates' })
  disableDates = ''

  /**
   * Days of the week that cannot be chosen, `0` for Sunday to `6` for
   * Saturday, separated by commas or spaces.
   */
  @property({ attribute: 'disable-days' })
  disableDays = ''

  /**
   * First column of the week, `0` for Sunday through `6` for Saturday.
   *
   * Absent follows `locale`, where the engine knows the week of that language
   * (Firefox does not), and is Sunday otherwise.
   */
  @property({ attribute: 'first-day-of-week', type: Number })
  firstDayOfWeek?: number

  /**
   * Whether the current selection fails validation.
   */
  @property({ reflect: true, type: Boolean })
  invalid = false

  /**
   * A rule for which dates cannot be chosen: a function given the date as
   * `YYYY-MM-DD` that returns `true` to bar it.
   *
   * For what a list cannot say, such as the second Tuesday of each month or
   * the days a server has fully booked. It bars a date as `disable-dates`
   * does, in the grid and in validation. A property only, as React Aria's
   * `isDateUnavailable` is a prop.
   */
  @property({ attribute: false })
  isDateUnavailable?: ((date: string) => boolean) | undefined

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
   * How far the heading lets a reader step back from the days: `month` to a
   * year's months, or `year` to a page of years and then its months.
   *
   * Absent, the heading is text and the calendar moves a month at a time. Set,
   * the heading is a button that shows the months, and from there the years,
   * so a birth date forty years back is three presses rather than four hundred
   * and eighty. Choosing a year shows its months, and choosing a month shows
   * its days.
   */
  @property({ attribute: 'max-view' })
  maxView?: 'month' | 'year'

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
   * The month shown, as `YYYY-MM`. When it is not set, it follows `value`,
   * then the current month.
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
   * The name of the heading where it shows the months, with `{heading}`
   * filled in as the month on show.
   */
  @property({ attribute: 'month-view-label' })
  monthViewLabel = '{heading}. Choose a month'

  /**
   * Accessible name for the control that pages forward.
   */
  @property({ attribute: 'next-label' })
  nextLabel = 'Next month'

  /**
   * Accessible name for the control that moves forward a year, in the months.
   */
  @property({ attribute: 'next-year-label' })
  nextYearLabel = 'Next year'

  /**
   * Accessible name for the control that moves forward a page, in the years.
   */
  @property({ attribute: 'next-years-label' })
  nextYearsLabel = 'Later years'

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
   * Accessible name for the control that moves back a year, in the months.
   */
  @property({ attribute: 'previous-year-label' })
  previousYearLabel = 'Previous year'

  /**
   * Accessible name for the control that moves back a page, in the years.
   */
  @property({ attribute: 'previous-years-label' })
  previousYearsLabel = 'Earlier years'

  /**
   * The validation message for a date after `max`. `{max}` is replaced with
   * `max`, written as a date in `locale`.
   */
  @property({ attribute: 'range-overflow-message' })
  rangeOverflowMessage?: string

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

  /** The day the week starts on: `firstDayOfWeek`, or the locale's. */
  private get weekStart(): number {
    if (this.firstDayOfWeek !== undefined && Number.isFinite(this.firstDayOfWeek)) {
      return ((Math.floor(this.firstDayOfWeek) % 7) + 7) % 7
    }
    return this.locale === '' ? 0 : weekStartOf(this.locale)
  }

  /**
   * Whether the last date the reader moved to is this picker's own doing.
   *
   * A value that moves from outside, typed into Date Input or set by a script,
   * takes the tab stop to the selected day, as the APG date picker does. A
   * value this grid chose leaves it where the reader pressed, which in a range
   * is the end they just picked.
   */
  private choosing = false

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
    const offset = (month.getUTCDay() - this.weekStart + 7) % 7
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
    return barredBy(date, this) !== null
  }

  /** Pulls a date inside `min` and `max`, so the keys stop at the bounds. */
  private clamp(date: Date): Date {
    const iso = fromDate(date)
    const min = asDate(this.min)
    const max = asDate(this.max)
    if (min && iso < this.min) {
      return min
    }
    if (max && iso > this.max) {
      return max
    }
    return date
  }

  /** Whether the month before the first one shown is wholly before `min`. */
  private get atStart(): boolean {
    return asDate(this.min) !== null && monthOf(addMonths(this.shown, -1)) < this.min.slice(0, 7)
  }

  /** Whether the month after the last one shown is wholly after `max`. */
  private get atEnd(): boolean {
    return (
      asDate(this.max) !== null &&
      monthOf(addMonths(this.shown, this.monthCount)) > this.max.slice(0, 7)
    )
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
    if (this.isDisabled) {
      return
    }
    const next = monthOf(date)
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

  private moveTo(wanted: Date): void {
    const date = this.clamp(wanted)
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
       covered by one check. `isDisabled`, so a disabled fieldset counts. */
    if (this.isDisabled) {
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
    this.choosing = true
    this.requestValue(next.join(','))
  }

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (this.view !== 'day') {
      this.handlePeriodKeydown(event)
      return
    }
    if (!KEYS.has(event.key) || this.isDisabled) {
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
      this.moveTo(addDays(from, -((from.getUTCDay() - this.weekStart + 7) % 7)))
    } else if (event.key === 'End') {
      this.moveTo(addDays(from, 6 - ((from.getUTCDay() - this.weekStart + 7) % 7)))
    } else {
      // Shift pages by a year, which is the same move twelve months over.
      const step = event.key === 'PageUp' ? -1 : 1
      this.moveTo(addMonths(from, event.shiftKey ? step * 12 : step))
    }

    event.preventDefault()
  }

  /**
   * The year the months view shows, and the year the years view is on.
   *
   * Its own state rather than `month`, because looking through the months of
   * another year chooses nothing and moves nothing on show: the month changes,
   * and `helix-navigate` is sent, only once a month is chosen.
   */
  @state()
  private pageYear: number | undefined = undefined

  /**
   * Where the tab stop is among the months, as their index, or among the
   * years, as the year.
   */
  @state()
  private periodFocus: number | undefined = undefined

  /** The year on show in the months and the years. */
  private get periodYear(): number {
    return this.pageYear ?? this.shown.getUTCFullYear()
  }

  /** The index or the year the tab stop sits on in the months or the years. */
  private get periodStop(): number {
    if (this.periodFocus !== undefined) {
      return this.periodFocus
    }
    return this.view === 'year' ? this.periodYear : this.shown.getUTCMonth()
  }

  /** Whether a month, as its first day, lies wholly outside `min` and `max`. */
  private monthOut(first: Date): boolean {
    const month = monthOf(first)
    return (
      (this.min !== '' && month < this.min.slice(0, 7)) ||
      (this.max !== '' && month > this.max.slice(0, 7))
    )
  }

  /** Whether a year lies wholly outside `min` and `max`. */
  private yearOut(year: number): boolean {
    return (
      (this.min !== '' && year < Number(this.min.slice(0, 4))) ||
      (this.max !== '' && year > Number(this.max.slice(0, 4)))
    )
  }

  /** Changes the view, and takes focus to its tab stop once it has drawn. */
  private zoom(view: CalendarView): void {
    this.view = view
    void this.updateComplete.then(() => this.focus())
  }

  /**
   * The heading's press: from the days to the months, and from the months to
   * the years where `max-view` allows.
   */
  private readonly handleHeading = (): void => {
    if (this.isDisabled) {
      return
    }
    if (this.view === 'day') {
      this.pageYear = this.shown.getUTCFullYear()
      this.periodFocus = this.shown.getUTCMonth()
      this.zoom('month')
    } else if (this.view === 'month' && this.maxView === 'year') {
      this.periodFocus = this.periodYear
      this.zoom('year')
    }
  }

  /**
   * Takes a month or a year: a year shows its months, and a month shows its
   * days, moving the calendar there with `helix-navigate` first.
   */
  private choosePeriod(at: number): void {
    if (this.isDisabled) {
      return
    }
    if (this.view === 'year') {
      if (this.yearOut(at)) {
        return
      }
      this.pageYear = at
      this.periodFocus = at === this.shown.getUTCFullYear() ? this.shown.getUTCMonth() : 0
      this.zoom('month')
      return
    }
    const first = new Date(Date.UTC(this.periodYear, at, 1))
    if (this.monthOut(first)) {
      return
    }
    this.show(first)
    /* A refused move leaves the months up, the month on show being where it
       was; the reader is still choosing. */
    if (this.month !== monthOf(first)) {
      return
    }
    this.pageYear = undefined
    this.periodFocus = undefined
    this.focused = ''
    this.zoom('day')
  }

  /** Moves the months a year, or the years a page. */
  private turnPage(direction: number): void {
    const by = this.view === 'year' ? YEARS_SHOWN : 1
    this.pageYear = this.periodYear + direction * by
    if (this.view === 'year') {
      this.periodFocus = this.periodStop + direction * by
    }
  }

  /**
   * The keys in the months and the years: the arrows, Home, End and the page
   * keys move, Enter and Space choose, and Escape goes back to the days.
   *
   * Escape is stopped here, so a Date Input around this calendar keeps its
   * panel open: a reader backing out of the years has not asked to leave.
   */
  private handlePeriodKeydown(event: KeyboardEvent): void {
    if (this.isDisabled) {
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      this.pageYear = undefined
      this.periodFocus = undefined
      this.zoom('day')
      return
    }
    const grid = this.partNamed('periods')
    if (!grid || !event.composedPath().includes(grid)) {
      return
    }
    const stop = this.periodStop
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      this.choosePeriod(stop)
      return
    }
    const index = this.view === 'year' ? stop - yearPageOf(stop) : stop
    const delta = periodMove(event.key, index, inlineStep(this, event.key))
    if (delta === null) {
      return
    }
    event.preventDefault()
    if (this.view === 'year') {
      const year = stop + delta
      this.periodFocus = year
      this.pageYear = year
    } else {
      const months = this.periodYear * 12 + stop + delta
      this.pageYear = Math.floor(months / 12)
      this.periodFocus = ((months % 12) + 12) % 12
    }
    void this.updateComplete.then(() => this.focus())
  }

  /**
   * Moves focus to the grid's tab stop: the selected day, or the day last
   * moved to, or the first of the month.
   *
   * Date Input calls this when its trigger opens the calendar, which is where
   * the APG date picker dialog puts focus. The host is not focusable, so a
   * plain `focus()` on it did nothing and focus stayed on the trigger.
   */
  override focus(options?: FocusOptions): void {
    this.renderRoot
      ?.querySelector<HTMLElement>('[part~="cell"][tabindex="0"], [part~="period"][tabindex="0"]')
      ?.focus(options)
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
   * The validation message for a date before `min`. `{min}` is replaced with
   * `min`, written as a date in `locale`.
   */
  @property({ attribute: 'range-underflow-message' })
  rangeUnderflowMessage?: string

  /** Refuses every change while read-only. See `readOnly`. */
  override requestValue(next: string): boolean {
    if (this.readOnly) {
      return false
    }
    return super.requestValue(next)
  }

  /**
   * Blocks changes to the dates. The value is still submitted with the form.
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
   * Stops the form from submitting while no date is chosen.
   */
  @property({ reflect: true, type: Boolean })
  required = false

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
   * The validation message for a date that `step` skips.
   */
  @property({ attribute: 'step-mismatch-message' })
  stepMismatchMessage?: string

  /**
   * The validation message for a date that `disable-dates` or `disable-days`
   * bars.
   */
  @property({ attribute: 'unavailable-message' })
  unavailableMessage?: string

  /**
   * The validation message for a required date picker with no date chosen.
   */
  @property({ attribute: 'value-missing-message' })
  valueMissingMessage?: string

  /**
   * What the calendar shows: the days of a month, the months of a year, or a
   * page of years. `day` unless `max-view` lets a reader step back.
   *
   * Not reflected, being state. Set it to open on the months or the years.
   */
  @property()
  view: CalendarView = 'day'

  /**
   * The name of the heading where it shows a page of years, with `{heading}`
   * filled in as the year on show.
   */
  @property({ attribute: 'year-view-label' })
  yearViewLabel = '{heading}. Choose a year'

  /** A date written for a message, in `locale`. */
  private spoken(iso: string): string {
    const date = asDate(iso)
    return date ? this.formats.long.format(date) : iso
  }

  /**
   * What is wrong with a date the calendar can read, as a validity flag and a
   * message, or nothing.
   *
   * Measured before this: a value before `min`, after `max`, or on a barred
   * day reported valid and was submitted, where a native date input reports
   * the bound it is past.
   */
  private fault(iso: string): [keyof ValidityStateFlags, string] | undefined {
    if (this.min !== '' && iso < this.min) {
      return [
        'rangeUnderflow',
        fillTemplate(this.rangeUnderflowMessage || 'Choose a date on or after {min}.', {
          min: this.spoken(this.min),
        }),
      ]
    }
    if (this.max !== '' && iso > this.max) {
      return [
        'rangeOverflow',
        fillTemplate(this.rangeOverflowMessage || 'Choose a date on or before {max}.', {
          max: this.spoken(this.max),
        }),
      ]
    }
    const date = asDate(iso)
    const why = date ? barredBy(date, this) : null
    if (why === null) {
      return undefined
    }
    return why === 'listed'
      ? ['badInput', this.unavailableMessage || 'Choose a date that is available.']
      : ['stepMismatch', this.stepMismatchMessage || 'Choose one of the dates the calendar offers.']
  }

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
      this.internals.setValidity(
        { valueMissing: true },
        this.valueMissingMessage || 'Choose a date.',
        anchor,
      )
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
        this.badInputMessage ||
          (this.mode === undefined
            ? 'Enter a date as YYYY-MM-DD.'
            : 'Enter dates as YYYY-MM-DD, separated by commas.'),
        anchor,
      )
      return
    }
    for (const one of held) {
      const fault = this.fault(one)
      if (fault) {
        this.internals.setValidity({ [fault[0]]: true }, fault[1], anchor)
        return
      }
    }
    this.internals.setValidity({})
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    /* A value moved from outside takes the tab stop to the selected day. See
       `choosing`. Measured before this: after a date was typed into Date
       Input, Tab into the grid landed on the day picked before. */
    if (changed.has('value') && !this.choosing) {
      this.focused = ''
    }
    this.choosing = false
    /* A page's `<label for>` names the group where `label` is still the
       default, which is how a native control takes one. The platform gives
       the host its labels, and the host is the group a reader is on. */
    const outside = this.label === 'Date Picker' ? [...(this.internals.labels ?? [])] : []
    hostAria(this.internals, {
      label: this.label,
      labelledBy: outside as HTMLElement[],
      role: 'group',
    })
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
   * form value, which is how `Date Input` holds one. `reportValues` keeps the
   * guard, for every control that sends several answers: a plain string is
   * skipped by the form when its control has no name, but a `FormData` carries
   * its own names and its entries are appended whatever the element is called,
   * so an unnamed calendar would submit empty-named dates.
   */
  private report(): void {
    if (this.isDisabled) {
      this.internals.setFormValue(null)
      return
    }
    reportValues(this.internals, this.name, this.selected)
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
        long: Intl.DateTimeFormat
        monthName: Intl.DateTimeFormat
        weekday: Intl.DateTimeFormat
        year: Intl.DateTimeFormat
      }
    | undefined

  private get formats(): {
    full: Intl.DateTimeFormat
    heading: Intl.DateTimeFormat
    long: Intl.DateTimeFormat
    monthName: Intl.DateTimeFormat
    weekday: Intl.DateTimeFormat
    year: Intl.DateTimeFormat
  } {
    if (this.cachedFormats?.locale === this.locale) {
      return this.cachedFormats
    }
    const locale = this.locale || undefined
    const built = {
      full: new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeZone: 'UTC' }),
      heading: new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC', year: 'numeric' }),
      locale: this.locale,
      long: new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }),
      monthName: new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' }),
      weekday: new Intl.DateTimeFormat(locale, { timeZone: 'UTC', weekday: 'short' }),
      year: new Intl.DateTimeFormat(locale, { timeZone: 'UTC', year: 'numeric' }),
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
                ?disabled=${this.isDisabled || this.atStart}
                @click=${() => this.show(addMonths(this.shown, -1))}
              >
                ${this.renderPreviousMark()}
              </button>`
            : nothing
        }
        ${
          /* A live region, so the month a reader pages to is said. Measured
             before this: Next month changed the grid in silence, where the APG
             date picker announces the new month. */
          ''
        }
        <span part="heading" aria-live="polite"
          >${this.renderHeadingText(heading.format(month), this.monthViewLabel)}</span
        >
        ${
          last
            ? html`<button
                part="next"
                type="button"
                aria-label=${this.nextLabel}
                ?disabled=${this.isDisabled || this.atEnd}
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
        aria-readonly=${this.readOnly ? 'true' : nothing}
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
              /* A filler day is said to be unavailable, which it is: it takes
                 no click. Exposed as an ordinary cell, a screen reader in
                 browse mode offered it and nothing happened. */
              return html`<span
                part="cell${start ? ' cell-range-start' : ''}${middle ? ' cell-range-middle' : ''}${end ? ' cell-range-end' : ''}"
                role="gridcell"
                aria-disabled=${disabled || outside ? 'true' : nothing}
                aria-label=${full.format(date)}
                aria-current=${iso === today ? 'date' : nothing}
                aria-selected=${!outside && selected ? 'true' : nothing}
                data-outside=${outside ? '' : nothing}
                data-range-end=${end ? '' : nothing}
                data-range-middle=${middle ? '' : nothing}
                data-range-start=${start ? '' : nothing}
                data-today=${iso === today ? '' : nothing}
                tabindex=${!outside && iso === anchor && !this.isDisabled ? '0' : '-1'}
                @click=${outside ? nothing : () => this.select(date)}
                ><span
                  part="day${!outside && selected && !middle ? ' day-selected' : ''}${iso === today ? ' day-today' : ''}${outside ? ' day-outside' : ''}${disabled ? ' day-disabled' : ''}"
                  >${this.renderDay(date, outside)}</span
                ></span
              >`
            })}
          </div>`,
        )}
      </div>
    </div>`
  }

  /**
   * What a day shows: its number, or what `day-content` returns for it.
   *
   * A seam, so a tier above can draw a day its own way, and filler days from a
   * neighboring month keep their number, being only there to square the grid.
   */
  protected renderDay(date: Date, outside: boolean): unknown {
    return this.dayContent && !outside ? this.dayContent(fromDate(date)) : date.getUTCDate()
  }

  /**
   * The heading's words, as a button that steps back to the months or the
   * years where `max-view` allows, and as text everywhere else.
   */
  private renderHeadingText(text: string, label: string): TemplateResult | string {
    const steps =
      this.maxView !== undefined &&
      (this.view === 'day' || (this.view === 'month' && this.maxView === 'year'))
    if (!steps) {
      return text
    }
    return html`<button
      part="heading-button"
      type="button"
      aria-label=${fillTemplate(label, { heading: text })}
      ?disabled=${this.isDisabled}
      @click=${this.handleHeading}
    >${text}</button>`
  }

  /**
   * The months of a year, or a page of years, in rows of three, with the
   * controls that turn the page.
   *
   * A grid of its own, `periods`, so a stylesheet tells it from the days, and
   * one tab stop in it, the month or year the keys are on.
   */
  private renderPeriods(): TemplateResult {
    const { monthName, year: yearName } = this.formats
    const years = this.view === 'year'
    const page = years ? yearPageOf(this.periodYear) : this.periodYear
    const heading = years
      ? `${yearName.format(new Date(Date.UTC(page, 0, 1)))} – ${yearName.format(
          new Date(Date.UTC(page + YEARS_SHOWN - 1, 0, 1)),
        )}`
      : yearName.format(new Date(Date.UTC(page, 0, 1)))
    const today = localToday()
    const stop = this.periodStop
    const cells = Array.from({ length: 12 }, (_, index) => {
      const at = years ? page + index : index
      const first = new Date(Date.UTC(years ? at : page, years ? 0 : index, 1))
      const out = years ? this.yearOut(at) : this.monthOut(first)
      const current = years
        ? String(at) === today.slice(0, 4)
        : monthOf(first) === today.slice(0, 7)
      const chosen = years
        ? at === this.shown.getUTCFullYear()
        : monthOf(first) === monthOf(this.shown)
      const words = years ? yearName.format(first) : monthName.format(first)
      return html`<span
        part="period${chosen ? ' period-selected' : ''}${current ? ' period-current' : ''}${out ? ' period-disabled' : ''}"
        role="gridcell"
        aria-current=${current ? 'date' : nothing}
        aria-disabled=${out ? 'true' : nothing}
        aria-label=${years ? words : `${words} ${yearName.format(first)}`}
        aria-selected=${chosen ? 'true' : nothing}
        tabindex=${at === stop && !this.isDisabled ? '0' : '-1'}
        @click=${() => this.choosePeriod(at)}
        >${words}</span
      >`
    })
    const rows = [0, 3, 6, 9].map(
      (from) => html`<div part="period-row" role="row">${cells.slice(from, from + 3)}</div>`,
    )
    return html`<div part="month">
      <div part="header">
        <button
          part="previous"
          type="button"
          aria-label=${years ? this.previousYearsLabel : this.previousYearLabel}
          ?disabled=${this.isDisabled || this.yearOut(page - 1)}
          @click=${() => this.turnPage(-1)}
        >
          ${this.renderPreviousMark()}
        </button>
        <span part="heading" aria-live="polite"
          >${this.renderHeadingText(heading, this.yearViewLabel)}</span
        >
        <button
          part="next"
          type="button"
          aria-label=${years ? this.nextYearsLabel : this.nextYearLabel}
          ?disabled=${this.isDisabled || this.yearOut(years ? page + YEARS_SHOWN : page + 1)}
          @click=${() => this.turnPage(1)}
        >
          ${this.renderNextMark()}
        </button>
      </div>
      <div part="periods" role="grid" aria-label=${heading}>${rows}</div>
    </div>`
  }

  protected override render(): TemplateResult {
    if (this.view !== 'day') {
      return html`<div part="months" style="--date-picker-column-count: 1">
        ${this.renderPeriods()}
      </div>`
    }
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
