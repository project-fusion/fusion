import {
  AriaForwardController,
  appleTouch,
  valueAsNumber as asNumber,
  customElement,
  fillTemplate,
  formatNumber,
  numberAsValue as fromNumber,
  HelixFormElement,
  holdCaret,
  MixinControllerValue,
  MixinField,
  parseNumber,
  restoreValue,
} from '@fusion.dev/helix-core'
import { minus, plus } from '@fusion.dev/helix-icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'

/**
 * How far a pointer travels for one step of the value, in pixels.
 *
 * Four, measured against the alternatives rather than picked: at one the value
 * runs away from the pointer and a field with `step="1"` crosses a hundred in
 * the width of a word, and at ten a reader has to cross the viewport to reach
 * a useful number. Four is roughly a character's width at the sizes this is set
 * in, so a step reads as "about one glyph of travel".
 */
const SCRUB_PITCH = 4

/**
 * And the same step over four times the travel, which is what fine means here.
 *
 * Fine lengthens the distance rather than shrinking the increment. A drag that
 * produced values between the steps would be the one input in the library that
 * can reach a number its own arrow keys cannot, and `step` would stop being the
 * grid the control is on.
 */
const SCRUB_FINE = 16

/**
 * @summary A field for a number, typed or changed with step buttons.
 *
 * @description
 * A separate family from `Input`'s `type="number"`. It renders two buttons,
 * binds four keys `Input` does not, and handles clamping and stepping.
 *
 * The field is `type="text"` with `inputmode="decimal"`. Tested in a real
 * browser, `type="number"` fails in three ways:
 * - Typing `12e` gives a `.value` of `""`, so the element cannot see what you
 *   typed. A `type="text"` field keeps `"12e"`.
 * - The mouse wheel over a focused field changes the value, for example from 5
 *   to 4, when you only meant to scroll the page.
 * - `selectionStart` is `null`, so the caret cannot be managed.
 *
 * `inputmode="decimal"` keeps the numeric keypad on phones.
 *
 * `format-options` shows the number with `Intl.NumberFormat` in `locale`, as a
 * currency, a percent or a unit, while the field is not being edited. Focus
 * shows the number itself, and a typed `$1,200` or `25%` is read back with the
 * same options. The value stays the plain number: `1200`, or `0.25` for 25%.
 * The locale's group separators are read in every field, so `1,234` is a
 * number in `en-US`.
 *
 * On iOS and iPadOS the field is a plain text field, with no
 * `role="spinbutton"`, which VoiceOver reads as a slider you cannot type in,
 * and no role description, so VoiceOver says the field is required. React
 * Aria's NumberField does the same.
 *
 * Validity follows the platform's rules: `min`, `max`, and `step` are checked
 * and reported through the host's own `setValidity`, under the platform's flag
 * names.
 *
 * Stepping is separate from typing, so a number is not corrected while you type
 * it.
 *
 * **Keyboard.** The field is one tab stop, and the stepper buttons are not in
 * the tab order.
 *
 * | Key | What it does |
 * |---|---|
 * | Up, Down | Steps the value up or down by `step`. |
 * | Page Up, Page Down | Steps by `large-step` steps, ten by default. |
 * | Home, End | Goes to `min` or `max`, where there is one. Without one, moves the caret. |
 * | Enter | Commits the typed number and submits the form, as a native field does. |
 *
 * The field has `role="spinbutton"` with `aria-valuenow`, `aria-valuemin`,
 * `aria-valuemax`, and the formatted text in `aria-valuetext`.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @aliases NumberField, Stepper, InputNumber
 * @documentation https://fusion.dev/helix/components/number-input
 *
 * @slot end - Content after the number, such as a unit.
 * @slot feedback - The message that says what is wrong, for content richer than a string. It shows while there is a message.
 * @slot hint - Help under the control, for content richer than the `hint` text.
 * @slot label - The label, for content richer than the `label` text.
 * @slot start - Content before the number, such as a unit or an icon.
 *
 * @event {Event} change - The user finished changing the value. Relayed from the native field.
 * @event {HelixBeforeChangeEvent} helix-before-change - The value is about to change. Cancelable: cancel it to keep the current value.
 * @event {Event} input - The value changed.
 *
 * @csspart control - The input that holds the number.
 * @csspart decrement - The button that steps the value down.
 * @csspart decrement-mark - The icon on the step down button.
 * @csspart feedback - The message that says what is wrong.
 * @csspart field - The box that holds the whole control.
 * @csspart hint - Help text under the field, shown while there is no feedback.
 * @csspart increment - The button that steps the value up.
 * @csspart increment-mark - The icon on the step up button.
 * @csspart label - The label above the field. It is also the grip you drag when `scrub` is set.
 *
 * @cssstate invalid - The control has an error to show, from the browser's validation or from your `feedback`.
 */
