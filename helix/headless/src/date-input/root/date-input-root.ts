import {
  customElement,
  type HelixChangeEvent,
  HelixFormElement,
  MixinControllerOpen,
  MixinControllerValue,
  MixinField,
  PopoverController,
} from '@helix-io/core'
import { calendarBlank } from '@helix-io/icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'
import '../../date-picker/index.js'
import '../../tag/index.js'

/** Whether a string is a date the rest of this component can reason about. */
const isIso = (value: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(value)

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
 * **The calendar is `helix-date-picker`, not a second one written here.** It
 * already knows about months, ranges, disabled days, the first day of the week
 * and every keyboard rule a grid owes a reader, and a picker that reimplemented
 * a tenth of that would be a worse grid that also had to be maintained. This
 * element is the field, the overlay, and the translation between them.
 *
 * **Typed as well as picked, and the typing is the reason it is not
 * `<input type="date">`.** The native control gives a free picker and a free
 * locale and takes almost all styling with it, which is a fair trade until a
 * product needs the calendar to match everything around it. What is kept from
 * the native one is the part worth keeping: a real text field, so a reader who
 * knows the date types it and never opens anything.
 *
 * **The value is `YYYY-MM-DD`, always.** That is what a form submits, what
 * `min` and `max` compare against, and what the calendar speaks. What the field
 * *shows* is the same string: a locale-formatted display would have to be parsed
 * back on every keystroke, and half-typed input does not survive a round trip
 * through a formatter. The same reasoning the sandbox records for its two
 * syntaxes, which is that a document being edited must not be a rendering of
 * something else.
 *
 * **Opening does not commit.** The calendar announces a date, this element takes
 * it, and the overlay shuts, because a single date has nothing more to say. A
 * consumer who owns `value` answers the announcement the way they answer any
 * other control here.
 *
 * @since 0.1.0
 * @status experimental
 * @category forms
 * @aliases DatePicker, DateField, InputDate
 * @documentation https://helix.fusion.dev/components/date-input
 *
 * @slot trigger - The mark on the field saying a calendar opens.
 * @slot hint - Help under the field.
 * @slot feedback - What is wrong with it.
 *
 * @event {HelixChangeEvent} helix-change - Fired when the date changes.
 * @event {HelixOpenEvent} helix-open - Fired when the calendar opens.
 * @event {HelixCloseEvent} helix-close - Fired when it closes.
 *
 * @csspart field - The box holding the text and the trigger.
 * @csspart control - The text input.
 * @csspart date - One held date, as a tag, in `multiple`.
 * @csspart rest - How many dates are held beyond the ones shown.
 * @csspart trigger - The control that opens the calendar.
 * @csspart trigger-icon - The mark on the button that opens the calendar.
 * @csspart surface - The floating panel.
 * @csspart picker - The date picker inside it.
 */
@customElement('helix-base-date-input')
export class HelixBaseDateInput extends MixinControllerOpen(
  MixinControllerValue(MixinField(HelixFormElement)),
) {
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
   * first. The panel is sized by its content, so this widens it.
   */
  @property({ type: Number })
  months = 1

  /**
   * How many dates are shown as tags before the rest are counted, in `multiple`.
   *
   * `0` is all of them, and is the default: a cap that guesses is worse than no
   * cap, because the number that fits depends on the width of the field and the
   * length of what is in it, neither of which this element knows. What a cap is
   * genuinely for is a field in a row or a table cell, where a set of twelve
   * dates would push everything below it down a line at a time.
   *
   * The remainder is counted rather than hidden. "3 more" is a fact a reader can
   * act on, where a row that silently stops is a field that appears to have lost
   * what was put in it, and the count is what tells them there is more to see.
   */
  @property({ attribute: 'max-tags', type: Number })
  maxTags = 0

  /** Earliest date that can be chosen, as `YYYY-MM-DD`. */
  @property()
  min = ''

  /** Latest date that can be chosen, as `YYYY-MM-DD`. */
  @property()
  max = ''

  /** Dates that cannot be chosen, as a comma-separated `YYYY-MM-DD` list. */
  @property({ attribute: 'disable-dates' })
  disableDates = ''

  /** Days of the week that cannot be chosen, `0` for Sunday through `6`. */
  @property({ attribute: 'disable-days' })
  disableDays = ''

  /** First column of the week in the calendar, `0` for Sunday through `6`. */
  @property({ attribute: 'first-day-of-week', type: Number })
  firstDayOfWeek = 0

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

  /** Language tag the calendar names its months and days in. */
  @property()
  locale = ''

  /** What the field says before a date is in it. */
  @property()
  placeholder = 'YYYY-MM-DD'

  /** Accessible name for the control that opens the calendar. */
  @property({ attribute: 'trigger-label' })
  triggerLabel = 'Choose a date'

  /**
   * The overlay, placed against the field rather than the trigger.
   *
   * Against the field because that is the box a reader sees as the control: a
   * calendar hung off a small button at one end of a wide field reads as
   * belonging to the button. `Select` anchors to its trigger for the opposite
   * reason, its trigger being the whole control.
   */
  protected readonly panel = new PopoverController(this, {
    anchor: () => this.renderRoot?.querySelector<HTMLElement>('[part="field"]'),
    /* The surface *and* the trigger.
     *
     * A control is not always one element: the button that opens this panel is
     * part of it, and a press on it is not a press outside. Scoped to the
     * surface alone, `pointerdown` on the trigger closed the panel and the
     * trigger's own `toggleOpen` reopened it on the `click` that followed, so
     * the panel could never be closed by the button that opened it. Measured
     * across all five popover-bearing components: Menu, Popover and Tooltip
     * already named their invoker; this one and its three siblings did not, and
     * all four stayed open on a second press where Menu closed.
     *
     * `DismissController` documents this exact failure and takes a list for it.
     * The list was the fix; using it was the part that did not happen here. */
    boundary: (): readonly (Element | null | undefined)[] => [
      this.renderRoot?.querySelector<HTMLElement>('[part="surface"]'),
      this.renderRoot?.querySelector<HTMLElement>('[part="trigger"]'),
    ],
    /* Wider than the four every other panel here takes. Those sit against a
       control the same width as themselves and read as an extension of it; this
       one is a calendar of its own size hanging off a field, so the gap is what
       says the two are separate things rather than one control that grew. */
    offset: () => 8,
    onDismiss: () => this.requestOpen(false),
    placement: 'bottom-start',
    surface: () => this.renderRoot?.querySelector<HTMLElement>('[part="surface"]'),
  })

  private get control(): HTMLInputElement | null {
    if (typeof this.renderRoot?.querySelector !== 'function') {
      return null
    }
    return this.renderRoot.querySelector<HTMLInputElement>('[part="control"]')
  }

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
    return held.length > 0 && held.every(isIso) ? held.join(',') : ''
  }

  /**
   * What the field shows, which is the value in every mode but one.
   *
   * A range reads `2026-08-04 – 2026-08-11`, because two dates separated by a
   * comma is a list and a range is a span: the comma says "and these", the dash
   * says "through". It is the one place this component shows something other
   * than the value it holds, and it is safe because the dash reads back: `dates`
   * takes a spaced dash as a separator, so what is shown is what can be typed.
   *
   * `multiple` shows nothing here at all. Its dates are tags beside the input
   * and the input is a draft, which is the next thing down.
   */
  /** One date, written the way `dateStyle` asks for. */
  private written(date: string): string {
    if (this.dateStyle === 'iso' || !isIso(date)) {
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

  private get display(): string {
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

  /** Whether the caret is in the field, which is when it holds the value. */
  @state()
  private editing = false

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
       gives about a document being edited: normalising `2026-08-0` would take
       the caret away mid-date. */
    const held = dates(typed)
    const whole = held.length > 0 && held.every(isIso)
    this.requestValue(whole ? held.join(',') : typed)
    this.restore()
  }

  /** Adds what was typed to the set, or takes the last one back out. */
  private readonly handleDraftKey = (event: KeyboardEvent): void => {
    if (this.mode !== 'multiple') {
      return
    }
    const held = dates(this.value)
    if (event.key === 'Enter' && isIso(this.draft)) {
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

  /** The dates that get a tag, which is all of them until `maxTags` says not. */
  private get shownDates(): string[] {
    const held = dates(this.value)
    return this.maxTags > 0 ? held.slice(0, this.maxTags) : held
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
    const { value } = (event as HelixChangeEvent).detail
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

  /**
   * Puts the field back where the answer differs from what was typed.
   *
   * `requestValue` is the mixin's, and it announces and decides; this is the
   * other half, which `Input` needs for the same reason: the native control has
   * already changed, so wherever the answer does not follow it, it has to be
   * restored. A refusal and a consumer who owns `value` and has not given a new
   * one are the same thing from here.
   */
  private restore(): void {
    const control = this.control
    if (control && control.value !== this.display) {
      control.value = this.display
    }
    this.sync()
  }

  /** Reports the value and the validity the host stands behind. */
  private sync(): void {
    this.internals.setFormValue(this.value)
    const control = this.control
    if (!control) {
      return
    }
    /* Bounds are checked here rather than left to the input, which is `text`
       and has no idea what a date is: `min` and `max` on a text input do
       nothing, and `type="date"` is what was given up to own the calendar.
       String comparison is enough because ISO dates sort lexically, which is
       the whole reason the value is that shape. */
    /* Every date in the value, not the value itself: a range is two of them and
       a multiple is any number, so a string comparison against `min` would be
       comparing a bound to a list. */
    const held = dates(this.value)
    let message = ''
    if (held.length > 0 && !held.every(isIso)) {
      message =
        this.mode === undefined
          ? 'Enter a date as YYYY-MM-DD.'
          : 'Enter dates as YYYY-MM-DD, separated by commas.'
    } else if (this.min !== '' && held.some((one) => one < this.min)) {
      message = `Choose a date on or after ${this.min}.`
    } else if (this.max !== '' && held.some((one) => one > this.max)) {
      message = `Choose a date on or before ${this.max}.`
    } else if (this.mode === 'range' && held.length > 2) {
      message = 'A range is two dates.'
    }
    if (message === '') {
      this.internals.setValidity(control.validity, control.validationMessage, control)
    } else {
      this.internals.setValidity({ badInput: true }, message, control)
    }
    this.refreshFeedback()
  }

  /** Escape shuts the calendar without moving the date. */
  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.open) {
      event.stopPropagation()
      this.requestOpen(false)
      this.returnFocus()
    }
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    // Whatever the markup arrived with, so a form knows before anything is typed.
    this.sync()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    if (changed.has('value')) {
      this.sync()
    }
    /* Driven from here rather than from the toggle, because `open` is a property
       a consumer may set directly and the panel has to follow either way. The
       controller is idempotent, so arriving twice for the same open costs
       nothing. Select drives it the same way, and without this the surface stays
       `display: none`: a `popover` element is hidden until something shows it,
       so the calendar rendered its forty-two cells into a box of nothing. */
    if (this.open) {
      this.panel.show()
      // Only on the update that opened it, or every keystroke while it is up
      // would steal focus back into the grid.
      if (changed.has('open')) {
        this.renderRoot?.querySelector<HTMLElement>('[part="picker"]')?.focus()
      }
    } else {
      this.panel.hide()
    }
  }

  /**
   * Focusing the field opens the calendar.
   *
   * A reader who reaches this control is choosing a date, and making them find
   * the trigger afterwards is a second action for something they have already
   * asked for. Typing still works with it up, because the calendar follows the
   * field rather than the other way round.
   *
   * **Only where focus arrived from outside this element**, which is the whole
   * of the difficulty. Picking a date shuts the panel and puts the caret back in
   * the field, and the first version of this reopened it on the way: the reader
   * chose a date and the calendar came straight back, which the existing spec
   * caught. `relatedTarget` is where focus came from, so a hand-off from the
   * calendar or the trigger is left alone and only a genuine arrival opens
   * anything.
   *
   * On the input rather than on the field, too. Focus does not bubble, so a
   * listener here covers the text and not the trigger, which is what keeps
   * pressing the trigger from opening the panel on focus and then shutting it
   * again on the click.
   */
  /**
   * Puts the caret back in the field without the field reopening the calendar.
   *
   * Focus opens the calendar, so handing focus back after a pick reopens the
   * thing that was just answered. `relatedTarget` was the guard and it is not
   * enough on its own: it catches a hand-off from the trigger, and it does not
   * catch this, because the cell that had focus is gone by the time the caret
   * moves and the document has fallen back to something outside this element.
   *
   * **Reasoned rather than measured, and worth saying which.** In a focused
   * document: the reader presses a day, the cell has focus, the panel is hidden,
   * the browser moves focus off the removed cell to the body, and the caret is
   * then put back here with `relatedTarget` pointing at the body, which is
   * outside this element and reads as an arrival. Every step is ordinary browser
   * behavior and none of it can be exercised here: `focus()` dispatches no
   * event in an unfocused document, which is what both the test runtime and the
   * available browser pane are. A spec was written for it and passed with the
   * guard removed, so it was covering nothing and has been taken out rather than
   * left to look like proof.
   *
   * A flag rather than a better guess, because this element is the one moving
   * the focus and is the only thing that can know so. Cleared synchronously,
   * since `focus()` dispatches before it returns.
   */
  private returning = false

  private returnFocus(): void {
    this.returning = true
    this.control?.focus()
    this.returning = false
  }

  private readonly handleBlur = (): void => {
    this.editing = false
  }

  private readonly handleFocus = (event: FocusEvent): void => {
    /* Not while the caret is being handed back. Picking a date returns focus
       to the field, and treating that as editing put the field into the shape it
       takes for typing: a reader chose "10:00 PM" from a list and the field
       answered "22:00". Focus is a good enough signal for editing everywhere
       except the one moment this element moved the focus itself, and it already
       knows when that is. */
    this.editing = !this.returning
    const from = event.relatedTarget
    if (this.open || this.isDisabled || this.returning) {
      return
    }
    if (from instanceof Node && this.renderRoot?.contains?.(from)) {
      return
    }
    this.requestOpen(true)
  }

  /** Puts the caret in the field, the way a label pointing at one would. */
  override focus(options?: FocusOptions): void {
    this.control?.focus(options)
  }

  /**
   * The calendar the field opens, behind a seam the styled tier can move.
   *
   * A method rather than a fragment inline, so a tier above can render its own,
   * wrap this one, pass it a property the base does not know about, or leave it
   * out, without reimplementing the whole template to do any of them. The
   * public tag rather than the base one: a consumer on the styled tier gets the
   * styled element, and one on the headless tier brings their own under that
   * name.
   */
  protected renderPicker(): TemplateResult {
    return html`<helix-date-picker
      part="picker"
      ?invalid=${this.resolvedFeedback !== ''}
      mode=${this.mode ?? nothing}
      months=${this.months}
      .value=${this.picked}
      disable-dates=${this.disableDates || nothing}
      disable-days=${this.disableDays || nothing}
      first-day-of-week=${this.firstDayOfWeek}
      locale=${this.locale || nothing}
      max=${this.max || nothing}
      min=${this.min || nothing}
      @helix-change=${this.handleCalendarChange}
    ></helix-date-picker>`
  }

  /**
   * One chosen date, as a tag, behind a seam the styled tier can move.
   *
   * A method rather than a fragment inline, so a tier above can render its own,
   * wrap this one, pass it a property the base does not know about, or leave it
   * out, without reimplementing the whole template to do any of them. The
   * public tag rather than the base one: a consumer on the styled tier gets the
   * styled element, and one on the headless tier brings their own under that
   * name.
   */
  protected renderTag(date: string): TemplateResult {
    return html`<helix-tag
                  part="date"
                  dismissible
                  dismiss-label=${`Remove ${date}`}
                  ?disabled=${this.isDisabled}
                  @helix-dismiss=${(event: Event) => {
                    event.stopPropagation()
                    this.removeDate(date)
                  }}
                  >${this.written(date)}</helix-tag
                >`
  }

  /**
   * The mark on the button that opens the calendar, behind a seam.
   *
   * Slot fallback, so a consumer replaces it by slotting; and a method, so the
   * tier above replaces it by overriding.
   *
   * **A named import rather than `<helix-icon>`, and that is a reversal.** The
   * element looked like the tidier of the two and loses on three counts.
   * `helix-icon` indexes the whole icon map at runtime, `icons[this.name]`, and
   * no bundler can shake a runtime lookup, so every consumer of any component
   * that renders one ships all 50kB of path data; a named import ships one
   * path. The import is checked when the package compiles, where a `name`
   * string is checked only when `check:icons` runs. And `helix-icon` is not
   * registered on the headless tier at all, which registers `helix-base-icon`,
   * so a headless consumer got an inert unknown element and no mark whatsoever.
   */
  protected renderTrigger(): TemplateResult {
    return html`<slot name="trigger"><svg aria-hidden="true" fill="currentColor" part="trigger-icon" viewBox=${calendarBlank.viewBox}>
        ${unsafeSVG(calendarBlank.content)}
      </svg></slot>`
  }

  protected override render(): TemplateResult {
    return html`${this.renderLabel()}
      <div part="field" @keydown=${this.handleKeydown}>
        ${this.mode === 'multiple' ? this.shownDates.map((date) => this.renderTag(date)) : nothing}
        ${this.restCount > 0 ? html`<span part="rest">${`+${this.restCount}`}</span>` : nothing}
        <input
          part="control"
          id="control"
          type="text"
          .value=${this.display}
          name=${this.name || nothing}
          placeholder=${
            this.mode === 'multiple' && dates(this.value).length > 0
              ? nothing
              : this.placeholder || nothing
          }
          autocomplete="off"
          inputmode="numeric"
          aria-describedby=${this.describedBy ?? nothing}
          ?disabled=${this.isDisabled}
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

      <div part="surface" id="surface" popover="manual" ?hidden=${!this.open}>
        ${this.renderPicker()}
      </div>
      ${this.renderHint()}${this.renderFeedback()}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-date-input': HelixBaseDateInput
  }
}
