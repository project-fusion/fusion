import {
  customElement,
  HelixFormElement,
  holdCaret,
  MixinControllerValue,
  MixinField,
  restoreValue,
} from '@helix-io/core'
import { minus, plus } from '@helix-io/icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
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
 * @summary A number a reader types or steps to.
 *
 * @description
 * **A family rather than `Input`'s `type="number"`, and rather than a part of
 * it.** `Input` already takes that type and will keep it: a bare numeric field
 * in a form is a text field with a different keyboard, and that is all it needs
 * to be. This is a different control. It renders two buttons, binds four keys
 * that `Input` does not, and owns clamping and stepping, so it is an alternative
 * and not a variant. Namespacing it under `Input` would say it is contained by
 * one, which is what `IconButton` is top-level for.
 *
 * **The field is `type="text"` with `inputmode="decimal"`, and that is a
 * measurement rather than a preference.** Asked of a real browser, `type=number`
 * fails three ways this control cannot live with:
 *
 * ```
 * typed "12e" into type=number  → .value === ""
 * focused, wheeled over it      → 5 became 4
 * selectionStart on type=number → null
 * same keystrokes into type=text → .value === "12e"
 * ```
 *
 * The first is fatal on its own: the element cannot see what the reader typed,
 * so a controlled value is destroyed by a keystroke and there is nothing left to
 * correct or to report. The second changes a value because a page scrolled past.
 * The third means the caret cannot be managed at all, which any correcting or
 * formatting field needs. `inputmode` is what keeps the phone keypad, which is
 * the one thing `type=number` was giving.
 *
 * Validity is still the platform's, through `min`, `max` and `step` mirrored
 * onto the host's own `setValidity`. What is not mirrored is the field's
 * `type`, because a text field has no opinion about numbers.
 *
 * **Stepping is separate from typing.** A reader mid-way through "1" of "12"
 * has not asked for anything to be clamped, so the value is only pulled into
 * range when they step, blur, or the form asks. Clamping on every keystroke is
 * what makes a field that cannot be typed backwards into.
 *
 * @since 0.1.0
 * @status experimental
 * @category forms
 * @aliases NumberField, Stepper, InputNumber
 * @documentation https://helix.fusion.dev/components/number-input
 *
 * @slot start - Before the number, for a unit or an icon.
 * @slot end - After it.
 *
 * @event {HelixInputEvent} helix-input - Fired as the value changes, and cancelable.
 * @event {Event} change - Relayed from the field once the reader has finished.
 *
 * @csspart control - The field itself.
 * @csspart decrement - The control that steps down.
 * @csspart decrement-mark - The glyph on the step down control.
 * @csspart field - The box holding everything.
 * @csspart increment - The control that steps up.
 * @csspart increment-mark - The glyph on the step up control.
 * @csspart label - The name over the field, which is also the scrub grip.
 */
@customElement('helix-base-number-input')
export class HelixBaseNumberInput extends MixinControllerValue(MixinField(HelixFormElement)) {
  /** Typed or dragged, so every edit is announced. See `announcesInput`. */
  protected override readonly announcesInput = true

  /** Smallest value the reader may reach. Absent has no floor. */
  @property({ type: Number })
  min?: number

  /** Largest value the reader may reach. Absent has no ceiling. */
  @property({ type: Number })
  max?: number

  /** How far one step moves. */
  @property({ type: Number })
  step = 1

  /**
   * How far `PageUp` and `PageDown` move.
   *
   * Ten steps, which is the convention every spinner on the platform follows,
   * and a property because ten of a step of `0.01` is a hundredth and rarely
   * what a reader wants from a whole key.
   */
  @property({ attribute: 'large-step', type: Number })
  largeStep?: number

  /** Shown while the field is empty. Not a label: it goes when typing starts. */
  @property()
  placeholder = ''

  /** Whether the field refuses input while still submitting its value. */
  @property({ attribute: 'read-only', reflect: true, type: Boolean })
  readOnly = false

  /**
   * Whether a grip is shown that changes the value when it is dragged.
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

  /** Accessible name for the control that steps down. */
  @property({ attribute: 'decrement-label' })
  decrementLabel = 'Decrease'

  /** Accessible name for the control that steps up. */
  @property({ attribute: 'increment-label' })
  incrementLabel = 'Increase'

  /** Focus is delegated to the field, so the host is never the focus target. */
  static override shadowRootOptions: ShadowRootInit = {
    ...HelixFormElement.shadowRootOptions,
    delegatesFocus: true,
  }

  private get control(): HTMLInputElement | null {
    return this.renderRoot.querySelector<HTMLInputElement>('[part="control"]')
  }

  /** The value as a number, or `null` where the field holds nothing usable. */
  private get numeric(): number | null {
    if (this.value.trim() === '') {
      return null
    }
    const parsed = Number(this.value)
    return Number.isFinite(parsed) ? parsed : null
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
    /* Decimal places from the step and the anchor together: a step of 0.25 from
       an anchor of 0.1 lands on 0.35, which needs two rather than the two the
       step alone would give by luck. */
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
    this.requestValue(String(next))
    const control = this.control
    if (control) {
      restoreValue(control, this.value)
    }
  }

