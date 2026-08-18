import {
  customElement,
  type HelixChangeEvent,
  HelixFormElement,
  MixinControllerOpen,
  MixinControllerValue,
  MixinField,
  PopoverController,
} from '@helix-io/core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import '../../calendar/index.js'

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
  value
    .split(',')
    .map((one) => one.trim())
    .filter(Boolean)

/**
 * @summary A date, typed or picked from a calendar.
 *
 * @description
 * **The calendar is `helix-calendar`, not a second one written here.** It
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
 * @aliases DatePicker, DateField, DateInput
 * @documentation https://helix.fusion.dev/components/input-date
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
 * @csspart trigger - The control that opens the calendar.
 * @csspart surface - The floating panel.
 * @csspart calendar - The calendar inside it.
 */
@customElement('helix-base-input-date')
export class HelixBaseInputDate extends MixinControllerOpen(
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
    boundary: () => this.renderRoot?.querySelector<HTMLElement>('[part="surface"]'),
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

  /** Relayed under this element's name, so a consumer hears one control. */
  private readonly handleInput = (event: Event): void => {
    event.stopPropagation()
    this.requestValue((event.target as HTMLInputElement).value)
    this.restore()
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
      this.updateComplete.then(() => this.control?.focus())
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
    if (control && control.value !== this.value) {
      control.value = this.value
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
      this.control?.focus()
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
        this.renderRoot?.querySelector<HTMLElement>('[part="calendar"]')?.focus()
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
  private readonly handleFocus = (event: FocusEvent): void => {
    const from = event.relatedTarget
    if (this.open || this.isDisabled) {
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

  protected override render(): TemplateResult {
    return html`${this.renderLabel()}
      <div part="field" @keydown=${this.handleKeydown}>
        <input
          part="control"
          id="control"
          type="text"
          .value=${this.value}
          name=${this.name || nothing}
          placeholder=${this.placeholder || nothing}
          autocomplete="off"
          inputmode="numeric"
          aria-describedby=${this.describedBy ?? nothing}
          ?disabled=${this.isDisabled}
          ?required=${this.required}
          @focus=${this.handleFocus}
          @input=${this.handleInput}
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
          <slot name="trigger"></slot>
        </button>
      </div>

      <div part="surface" id="surface" popover="manual" ?hidden=${!this.open}>
        <helix-calendar
          part="calendar"
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
        ></helix-calendar>
      </div>
      ${this.renderHint()}${this.renderFeedback()}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-input-date': HelixBaseInputDate
  }
}