@customElement('helix-headless-number-input')
export class HelixHeadlessNumberInput extends MixinControllerValue(MixinField(HelixFormElement)) {
  /* A consumer's `aria-describedby` names ids in their own tree and the control
     is in this shadow root, so the reference has to be carried down as an
     element rather than copied as an id. See `AriaForwardController`: measured
     in Chrome's own tree, the host held the description and the control the
     reader is actually on was exposed without it. */
  protected readonly aria = new AriaForwardController(this, {
    target: () => this.partNamed('control'),
  })

  /** Typed or dragged, so every edit is announced. See `announcesInput`. */
  protected override readonly announcesInput = true

  /**
   * What the browser may autofill, as an HTML `autocomplete` token.
   *
   * Empty leaves the attribute off, which is the browser's default and is what
   * lets autofill work at all. Hardcoding `off` here is what stops a reader
   * having a birthday or a postal code filled in for them, with no way for a
   * consumer to ask for it.
   */
  @property()
  autocomplete = ''

  /**
   * The message the browser shows when the field holds something that is not a
   * number.
   *
   * **Every sentence a control raises in the browser's bubble is a property**,
   * named for the validity flag it reports, so a form in another language
   * speaks it: `feedback` replaces the message under the field and does not
   * reach the bubble. Absent is the control's own sentence, in English.
   */
  @property({ attribute: 'bad-input-message' })
  badInputMessage?: string

  /**
   * The name of the step down button, read by screen readers.
   */
  @property({ attribute: 'decrement-label' })
  decrementLabel = 'Decrease'

  /**
   * `Intl.NumberFormat` options the number is shown with while the field is
   * not being edited: a currency, a percent, a unit, or a number of decimals.
   * Written as JSON in the attribute.
   *
   * ```html
   * <helix-number-input format-options='{"style":"currency","currency":"EUR"}'></helix-number-input>
   * ```
   */
  @property({ attribute: 'format-options', type: Object })
  formatOptions?: Intl.NumberFormatOptions

  /**
   * The name of the step up button, read by screen readers.
   */
  @property({ attribute: 'increment-label' })
  incrementLabel = 'Increase'

  /**
   * How many steps `PageUp` and `PageDown` move.
   *
   * Ten steps, which is the convention every spinner on the platform follows,
   * and a property because ten of a step of `0.01` is a hundredth and rarely
   * what a reader wants from a whole key.
   */
  @property({ attribute: 'large-step', type: Number })
  largeStep?: number

  /**
   * The locale a typed number is read in, such as `de-DE`. Empty reads it in
   * the browser's language.
   *
   * Where the locale writes a decimal comma, `1,5` is read as one and a half,
   * which is what the decimal keypad on a phone in that locale types. A dot is
   * read as a decimal point in every locale.
   */
  @property()
  locale = ''

  /**
   * The largest value allowed.
   *
   * Absent has no ceiling.
   */
  @property({ type: Number })
  max?: number

  /**
   * The smallest value allowed.
   *
   * Absent has no floor.
   */
  @property({ type: Number })
  min?: number

  /**
   * Shown while the field is empty.
   *
   * Not a label: it goes when typing starts.
   */
  @property()
  placeholder = ''

  /**
   * The message the browser shows when the number is above `max`, with `{max}`
   * filled in.
   */
  @property({ attribute: 'range-overflow-message' })
  rangeOverflowMessage?: string

  /**
   * The message the browser shows when the number is below `min`, with `{min}`
   * filled in.
   */
  @property({ attribute: 'range-underflow-message' })
  rangeUnderflowMessage?: string

  /**
   * Prevents editing. The value is still submitted with the form.
   */
  @property({ attribute: 'readonly', reflect: true, type: Boolean })
  readOnly = false

