import {
  AriaForwardController,
  valueAsDate as asDate,
  customElement,
  fillTemplate,
  dateAsValue as fromDate,
  type HelixBeforeChangeEvent,
  HelixFormElement,
  isDateValue,
  MixinControllerOpen,
  MixinControllerValue,
  MixinField,
  MixinPickerEditing,
  MixinPickerField,
  MixinTokens,
} from '@fusion.dev/helix-core'
import { calendarBlank } from '@fusion.dev/helix-icons'
import { nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'
import { html } from 'lit/static-html.js'
import '../../date-picker/index.js'
import '../../tag/index.js'

/**
 * The dates in a value, which may hold more than one.
 *
 * A range is two and a multiple is any number, comma separated, which is what
 * the calendar announces and what a form field can carry as one string. Empty
 * entries are dropped so a trailing comma while typing is not a date.
 */
const dates = (value: string): string[] =>
  /* The en dash and the spaced hyphen both mean "to", because a range is shown
     that way and what is shown is what gets typed back. An ISO date holds
     hyphens of its own, so only a spaced one separates: `2026-08-04-2026-08-11`
     is not a thing anybody writes, and treating a bare hyphen as a separator
     would take `2026-08-04` apart into three numbers. */
  value
    .replace(/\s+[–-]\s+/g, ',')
    .split(',')
    .map((one) => one.trim())
    .filter(Boolean)

/**
 * @summary A date, typed or picked from a calendar.
 *
 * @description
 * **The calendar is `DatePicker`, not a second one written here.** It already
 * knows about months, ranges, disabled days, the first day of the week and
 * every keyboard rule a grid owes a reader. This element is the field, the
 * overlay, and the translation between them.
 *
 * **Typed as well as picked, and the typing is why it is not
 * `<input type="date">`.** The native control gives a free picker and a free
 * locale and takes almost all styling with it. What is kept from it is the part
 * worth keeping: a real text field.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @aliases DatePicker, DateField, InputDate
 * @documentation https://fusion.dev/helix/components/date-input
 *
 * @slot feedback - What is wrong with it.
 * @slot hint - Help under the field.
 * @slot trigger - The mark on the field saying a calendar opens.
 *
 * @event {Event} change - Announced once the value has moved.
 * @event {HelixBeforeChangeEvent} helix-before-change - Fired before the date changes. Cancelable: refusing it takes the decision and nothing moves.
 * @event {HelixBeforeCloseEvent} helix-before-close - Fired before it closes. Cancelable: refusing it takes the decision and nothing moves.
 * @event {HelixBeforeOpenEvent} helix-before-open - Fired before the calendar opens. Cancelable: refusing it takes the decision and nothing moves.
 * @event {Event} input - Announced once the value has moved.
 * @event {Event} toggle - Says the state moved, carrying `newState` and `oldState`.
 *
 * @csspart control - The text input.
 * @csspart date - One held date, as a tag, in `multiple`.
 * @csspart date-dismiss - The remove button, when `dismissible`.
 * @csspart date-dismiss-mark - The glyph on the dismiss control, where none is slotted.
 * @csspart date-start - The category before the label.
 * @csspart feedback - What is wrong with it.
 * @csspart field - The box holding the text and the trigger.
 * @csspart hint - Help under the field, while nothing is wrong.
 * @csspart label - The question, over the field.
 * @csspart picker - The date picker inside it.
 * @csspart picker-cell - One column of a row, which is what a range paints.
 * @csspart picker-cell-range-end - The cell of a range's last day, beside `picker-cell`.
 * @csspart picker-cell-range-middle - A cell between a range's ends, beside `picker-cell`.
 * @csspart picker-cell-range-start - The cell of a range's first day, beside `picker-cell`.
 * @csspart picker-day - The shape inside a cell, which is what a single date paints.
 * @csspart picker-day-disabled - A day that cannot be chosen, beside `picker-day`.
 * @csspart picker-day-outside - A day from a neighboring month, beside `picker-day`.
 * @csspart picker-day-selected - The chosen day, or either end of a chosen range, beside `picker-day`.
 * @csspart picker-day-today - Today, beside `picker-day`.
 * @csspart picker-grid - The grid of days.
 * @csspart picker-header - The month name and its controls.
 * @csspart picker-heading - The month and year being shown.
 * @csspart picker-month - One month, its header and its grid.
 * @csspart picker-months - The run of months.
 * @csspart picker-next - The control that moves to the next month.
 * @csspart picker-next-mark - The glyph on the next month control.
 * @csspart picker-previous - The control that moves to the previous month.
 * @csspart picker-previous-mark - The glyph on the previous month control.
 * @csspart picker-week - One row of days.
 * @csspart picker-weekday - A column header naming a day of the week.
 * @csspart rest - How many dates are held beyond the ones shown. A `<button>` with `expandable`, a `<span>` without it.
 * @csspart surface - The floating panel.
 * @csspart tags - The row the dates sit in.
 * @csspart trigger - The control that opens the calendar.
 * @csspart trigger-icon - The mark on the button that opens the calendar.
 *
 * @cssstate invalid - While there is feedback to show: the platform's verdict, or the consumer's `feedback`.
 * @cssstate open - While the calendar is open.
 */
@customElement('helix-headless-date-input')
export class HelixHeadlessDateInput extends MixinPickerEditing(
  MixinPickerField(
    MixinControllerOpen(MixinTokens(MixinControllerValue(MixinField(HelixFormElement)))),
  ),
) {
  /* A consumer's `aria-describedby` names ids in their own tree and the control
     is in this shadow root, so the reference has to be carried down as an
     element rather than copied as an id. See `AriaForwardController`: measured
     in Chrome's own tree, the host held the description and the control the
     reader is actually on was exposed without it. */
  protected readonly aria = new AriaForwardController(this, {
    target: () => this.partNamed('control'),
  })

  /**
   * What the browser may autofill here, as one of the platform's own tokens.
   *
   * Empty leaves the attribute off, which is the browser's default and is what
   * lets autofill work at all: hardcoding `off` here means a birthday or a
   * postal code can never be filled in for a reader.
   */
  @property()
  autocomplete = ''

  /**
   * How a date is written in the field: `short` through `full`, or ISO.
   *
   * **The field renders when it is idle and holds the value when it is being
   * edited.** A written date is a rendering, and a document being edited must
   * not be a rendering of something else: `Intl.DateTimeFormat` formats and does
   * not parse, so `4 August 2026` cannot be typed back, and writing a parser per
   * locale is how a field ends up rejecting what it just displayed.
   *
   * The way out is not to choose between the two but to separate them in time.
   * Idle, the field shows `4 August 2026`, which is what a date is for reading.
   * Focused, it shows `2026-08-04`, which is what a date is for typing, and it
   * goes back on the way out. Nothing parses a rendering, and nothing is
   * read-only, which is what an earlier version of this settled for.
   *
   * A range is the exception that needs no swap: the dash between its two dates
   * is a separator this element understands, so that much reads back either way.
   *
   * `iso` turns the rendering off, for a field whose reader is entering data
   * rather than reading it, or where the ISO form is itself the point.
   *
   * The value is always `YYYY-MM-DD` regardless, because that is what a form
   * submits and what `min` and `max` compare against.
   */
  @property({ attribute: 'date-style' })
  dateStyle: 'full' | 'iso' | 'long' | 'medium' | 'short' = 'long'

  /**
   * Dates that cannot be chosen, as a comma-separated `YYYY-MM-DD` list.
   */
  @property({ attribute: 'disable-dates' })
  disableDates = ''

  /**
   * Days of the week that cannot be chosen, `0` for Sunday through `6`.
   */
  @property({ attribute: 'disable-days' })
  disableDays = ''

  /**
   * First column of the week in the calendar, `0` for Sunday through `6`.
   */
  @property({ attribute: 'first-day-of-week', type: Number })
  firstDayOfWeek = 0

  /**
   * Language tag the calendar names its months and days in.
   */
  @property()
  locale = ''

  /**
   * Latest date that can be chosen, as `YYYY-MM-DD`.
   */
  @property()
  max = ''

  /**
   * Earliest date that can be chosen, as `YYYY-MM-DD`.
   */
  @property()
  min = ''

  /**
   * How many dates can be held at once.
   *
   * Absent is one. `range` holds a start and an end, `multiple` holds any
   * number, and both are carried as one comma-separated value: a form field
   * submits a string, and two fields for one question is a different control.
   */
  @property({ reflect: true })
  mode?: 'range' | 'multiple'

  /**
   * How many months the calendar shows, side by side.
   *
   * Worth more than one mainly for a range, where picking a start in March and
   * an end in April otherwise means paging between them and losing sight of the
   * first. The panel is sized by its content, so this widens it, and where the
   * window has no room for that width it shows one month until there is.
   */
  @property({ type: Number })
  months = 1

  /**
   * How many months the panel is showing, where that is fewer than `months`.
   *
   * **One month rather than a squeezed two**, and decided here rather than in a
   * stylesheet because what changes is markup. Two months measure 600 pixels
   * across, measured 15 Sep 2026, and in a 390 window that ran past both
   * edges. A rule could only clip them, which hides the next-month control with
   * the month it sits on, or stack them, which makes a panel taller than most
   * of a phone. The count is behavior, as a carousel's per-view is.
   */
  @state()
  private fitted: number | undefined = undefined

  /**
   * How wide the panel was the last time it held every month, in pixels.
   *
   * Measured rather than estimated, because a month's width is its locale's:
   * the weekday names set it. Remembered, so a panel showing one month knows
   * what it would take to show them all, and the answer cannot flip back and
   * forth between two measurements of different things.
   */
  private wide: number | undefined = undefined

  /**
   * Shows one month where the window has no room for them all, and all of them
   * again once it does.
   *
   * Called after every placement, with the room the floating pass measured,
   * which is the window less a margin on each side. The panel hangs in the top
   * layer, so the window is its box, the argument Dialog makes for reading the
   * viewport. The surface's own width is read, since it is sized by its content
   * and never capped.
   */
  protected override placed(room: number | undefined): void {
    const all = Math.max(1, Math.floor(this.months) || 1)
    const surface = this.partNamed('surface')
    if (room === undefined || all === 1 || !surface) {
      return
    }
    if (this.fitted === undefined) {
      this.wide = surface.offsetWidth
    }
    const next = this.wide === undefined || this.wide <= room ? undefined : 1
    if (next !== this.fitted) {
      this.fitted = next
    }
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    /* A different count or a different language is a different width, so what
       was measured no longer answers and every month is shown to be measured
       again at the next placement. */
    if (changed.has('months') || changed.has('locale')) {
      this.fitted = undefined
      this.wide = undefined
    }
  }

  /**
   * What the field says before a date is in it.
   */
  @property()
  placeholder = 'YYYY-MM-DD'

  /**
   * What a reader is told when a range holds more than two dates.
   *
   * **Every sentence a control raises in the browser's bubble is a property**,
   * so a form in another language speaks it. Absent is the control's own
   * sentence, in English.
   */
  @property({ attribute: 'range-length-message' })
  rangeLengthMessage?: string

  /**
   * What a reader is told when a date is after `max`, with `{max}` filled in
   * as the field writes it.
   */
  @property({ attribute: 'range-overflow-message' })
  rangeOverflowMessage?: string

  /**
   * What a reader is told when a date is before `min`, with `{min}` filled
   * in as the field writes it.
   */
  @property({ attribute: 'range-underflow-message' })
  rangeUnderflowMessage?: string

  /**
   * What the control removing one date is called, with `{name}` filled in.
   *
   * **The name goes in**, so a row of them is heard as which one each
   * removes rather than as "Remove" said once per date.
   */
  @property({ attribute: 'remove-label' })
  removeLabel = 'Remove {name}'

  /**
   * How far apart the selectable dates are, in days.
   *
   * `<input type="date" step>`'s own unit, handed to the calendar this renders
   * so the field and the grid agree about which dates exist. Counted from `min`
   * where there is one and from 1 January 1970 where there is not, which is the
   * platform's base.
   */
  @property({ type: Number })
  step = 1

  /**
   * What the calendar should show, which is only ever a whole date.
   *
   * Half-typed input reaches here on every keystroke, and `2026-08-1` is not a
   * date: handing it to the calendar would move the month under a reader
   * mid-word. So the grid follows the field only once the field says something
   * complete.
   */
  private get picked(): string {
    const held = dates(this.value)
    return held.length > 0 && held.every(isDateValue) ? held.join(',') : ''
  }

  /** One date, written the way `dateStyle` asks for. */
  private written(date: string): string {
    if (this.dateStyle === 'iso' || !isDateValue(date)) {
      return date
    }
    /* UTC, because the dates are UTC throughout: a date parsed in a zone behind
       Greenwich renders as the day before, which is the classic off-by-one that
       makes a calendar disagree with the field beside it. */
    const at = new Date(`${date}T00:00:00Z`)
    return Number.isNaN(at.getTime())
      ? date
      : new Intl.DateTimeFormat(this.locale || undefined, {
          dateStyle: this.dateStyle,
          timeZone: 'UTC',
        }).format(at)
  }

  /*
   * What the field shows, which is the value in every mode but one.
   *
   * A range reads `2026-08-04 – 2026-08-11`, because two dates separated by a
   * comma is a list and a range is a span: the comma says "and these", the dash
   * says "through". It is the one place this component shows something other
   * than the value it holds, and it is safe because the dash reads back: `dates`
   * takes a spaced dash as a separator, so what is shown is what can be typed.
   *
   * `multiple` shows nothing here at all. Its dates are tags beside the input
   * and the input is a draft.
   */
  protected override get display(): string {
    if (this.mode === 'multiple') {
      return this.draft
    }
    const held = dates(this.value)
    /* Being edited, the field is the value. The rendering is what it shows when
       nobody is in it, so there is never a moment where what is on screen is
       something this element could not read back. */
    if (this.editing || this.dateStyle === 'iso') {
      return this.mode === 'range' && held.length === 2 ? held.join(' – ') : this.value
    }
    const written = held.map((one) => this.written(one))
    return this.mode === 'range' ? written.join(' – ') : written.join(', ')
  }

  /**
   * What is being typed but not yet held, for `multiple` only.
   *
   * The other modes type into the value directly, because one date and a range
   * are both a whole answer at the moment they are complete. A multiple is not:
   * it is a set being added to, so the field needs somewhere to hold a date
   * before it joins the set and somewhere to leave a half-typed one that is not
   * a date yet.
   */
  @state()
  private draft = ''

  /** Relayed under this element's name, so a consumer hears one control. */
  private readonly handleInput = (event: Event): void => {
    event.stopPropagation()
    // Typing is editing, whatever the focus did. The field has to hold the value
    // while it is being changed, or a keystroke lands in a rendering.
    this.editing = true
    const typed = (event.target as HTMLInputElement).value
    if (this.mode === 'multiple') {
      this.draft = typed
      return
    }
    /* Stored as commas once every date in it is whole, and kept exactly as typed
       until then. A form should submit `2026-08-04,2026-08-11` however the dash
       was written, and the dash is a reading of that rather than a second value
       shape to support. Half-typed text stays verbatim, for the reason the class
       gives about a document being edited: normalizing `2026-08-0` would take
       the caret away mid-date. */
    const held = dates(typed)
    const whole = held.length > 0 && held.every(isDateValue)
    this.requestValue(whole ? held.join(',') : typed)
    this.restore()
  }

  /** Adds what was typed to the set, or takes the last one back out. */
  private readonly handleDraftKey = (event: KeyboardEvent): void => {
    if (this.mode !== 'multiple') {
      return
    }
    const held = dates(this.value)
    if (event.key === 'Enter' && isDateValue(this.draft)) {
      event.preventDefault()
      if (!held.includes(this.draft)) {
        this.requestValue([...held, this.draft].join(','))
      }
      this.draft = ''
    } else if (event.key === 'Backspace' && this.draft === '' && held.length > 0) {
      /* The convention every tag field has: an empty field and a backspace takes
         the last one back, so a mistake costs one key rather than a hunt for a
         small control. */
      this.requestValue(held.slice(0, -1).join(','))
    }
  }

  /** The dates that get a tag, which is all of them until the cap says not. */
  private get shownDates(): string[] {
    const held = dates(this.value)
    /* `shownLimit` rather than `maxTags`, which is the whole of what
       expanding does: the mixin returns zero while expanded, so the cap
       lifts and every date gets a tag. */
    return this.shownLimit > 0 ? held.slice(0, this.shownLimit) : held
  }

  /** How many are held beyond the ones shown. */
  private get restCount(): number {
    return Math.max(0, dates(this.value).length - this.shownDates.length)
  }

  /** Takes one date back out of the set. */
  private readonly removeDate = (date: string): void => {
    this.requestValue(
      dates(this.value)
        .filter((one) => one !== date)
        .join(','),
    )
  }

  private readonly handleCalendarChange = (event: Event): void => {
    event.stopPropagation()
    const { value } = (event as HelixBeforeChangeEvent).detail
    this.requestValue(value)
    this.restore()
    /* A single date has nothing more to say, so the panel gets out of the way.
       A range or a multiple has: the reader is still choosing, and shutting the
       calendar under them after the first date is taking the control away
       mid-answer. */
    if (this.mode === undefined) {
      this.requestOpen(false)
      this.updateComplete.then(() => this.returnFocus())
    }
  }

  /** Each date, where `mode` holds several, sent one entry each. */
  protected override get answers(): readonly string[] | undefined {
    return this.mode === undefined ? undefined : dates(this.value)
  }

  /** What is wrong with the dates, which the text input cannot say. */
  protected override validate(): string {
    /* Bounds are checked here rather than left to the input, which is `text`
       and has no idea what a date is: `min` and `max` on a text input do
       nothing, and `type="date"` is what was given up to own the calendar.
       String comparison is enough because ISO dates sort lexically, which is
       the whole reason the value is that shape. */
    /* Every date in the value, not the value itself: a range is two of them and
       a multiple is any number, so a string comparison against `min` would be
       comparing a bound to a list. */
    const held = dates(this.value)
    if (held.length > 0 && !held.every(isDateValue)) {
      return (
        this.badInputMessage ??
        (this.mode === undefined
          ? 'Enter a date as YYYY-MM-DD.'
          : 'Enter dates as YYYY-MM-DD, separated by commas.')
      )
    }
    /* The bound as the field writes a date, the way Time Input writes its
       own: a reader who sees "4 Aug 2026" in the field is told about the same
       day in the same words. */
    if (this.min !== '' && held.some((one) => one < this.min)) {
      return fillTemplate(this.rangeUnderflowMessage ?? 'Choose a date on or after {min}.', {
        min: this.written(this.min),
      })
    }
    if (this.max !== '' && held.some((one) => one > this.max)) {
      return fillTemplate(this.rangeOverflowMessage ?? 'Choose a date on or before {max}.', {
        max: this.written(this.max),
      })
    }
    if (this.mode === 'range' && held.length > 2) {
      return this.rangeLengthMessage ?? 'A range is two dates.'
    }
    return ''
  }

  /**
   * Accessible name for the control that opens the calendar.
   */
  @property({ attribute: 'trigger-label' })
  triggerLabel = 'Choose a date'

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    /* After the mixin has shown the panel, and only on the update that opened
       it, or every keystroke while it is up would steal focus back into the
       grid. */
    if (this.open && changed.has('open')) {
      this.partNamed('picker')?.focus()
    }
  }

  /**
   * The calendar the field opens, behind a seam the styled tier can move.
   *
   * A method rather than a fragment inline, so a tier above can replace, wrap
   * or omit it without reimplementing the whole template. The tag is
   * interpolated rather than written, so `tier` resolves it: this renders the
   * headless element, and a styled subclass that sets `tier` renders the styled
   * one from the same template.
   */
  protected renderPicker(): TemplateResult {
    return html`<${this.tag('date-picker')}
      part="picker"
      exportparts="cell: picker-cell, cell-range-end: picker-cell-range-end,
        cell-range-middle: picker-cell-range-middle, cell-range-start: picker-cell-range-start,
        day: picker-day, day-disabled: picker-day-disabled, day-outside: picker-day-outside,
        day-selected: picker-day-selected, day-today: picker-day-today, grid: picker-grid,
        header: picker-header, heading: picker-heading, month: picker-month, months: picker-months,
        next: picker-next,
        next-mark: picker-next-mark, previous: picker-previous, previous-mark: picker-previous-mark,
        week: picker-week, weekday: picker-weekday"
      ?invalid=${this.resolvedFeedback !== ''}
      mode=${this.mode ?? nothing}
      months=${this.fitted ?? this.months}
      .value=${this.picked}
      disable-dates=${this.disableDates || nothing}
      disable-days=${this.disableDays || nothing}
      first-day-of-week=${this.firstDayOfWeek}
      locale=${this.locale || nothing}
      max=${this.max || nothing}
      min=${this.min || nothing}
      step=${this.step}
      @helix-before-change=${this.handleCalendarChange}
      @change=${this.stopInner}
      @input=${this.stopInner}
    ></${this.tag('date-picker')}>`
  }

  /* Time Input's tag is this one under its own part name, with its own label
     on the remove control, which is why neither is the mixin's. */
  /**
   * One chosen date, as a tag, behind a seam the styled tier can move.
   *
   * A method rather than a fragment inline, so a tier above can replace, wrap
   * or omit it without reimplementing the whole template. The tag is
   * interpolated rather than written, so `tier` resolves it: this renders the
   * headless element, and a styled subclass that sets `tier` renders the styled
   * one from the same template.
   */
  protected renderTag(date: string): TemplateResult {
    return html`<${this.tag('tag')}
                  part="date"
      exportparts="dismiss: date-dismiss, dismiss-mark: date-dismiss-mark, start: date-start"
                  dismissible
                  dismiss-label=${fillTemplate(this.removeLabel, { name: this.written(date) })}
                  ?disabled=${this.isDisabled}
                  @helix-dismiss=${(event: Event) => {
                    event.stopPropagation()
                    this.removeDate(date)
                  }}
                  >${this.written(date)}</${this.tag('tag')}
                >`
  }

  /* Time Input has this seam with its own icon, and it is not the mixin's
     because a part a mixin renders is credited to every host that applies it,
     Color Input included, whose trigger is a swatch. */
  /**
   * The mark on the button that opens the calendar, behind a seam.
   *
   * Slot fallback, so a consumer replaces it by slotting; and a method, so the
   * tier above replaces it by overriding.
   *
   * **A named import rather than `<helix-headless-icon>`**, which loses on
   * three counts. `Icon` indexes the whole icon map at runtime,
   * `icons[this.name]`, and no bundler can shake a runtime lookup, so every
   * consumer of any component that renders one ships all 50kB of path data; a
   * named import ships one path. The import is checked when the package
   * compiles, where a `name` string is checked only by a later name lookup. And
   * `Icon` is not registered on the headless tier at all, which registers
   * `helix-headless-icon`, so a headless consumer gets an inert unknown element
   * and no mark whatsoever.
   */
  protected renderTrigger(): TemplateResult {
    return html`<slot name="trigger"><svg aria-hidden="true" fill="currentColor" part="trigger-icon" viewBox=${calendarBlank.viewBox}>
        ${unsafeSVG(calendarBlank.content)}
      </svg></slot>`
  }

  protected override render(): TemplateResult {
    return html`${this.renderLabel()}
      <div part="field" @keydown=${this.handleKeydown}>
        ${
          this.mode === 'multiple'
            ? this.renderTokenRow(
                this.shownDates.map((date) => this.renderTag(date)),
                this.restCount,
              )
            : nothing
        }
        <input
          part="control"
          id=${this.controlId}
          type="text"
          .value=${this.display}
          name=${this.name || nothing}
          placeholder=${
            this.mode === 'multiple' && dates(this.value).length > 0
              ? nothing
              : this.placeholder || nothing
          }
          autocomplete=${this.autocomplete || nothing}
          inputmode="numeric"
          aria-describedby=${this.describedBy ?? nothing}
          ?disabled=${this.isDisabled}
          ?readonly=${this.readOnly}
          ?required=${this.required}
          @blur=${this.handleBlur}
          @focus=${this.handleFocus}
          @input=${this.handleInput}
          @keydown=${this.handleDraftKey}
        />
        <button
          part="trigger"
          type="button"
          aria-controls="surface"
          aria-expanded=${this.open ? 'true' : 'false'}
          aria-haspopup="dialog"
          aria-label=${this.triggerLabel}
          ?disabled=${this.isDisabled}
          @click=${() => this.toggleOpen()}
        >
          ${this.renderTrigger()}
        </button>
      </div>

      ${
        /* A dialog, which is what the trigger's `aria-haspopup` promised: the
           surface had no role, so the promise named something that was not
           there. Named by the trigger's words, which say what it is for. */
        ''
      }
      <div
        part="surface"
        id="surface"
        role="dialog"
        aria-label=${this.triggerLabel}
        popover="manual"
        ?hidden=${!this.open}
      >
        ${this.renderPicker()}
      </div>
      ${this.renderHint()}${this.renderFeedback()}`
  }

  /* Date Picker holds this pair identically and Time Input holds it over a
     different conversion. Why all four write it out rather than sharing a
     mixin is argued once, on `value-as.ts`. */
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
    'helix-headless-date-input': HelixHeadlessDateInput
  }
}