  /** One step up, or `PageUp`'s larger one. */
  stepUp(large = false): void {
    this.nudge(large ? (this.largeStep ?? 10) : 1)
  }

  /** One step down. */
  stepDown(large = false): void {
    this.nudge(large ? -(this.largeStep ?? 10) : -1)
  }

  /**
   * The label is the surface, which is where the convention already is.
   *
   * A grip was drawn first, an icon of its own at the leading edge, and it was
   * a second control in a field that already has three. Every tool that does
   * this well drags the *name* of the value: the label is present on every
   * field, costs no chrome, and a reader who wants to know what they are
   * dragging is already looking at it.
   *
   * Overridden rather than handled on the host, because the handlers have to
   * sit on the element that takes the capture. The markup is the mixin's, said
   * again here, which is the duplication #76 exists to remove: when base
   * renders break into methods a styled tier can extend, this becomes a call to
   * `super` with three listeners added.
   *
   * A label with nothing in it is still nothing. `scrub` on a field whose label
   * is empty leaves no surface, which is honest: there is nowhere to put the
   * gesture and inventing somewhere is how the grip happened.
   */
  protected override renderLabel(): TemplateResult | typeof nothing {
    if (!this.scrub) {
      return super.renderLabel()
    }
    const hidden = this.label === '' ? this.getAttribute('aria-label') : null
    if (this.label === '' && !hidden) {
      return nothing
    }
    return html`<label
      part="label"
      for="control"
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
       those would be `helix-input` firing sixty times a second saying nothing
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

  /** Let go, and the capture goes with it. */
  private readonly handleScrubEnd = (event: PointerEvent): void => {
    const grip = event.currentTarget as HTMLElement
    if (grip.hasPointerCapture(event.pointerId)) {
      grip.releasePointerCapture(event.pointerId)
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
   * **And text that is not a number is left alone, which this cleared at
   * first.** Typing `2.7e` and tabbing away emptied the field: the reader looks
   * back and their entry is gone with nothing saying why, and the likeliest
   * cause is a fat finger on a number they had almost finished. Nothing is lost
   * by keeping it, because `sync` has already marked it `badInput`, so the field
   * shows as wrong and the form refuses to submit. Destroying the evidence of a
   * mistake is not the same as preventing one.
   */
  private readonly handleBlur = (): void => {
    const control = this.control
    const parsed = this.numeric
    if (!control || parsed === null) {
      return
    }
    this.requestValue(String(this.clamp(parsed)))
    restoreValue(control, this.value)
  }

  /** Relayed, because `change` does not cross a shadow boundary on its own. */
  private readonly handleChange = (event: Event): void => {
    event.stopPropagation()
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
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
         so Home on one with a `min` silently rewrote the value that the arrows
         beside it correctly refused to touch. */
    } else if (
      event.key === 'Home' &&
      this.min !== undefined &&
      !this.isDisabled &&
      !this.readOnly
    ) {
      this.requestValue(String(this.min))
    } else if (
      event.key === 'End' &&
      this.max !== undefined &&
      !this.isDisabled &&
      !this.readOnly
    ) {
      this.requestValue(String(this.max))
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
    if (this.required && this.value.trim() === '') {
      this.internals.setValidity({ valueMissing: true }, 'Please fill in this field.', control)
    } else if (this.value.trim() !== '' && parsed === null) {
      this.internals.setValidity({ badInput: true }, 'Please enter a number.', control)
    } else if (parsed !== null && this.min !== undefined && parsed < this.min) {
      this.internals.setValidity(
        { rangeUnderflow: true },
        `Value must be ${this.min} or more.`,
        control,
      )
    } else if (parsed !== null && this.max !== undefined && parsed > this.max) {
      this.internals.setValidity(
        { rangeOverflow: true },
        `Value must be ${this.max} or less.`,
        control,
      )
    } else {
      this.internals.setValidity({}, '', control)
    }
    // Straight after, because validity moved without any property moving.
    this.refreshFeedback()
  }

  /** Puts the caret in the field, the way a label pointing at one would. */
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
          id="control"
          .value=${this.value}
          type="text"
          role="spinbutton"
          inputmode="decimal"
          autocomplete="off"
          name=${this.name || nothing}
          placeholder=${this.placeholder || nothing}
          aria-describedby=${this.describedBy ?? nothing}
          aria-valuemin=${this.min ?? nothing}
          aria-valuemax=${this.max ?? nothing}
          aria-valuenow=${parsed ?? nothing}
          ?disabled=${this.isDisabled}
          ?readonly=${this.readOnly}
          ?required=${this.required}
          @blur=${this.handleBlur}
          @change=${this.handleChange}
          @input=${this.handleInput}
          @keydown=${this.handleKeydown}
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
    'helix-base-number-input': HelixBaseNumberInput
  }
}