  /**
   * Makes the label a grip that changes the value when it is dragged.
   *
   * The label is what is dragged, so this adds no chrome at all. Still opt-in,
   * because it changes what a press on the label does and a reader who drags
   * across a word expecting to select it should get that everywhere it has not
   * been asked for. Where it earns its place is a value a reader tunes rather
   * than states: a duration, a weight, a count they are looking for rather than
   * one they already know.
   */
  @property({ reflect: true, type: Boolean })
  scrub = false

  /**
   * How far one step moves. A value off the step grid, counted from `min`, is
   * invalid, as it is in a native number field.
   */
  @property({ type: Number })
  step = 1

  /**
   * The message the browser shows when the number is off the step grid, with
   * `{below}` and `{above}` filled in with the nearest valid values.
   */
  @property({ attribute: 'step-mismatch-message' })
  stepMismatchMessage?: string

  /**
   * What a screen reader says for the value, with `{value}` filled in, such as
   * `{value} kilograms`.
   *
   * A unit slotted into `end` is drawn beside the number and is not part of
   * what the spinbutton announces, so it goes here too. Empty announces the
   * number alone.
   */
  @property({ attribute: 'value-text' })
  valueText = ''

  /**
   * Whether the mouse wheel steps the number while the field has focus, as
   * React Aria's NumberField does unless told not to. Off, the wheel scrolls
   * the page, which is what a reader passing over a form expects.
   */
  @property({ type: Boolean })
  wheel = false

  /** Whether the field has focus, so it shows the number itself and not its format. */
  @state()
  private editing = false

  /**
   * What the field shows: the value as written while it is edited, and with
   * `format-options` once it is not.
   */
  private get shown(): string {
    const parsed = this.numeric
    if (this.editing || this.formatOptions === undefined || parsed === null) {
      return this.value
    }
    return formatNumber(parsed, this.locale, this.formatOptions)
  }

  /** Steps on the wheel, where asked, while the field has focus. */
  private readonly handleWheel = (event: WheelEvent): void => {
    if (!this.wheel || !this.editing || event.deltaY === 0) {
      return
    }
    event.preventDefault()
    if (event.deltaY < 0) {
      this.stepUp()
    } else {
      this.stepDown()
    }
  }

  private readonly handleFocus = (): void => {
    this.editing = true
  }

  /**
   * Whether this is an iPhone or an iPad, read once on the client. A server
   * has no navigator and renders the spinbutton.
   */
  private readonly touchApple = appleTouch(typeof navigator === 'undefined' ? undefined : navigator)

  private get control(): HTMLInputElement | null {
    return this.partNamed<HTMLInputElement>('control')
  }

  /** The value as a number, or `null` where the field holds nothing usable. */
  private get numeric(): number | null {
    const text = this.value.trim()
    if (text === '') {
      return null
    }
    /* Read in the locale with the options it is shown with, so a typed
       `$1,200` is 1200 and `1,5` in a locale with a decimal comma is one and a
       half. A point is a decimal point in every locale, unless the locale's
       decimal comma is there too. */
    return parseNumber(text, this.locale, this.formatOptions)
  }

  /** Whether `value` is on the step grid, counted from `min`. */
  private onStep(value: number): boolean {
    const step = Math.abs(this.step) || 1
    const anchor = this.min ?? 0
    const steps = (value - anchor) / step
    // To the precision the grid is written in, so 0.1 + 0.2 is on a 0.1 grid.
    return Math.abs(steps - Math.round(steps)) < 1e-9
  }

  /**
   * A value pulled into range and onto the step grid.
   *
   * The grid is anchored at `min` where there is one, so `min="1" step="2"`
   * gives 1, 3, 5 rather than 0, 2, 4. Rounded to the step's own precision,
   * because stepping 0.1 in binary floating point otherwise produces
   * `0.30000000000000004` and puts it in the field.
   */
  private clamp(value: number): number {
    const step = Math.abs(this.step) || 1
    const anchor = this.min ?? 0
    const stepped = anchor + Math.round((value - anchor) / step) * step
    const floored = this.min === undefined ? stepped : Math.max(this.min, stepped)
    const capped = this.max === undefined ? floored : Math.min(this.max, floored)
    /* Decimal places from the step and the anchor together: a step of 0.5 from
       an anchor of 0.25 lands on 0.75, which needs two rather than the one the
       step alone would give. */
    const places = Math.max(decimals(step), decimals(anchor))
    return Number(capped.toFixed(places))
  }

  /**
   * Moves by whole steps, from where the reader is.
   *
   * From `min` when the field is empty, so the first press of an arrow lands
   * somewhere meaningful rather than on zero: an empty field with `min="1"`
   * stepping to 0 would be out of range before the reader had typed anything.
   */
  private nudge(steps: number): void {
    if (this.isDisabled || this.readOnly) {
      return
    }
    const step = Math.abs(this.step) || 1
    const from = this.numeric ?? this.min ?? 0
    const next = this.clamp(this.numeric === null ? from : from + steps * step)
    this.land(String(next))
  }

  /**
   * A value the reader moved to in one gesture, applied and committed.
   *
   * **A step is finished when it lands, so it commits.** The field sends
   * `change` on blur for what the reader typed, and a step is written by
   * script, so the browser never sends one for it: three presses of the plus
   * and a move elsewhere reached a form listening on `change` as nothing at
   * all. A native number field commits on every step, and so does this, for
   * the arrows, the buttons, and `Home` and `End`. Only when the value moved: a
   * refused step, or one pinned at a bound, finished nothing.
   */
  private land(next: string): void {
    const before = this.value
    const applied = this.requestValue(next)
    const control = this.control
    if (control) {
      restoreValue(control, this.value)
    }
    if (applied && this.value !== before) {
      this.announceChange()
    }
  }

  /** Steps the value up, by `largeStep` steps when `large` is set. */
  stepUp(large = false): void {
    this.nudge(large ? (this.largeStep ?? 10) : 1)
  }

  /**
   * Steps the value down, by `largeStep` steps when `large` is set.
   *
   * The same path a press of the down arrow takes, so a consumer driving this
   * from their own control gets the clamping and the announcement rather than
   * having to repeat both.
   */
  stepDown(large = false): void {
    this.nudge(large ? -(this.largeStep ?? 10) : -1)
  }

  /**
   * The label is the surface, which is where the convention already is.
   *
   * Not a grip of its own at the leading edge, which is the obvious answer and
   * is a second control in a field that already has three. Every tool that does
   * this well drags the *name* of the value: the label is present on every
   * field, costs no chrome, and a reader who wants to know what they are
   * dragging is already looking at it.
   *
   * Overridden rather than handled on the host, because the handlers have to
   * sit on the element that takes the capture. The markup is the mixin's, said
   * again here, which is the duplication #76 exists to remove.
   *
   * A label with nothing in it is still nothing. `scrub` on a field whose label
   * is empty leaves no surface, which is honest: there is nowhere to put the
   * gesture and inventing somewhere is how the grip happened.
   */
  protected override renderLabel(): TemplateResult | typeof nothing {
    if (!this.scrub || !this.labeled) {
      return super.renderLabel()
    }
    const hidden = this.label === '' ? this.getAttribute('aria-label') : null
    return html`<label
      part="label"
      for=${this.controlId}
      ?data-hidden=${hidden !== null}
      @pointercancel=${this.handleScrubEnd}
      @pointerdown=${this.handleScrubDown}
      @pointermove=${this.handleScrubMove}
      @pointerup=${this.handleScrubEnd}
      ><slot name="label">${this.label || hidden}</slot></label
    >`
  }

  /** Where the pointer went down, and what the value was there. */
  private scrubFrom = 0
  private scrubValue = 0
  /** The value when the press began, which is what a release is compared to. */
  private scrubStart = ''

  /**
   * Press, and the value follows the pointer.
   *
   * Captured, so a drag that leaves the grip keeps going: a reader tuning a
   * number moves further than a 20 pixel handle and the gesture ending because
   * they overshot it would be the control refusing the very thing it offered.
   * `preventDefault` because a press inside a field otherwise starts a text
   * selection, which drags a blue wash across the label at the same time.
   */
  private readonly handleScrubDown = (event: PointerEvent): void => {
    if (this.isDisabled || this.readOnly) {
      return
    }
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
    this.scrubFrom = event.clientX
    this.scrubValue = this.numeric ?? this.min ?? 0
    this.scrubStart = this.value
    event.preventDefault()
  }

  /**
   * Read from where the press began, never from the last frame.
   *
   * Accumulating a delta per move drifts: every rounding to a step throws away
   * the remainder, and a slow drag across a hundred events throws it away a
   * hundred times, so the value and the pointer disagree by more the longer
   * anyone holds. From the origin the arithmetic is the same on every frame and
   * the value can only be where the pointer says it is.
   */
  private readonly handleScrubMove = (event: PointerEvent): void => {
    const grip = event.currentTarget as HTMLElement
    if (!grip.hasPointerCapture(event.pointerId)) {
      return
    }
    const step = Math.abs(this.step) || 1
    const unit = event.shiftKey ? (this.largeStep ?? 10) * step : step
    const pitch = event.altKey ? SCRUB_FINE : SCRUB_PITCH
    const steps = Math.round((event.clientX - this.scrubFrom) / pitch)
    const next = String(this.clamp(this.scrubValue + steps * unit))
    /* Compared before it is sent. A drag produces a move event per frame and
       most of them land on the step the value is already on, and announcing
       those would be `Input` firing sixty times a second saying nothing
       changed. */
    if (next === this.value) {
      return
    }
    this.requestValue(next)
    const control = this.control
    if (control) {
      restoreValue(control, this.value)
    }
  }

  /**
   * Let go, and the capture goes with it, and the drag commits.
   *
   * The same reason a step does: every frame of the drag was written by script,
   * so the browser sends no `change` for any of it, and a drag that moved the
   * value is finished when the pointer lets go.
   */
  private readonly handleScrubEnd = (event: PointerEvent): void => {
    const grip = event.currentTarget as HTMLElement
    if (!grip.hasPointerCapture(event.pointerId)) {
      return
    }
    grip.releasePointerCapture(event.pointerId)
    if (this.value !== this.scrubStart) {
      this.announceChange()
    }
  }

  /**
   * Every keystroke, cancelable, and put back where it is refused.
   *
   * Not clamped here. A reader typing "12" is at "1" for one keystroke, and a
   * field with `min="10"` that corrected them at that moment could never be
   * typed into at all. Range is settled on blur, on a step, and at submit.
   */
  private readonly handleInput = (event: Event): void => {
    // Stopped for the reason `Input.handleInput` gives: the inner control's own
    // `input` is composed and would reach a consumer beside this element's.
    event.stopPropagation()
    const control = event.target as HTMLInputElement
    this.requestValue(control.value)
    restoreValue(control, this.value)
  }

  /**
   * Leaving the field is where a half-typed number becomes a number.
   *
   * Blank is left blank, because an empty optional field is a legitimate answer
   * and filling it with `min` would put a number in a form the reader never
   * gave.
   *
   * **And text that is not a number is left alone.** Clearing it means typing
   * `2.7e` and tabbing away empties the field: the reader looks back and their
   * entry is gone with nothing saying why, and the likeliest cause is a fat
   * finger on a number they had almost finished. Nothing is lost by keeping it,
   * because `sync` has already marked it `badInput`, so the field shows as wrong
   * and the form refuses to submit. Destroying the evidence of a mistake is not
   * the same as preventing one.
   */
  private readonly handleBlur = (): void => {
    this.editing = false
    /* A value the reader did not type, written by a script or seeded off the
       grid, is settled here too, and a settled value is a committed one. */
    if (this.settle()) {
      this.announceChange()
    }
  }

  /**
   * Pulls a typed number into range and onto the step grid, and returns
   * whether that moved the value.
   */
  private settle(): boolean {
    const control = this.control
    const parsed = this.numeric
    if (!control || parsed === null) {
      return false
    }
    const before = this.value
    this.requestValue(String(this.clamp(parsed)))
    restoreValue(control, this.value)
    return this.value !== before
  }

  /**
   * Relayed, because `change` does not cross a shadow boundary on its own.
   *
   * **Settled first.** The field's `change` arrives before its `blur`, so
   * relaying it as it came announced the number as typed, 150 in a field whose
   * `max` is 100, and the clamp that followed sent `input` alone: a consumer
   * saving on `change` kept 150 while the form submitted 100.
   */
  private readonly handleChange = (event: Event): void => {
    event.stopPropagation()
    this.settle()
    this.announceChange()
  }

  /**
   * The four keys a spinner answers, which `Input` does not bind.
   *
   * `Home` and `End` only where there is a bound to go to: without one they are
   * the text field's own keys and moving the caret to the start of the number is
   * what a reader pressing them meant.
   */
  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'ArrowUp') {
      this.stepUp()
    } else if (event.key === 'ArrowDown') {
      this.stepDown()
    } else if (event.key === 'PageUp') {
      this.stepUp(true)
    } else if (event.key === 'PageDown') {
      this.stepDown(true)
      /* Guarded the way `nudge` is. A read-only field still receives keydown,
         so an unguarded Home on one with a `min` silently rewrites the value
         that the arrows beside it correctly refuse to touch. */
    } else if (
      event.key === 'Home' &&
      this.min !== undefined &&
      !this.isDisabled &&
      !this.readOnly
    ) {
      this.land(String(this.min))
    } else if (
      event.key === 'End' &&
      this.max !== undefined &&
      !this.isDisabled &&
      !this.readOnly
    ) {
      this.land(String(this.max))
    } else {
      return
    }
    // Or the arrows scroll the page and Home jumps to the top of it.
    event.preventDefault()
  }

  /**
   * Reports the value and a verdict on it.
   *
   * Computed here rather than copied off the field, which is the one place this
   * differs from `Input`: the field is text, so the browser has no opinion about
   * whether it is a number in range. The flags are the platform's own names, so
   * a consumer reading `validity.rangeOverflow` finds what they expect and the
   * message is what a native spinner would have said.
   */
  private sync(): void {
    const control = this.control
    this.internals.setFormValue(this.value)
    if (!control) {
      return
    }
    const parsed = this.numeric
    /* Not while read-only, which the platform exempts from validation: the
       reader cannot fill it, so the form could never be sent. */
    if (this.readOnly) {
      this.internals.setValidity({})
    } else if (this.required && this.value.trim() === '') {
      this.internals.setValidity(
        { valueMissing: true },
        this.valueMissingMessage || 'Please fill in this field.',
        control,
      )
    } else if (this.value.trim() !== '' && parsed === null) {
      this.internals.setValidity(
        { badInput: true },
        this.badInputMessage || 'Please enter a number.',
        control,
      )
    } else if (parsed !== null && this.min !== undefined && parsed < this.min) {
      this.internals.setValidity(
        { rangeUnderflow: true },
        fillTemplate(this.rangeUnderflowMessage || 'Value must be {min} or more.', {
          min: this.min,
        }),
        control,
      )
    } else if (parsed !== null && this.max !== undefined && parsed > this.max) {
      this.internals.setValidity(
        { rangeOverflow: true },
        fillTemplate(this.rangeOverflowMessage || 'Value must be {max} or less.', {
          max: this.max,
        }),
        control,
      )
    } else if (parsed !== null && !this.onStep(parsed)) {
      const step = Math.abs(this.step) || 1
      const anchor = this.min ?? 0
      const below = this.clamp(anchor + Math.floor((parsed - anchor) / step) * step)
      const above = this.clamp(anchor + Math.ceil((parsed - anchor) / step) * step)
      this.internals.setValidity(
        { stepMismatch: true },
        fillTemplate(
          this.stepMismatchMessage ||
            'Please enter a valid value. The two nearest valid values are {below} and {above}.',
          { above, below },
        ),
        control,
      )
    } else {
      this.internals.setValidity({}, '', control)
    }
    // Straight after, because validity moved without any property moving.
    this.refreshFeedback()
  }

  /**
   * Puts the cursor in the field.
   *
   * **No `delegatesFocus`**, because the platform's delegate is the first
   * focusable element, which is the Decrease stepper: a label pressed for the
   * field landed on it, and the arrows then did nothing.
   */
  override focus(options?: FocusOptions): void {
    this.control?.focus(options)
  }

  /** Selects the number, so typing replaces it. */
  select(): void {
    this.control?.select()
  }

  /**
   * The caret, held across a value the consumer wrote rather than the reader.
   *
   * Set in `willUpdate` and spent in `updated`, because Lit's `.value` binding
   * lands between the two and takes the selection with it. See `holdCaret`.
   */
  private releaseCaret: (() => void) | undefined

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    /* Never before the first update, which is the one the server does: there is
       no render root to query there, and `querySelector` is not merely empty on
       Lit's element shim, it is undefined. There is also no caret to keep before
       anything has rendered. */
    if (!this.hasUpdated) {
      return
    }
    const control = this.control
    if (changed.has('value') && control && this.shadowRoot?.activeElement === control) {
      this.releaseCaret = holdCaret(control)
    }
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.releaseCaret?.()
    this.releaseCaret = undefined
    this.sync()
  }

  /**
   * Enter submits the form, as it does in a native text field.
   *
   * On `keypress`, where the platform runs its own implicit submission, so a
   * consumer who prevents the `keydown` for Enter stops this too.
   */
  private readonly handleKeypress = (event: KeyboardEvent): void => {
    if (event.key === 'Enter' && !event.defaultPrevented) {
      this.submitImplicitly()
    }
  }

  /** @internal A single line of text counts against implicit submission. */
  protected override get blocksImplicitSubmission(): boolean {
    return true
  }

  protected override render(): TemplateResult {
    const parsed = this.numeric
    const atMin = parsed !== null && this.min !== undefined && parsed <= this.min
    const atMax = parsed !== null && this.max !== undefined && parsed >= this.max
    return html`${this.renderLabel()}
      <div part="field">
        <button
          part="decrement"
          type="button"
          aria-label=${this.decrementLabel}
          tabindex="-1"
          ?disabled=${this.isDisabled || this.readOnly || atMin}
          @click=${() => this.stepDown()}
        >
          <svg part="decrement-mark" fill="currentColor" viewBox=${minus.viewBox} aria-hidden="true">
            ${unsafeSVG(minus.content)}
          </svg>
        </button>
        <slot name="start"></slot>
        ${
          /* `role="spinbutton"` with the range on it, which is what tells a
             screen reader this is a number in a range rather than a line of
             text. The three `aria-value*` attributes are what the native
             `type=number` would have carried, and they have to be written here
             because the field is text. */
          ''
        }
        <input
          part="control"
          id=${this.controlId}
          .value=${this.shown}
          type="text"
          role=${this.touchApple ? nothing : 'spinbutton'}
          inputmode="decimal"
          autocomplete=${this.autocomplete || nothing}
          name=${this.name || nothing}
          placeholder=${this.placeholder || nothing}
          aria-describedby=${this.describedBy ?? nothing}
          aria-invalid=${this.invalidity ?? nothing}
          aria-valuemin=${this.min ?? nothing}
          aria-valuemax=${this.max ?? nothing}
          aria-valuenow=${parsed ?? nothing}
          aria-valuetext=${
            parsed === null
              ? nothing
              : this.valueText
                ? fillTemplate(this.valueText, {
                    value: this.formatOptions
                      ? formatNumber(parsed, this.locale, this.formatOptions)
                      : this.value,
                  })
                : this.formatOptions
                  ? formatNumber(parsed, this.locale, this.formatOptions)
                  : nothing
          }
          ?disabled=${this.isDisabled}
          ?readonly=${this.readOnly}
          ?required=${this.required}
          @blur=${this.handleBlur}
          @change=${this.handleChange}
          @focus=${this.handleFocus}
          @input=${this.handleInput}
          @keydown=${this.handleKeydown}
          @keypress=${this.handleKeypress}
          @wheel=${this.handleWheel}
        />
        <slot name="end"></slot>
        <button
          part="increment"
          type="button"
          aria-label=${this.incrementLabel}
          tabindex="-1"
          ?disabled=${this.isDisabled || this.readOnly || atMax}
          @click=${() => this.stepUp()}
        >
          <svg part="increment-mark" fill="currentColor" viewBox=${plus.viewBox} aria-hidden="true">
            ${unsafeSVG(plus.content)}
          </svg>
        </button>
      </div>
      ${this.renderHint()}${this.renderFeedback()}`
  }
  /**
   * The value as a number, or `NaN` while the control is empty.
   *
   * `NaN` and not zero, which is the trap the platform already avoids: `Number('')`
   * is zero, so an empty control would report a number it does not hold and a
   * form would submit it.
   */
  get valueAsNumber(): number {
    return asNumber(this.value)
  }

  set valueAsNumber(count: number) {
    this.value = fromNumber(count)
  }
}

/**
 * How many decimal places a number is written with.
 *
 * Read off the string rather than computed, because the question is about how
 * the consumer wrote the step and not about what the binary can represent.
 * `1e-7` is handled separately: its string form has no dot at all, so counting
 * after one would say zero and round every result to a whole number.
 */
const decimals = (value: number): number => {
  const text = String(value)
  const exponent = /e-(\d+)$/.exec(text)
  if (exponent) {
    return Number(exponent[1])
  }
  return (text.split('.')[1] ?? '').length
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-number-input': HelixHeadlessNumberInput
  }
}
