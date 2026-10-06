import {
  AriaForwardController,
  customElement,
  drawIcon,
  HelixClearEvent,
  HelixFormElement,
  holdCaret,
  isRtl,
  MixinControllerValue,
  MixinField,
  restoreValue,
} from '@fusion.dev/helix-core'
import { x } from '@fusion.dev/helix-icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { grownHeight, lineMetrics } from '../grow.js'

/**
 * @summary A multi-line text field.
 *
 * @description
 * Renders a `<textarea>`, so the caret, selection, spellcheck, resize handle,
 * and phone keyboard come from the platform. It is in the server markup, so the
 * field works before any script loads.
 *
 * It is a separate element from `Input` because Enter inserts a line break
 * here. In a single-line field, Enter submits the form.
 *
 * `rows` sets the starting height, and `auto-grow` makes the field grow with
 * its content. You can use both: `rows` sets where an empty field begins.
 * `max-rows` stops the growth at that many lines, and the field scrolls past
 * them.
 *
 * `clearable` draws a button that empties the field while it holds text, and
 * sends `helix-clear`, as `Input` does. `validate` adds your own rule, run on
 * every change once the browser finds nothing wrong, as React Aria's
 * TextField `validate` does.
 *
 * **Keyboard.** The field's own keys are the platform's, and Enter starts a
 * new line. The clear button under `clearable` is a tab stop of its own after
 * the field.
 *
 * The inner textarea is named by `label`, or by a host `aria-label`,
 * `aria-labelledby` or `<label for>`, and is described by the hint and the
 * message, with `aria-invalid` while a message shows. The clear button is
 * named `clear-label`.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @aliases Multiline, TextArea
 * @documentation https://fusion.dev/helix/components/textarea
 *
 * @slot clear-icon - Replaces the cross on the clear button, under `clearable`.
 * @slot end - After the text, for an icon or an action beside it.
 * @slot feedback - The message that says what is wrong, for content richer than a string. It shows while there is a message.
 * @slot hint - Help under the control, for content richer than the `hint` text.
 * @slot label - The label, for content richer than the `label` text.
 * @slot start - Before the text, for an icon.
 *
 * @event {Event} change - Sent from the textarea when the user finishes an edit.
 * @event {HelixBeforeChangeEvent} helix-before-change - Fired as the text changes, and cancelable.
 * @event {HelixClearEvent} helix-clear - Fired after the clear button has emptied the field, after `input` and `change`.
 * @event {Event} input - Fired after the value changes.
 *
 * @csspart clear - The button that empties the field, under `clearable`.
 * @csspart control - The textarea itself.
 * @csspart feedback - The message that says what is wrong.
 * @csspart field - The box that holds the textarea.
 * @csspart hint - Help under the field, while nothing is wrong.
 * @csspart label - The label above the field.
 *
 * @cssstate blank - The field holds no text.
 * @cssstate invalid - The control has an error to show, from the browser's validation, `validate`, or your `feedback`.
 */
@customElement('helix-headless-textarea')
export class HelixHeadlessTextarea extends MixinControllerValue(MixinField(HelixFormElement)) {
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
   * What the browser can autofill in the field, as a standard `autocomplete`
   * token.
   *
   * Empty leaves the attribute off, which is the browser's default. Set it to
   * a token like `email` or `bday` to ask for autofill, or to `off` to refuse.
   */
  @property()
  autocomplete = ''

  /**
   * Grows the box to fit its content, so it does not scroll.
   */
  @property({ attribute: 'auto-grow', reflect: true, type: Boolean })
  autoGrow = false

  /**
   * Draws a button that empties the field while it holds text.
   */
  @property({ type: Boolean })
  clearable = false

  /**
   * The accessible name of the clear button, which shows only an icon.
   */
  @property({ attribute: 'clear-label' })
  clearLabel = 'Clear'

  /**
   * How many characters wide the box is, when the layout does not set its
   * width.
   *
   * Optional and absent by default, which is the reflected-property rule: a
   * `<textarea>` left alone is 20 columns wide and a styled one is whatever its
   * box says, so writing a number here is a departure rather than the resting
   * state. `wrap="hard"` needs it, the two being the pair that decides where
   * the browser inserts the line breaks it submits.
   */
  @property({ type: Number })
  cols?: number

  /**
   * The name of a second form entry that submits the direction of the text.
   *
   * **Submitted through `setFormValue`, because the inner control's own
   * `dirname` cannot reach the form.** This host is form-associated and reports
   * its value itself, so the `<textarea>` inside the shadow root participates in
   * no form at all and forwarding the attribute would have looked right and
   * submitted nothing. `ElementInternals` takes a `FormData`, which is how one
   * element sends two entries, and that is what this does.
   */
  @property({ attribute: 'dirname' })
  dirName = ''

  /**
   * The most characters the value can have.
   */
  @property({ attribute: 'maxlength', type: Number })
  maxLength?: number

  /**
   * How many lines an `auto-grow` field grows to before it scrolls. Absent,
   * it grows with all of its text.
   */
  @property({ attribute: 'max-rows', type: Number })
  maxRows?: number

  /**
   * The fewest characters the value can have.
   *
   * Forwarded to the real `<textarea>` rather than checked here, which is what
   * makes the message the browser's and therefore the reader's own language.
   * No `pattern`: the platform does not give a textarea one, and inventing it
   * would be this library guessing where the point is to stop guessing.
   */
  @property({ attribute: 'minlength', type: Number })
  minLength?: number

  /**
   * Text shown while the field is empty.
   *
   * Not a label: it goes when typing starts.
   */
  @property()
  placeholder = ''

  /**
   * Blocks typing in the field. The value is still submitted with the form.
   */
  @property({ attribute: 'readonly', reflect: true, type: Boolean })
  readOnly = false

  /** Focus is delegated to the control, so the host is never the target. */
  static override shadowRootOptions: ShadowRootInit = {
    ...HelixFormElement.shadowRootOptions,
    delegatesFocus: true,
  }

  private get control(): HTMLTextAreaElement | null {
    return this.partNamed<HTMLTextAreaElement>('control')
  }

  /**
   * Every keystroke, cancelable, and put back where it is refused.
   *
   * The control has already taken the character by the time this runs, so
   * refusing has to restore it, or what is on screen and what the form would
   * submit disagree.
   */
  private readonly handleInput = (event: Event): void => {
    // Stopped for the reason `Input.handleInput` gives: the inner control's own
    // `input` is composed and would reach a consumer beside this element's.
    event.stopPropagation()
    const control = event.target as HTMLTextAreaElement
    const next = control.value
    /* Through the mixin, which announces and then applies only if the value is
       the element's to move. The native control has already changed either way,
       so wherever the answer does not follow it has to be put back. */
    this.requestValue(next)
    restoreValue(control, this.value)
    this.grow()
  }

  /** Relayed, because `change` does not cross a shadow boundary on its own. */
  private readonly handleChange = (event: Event): void => {
    event.stopPropagation()
    this.announceChange()
  }

  /**
   * Follows the content, by measuring rather than by counting.
   *
   * `scrollHeight` is what the text actually needs, which no arithmetic over
   * line count and line height gets right: a wrapped line, a pasted paragraph
   * and a font that has not loaded yet all break the arithmetic and none of
   * them break the measurement.
   *
   * Reset to `auto` first, because `scrollHeight` of an element already sized to
   * its content is that size, so without the reset the box can only ever grow.
   */
  private grow(): void {
    const control = this.control
    if (!this.autoGrow || !control) {
      return
    }
    control.style.blockSize = 'auto'
    /* Zero is not a height, it is the absence of a layout box.
     *
     * An element with `display: none` anywhere above it reports `scrollHeight`
     * as zero. Written back as a fixed `block-size` it pins the field there,
     * since every later call then measures a control at zero and measures zero
     * again: a textarea inside a tab panel, an accordion, or anything else that
     * renders shut and opens later comes out as a hairline with the text hidden
     * behind it. `tabs-root` refuses zero for the same reason.
     *
     * The reset to `auto` above has already been written by this point, which
     * is the right state to leave it in: an ungrown auto-grow field is the
     * browser's own height, not a stale number from the last time it had one. */
    const next = control.scrollHeight
    if (next === 0) {
      return
    }
    /* Held to `max-rows`, measured from the box's own line height, and allowed
       to scroll past it. Inline, so it wins over a sheet's `overflow: hidden`
       for a growing field, which is there for the uncapped case. */
    const grown = grownHeight(next, this.maxRows, lineMetrics(getComputedStyle(control)))
    control.style.blockSize = `${grown.height}px`
    control.style.overflowY = grown.scrolls ? 'auto' : ''
  }

  /**
   * Re-measures when the box changes rather than only when a property does.
   *
   * Nothing about a container narrowing, a font swapping, or the field finally
   * gaining a layout box is a property change here, so on Lit updates alone a
   * field that wrapped to three lines at one width keeps that three-line height
   * at half the width and clips the rest behind `overflow: hidden`, with no way
   * for a reader to reach it.
   *
   * Observing the control also covers the zero case above from the other side:
   * a `ResizeObserver` fires when an element gains a box, so a field that was
   * hidden when it first tried to grow measures itself the moment it is shown.
   */
  private resize: ResizeObserver | undefined

  /**
   * What the form receives, which is two entries where `dirName` asks for it.
   *
   * A plain string otherwise, because that is the common case and a `FormData`
   * of one entry says the same thing at more cost. The direction is read off
   * the control rather than assumed, so a field a consumer set `dir="rtl"` on,
   * or one inside an RTL document, submits what the reader actually saw.
   */
  private formValue(): FormData | string {
    const control = this.control
    if (!this.dirName || !this.name || !control) {
      return this.value
    }
    const data = new FormData()
    data.append(this.name, this.value)
    data.append(this.dirName, isRtl(control) ? 'rtl' : 'ltr')
    return data
  }

  /**
   * The direction of the selection, as a native textarea reports it.
   *
   * **The whole reason this renders a real `<textarea>` is the caret**, and the
   * control is inside this shadow root, so `querySelector` does not find it and
   * a consumer has no other way to ask where the selection is, let alone move
   * it. A field that cannot be scripted at the caret cannot do an
   * insert-at-cursor toolbar, which is the first thing anybody builds on a
   * textarea.
   *
   * Written through to the control, and answering zero before there is one,
   * which is where an empty field's caret would be anyway.
   */
  get selectionDirection(): SelectionDirection {
    return this.control?.selectionDirection ?? 'none'
  }

  set selectionDirection(direction: SelectionDirection) {
    const control = this.control
    if (control) {
      control.selectionDirection = direction
    }
  }

  /** Where the selection ends, as an offset into the value. */
  get selectionEnd(): number {
    return this.control?.selectionEnd ?? 0
  }

  set selectionEnd(at: number) {
    const control = this.control
    if (control) {
      control.selectionEnd = at
    }
  }

  /** Where the selection starts, as an offset into the value. */
  get selectionStart(): number {
    return this.control?.selectionStart ?? 0
  }

  set selectionStart(at: number) {
    const control = this.control
    if (control) {
      control.selectionStart = at
    }
  }

  /**
   * Selects a range of text, which the three selection properties cannot do
   * between them.
   *
   * Setting `selectionStart` past the current `selectionEnd` drags the end
   * along, so the two writes a consumer would make in sequence do not compose
   * into the range they asked for. The platform has this method for that reason
   * and so does this.
   */
  setSelectionRange(start: number, end: number, direction?: SelectionDirection): void {
    this.control?.setSelectionRange(start, end, direction)
  }

  /** How many characters the value holds. */
  get textLength(): number {
    return this.value.length
  }

  /** The control's type, which is always `textarea`. */
  get type(): string {
    return 'textarea'
  }

  /** Puts the caret in the field, as a label pointing at it would. */
  override focus(options?: FocusOptions): void {
    this.control?.focus(options)
  }

  /** Reports the value and the validity the host stands behind. */
  private sync(): void {
    /* The text as the restore state, because with `dirName` the value is a
       `FormData`, and the browser saves what it is given: a restored form
       handed that back, which the restore cannot read, and the field came back
       empty. */
    this.internals.setFormValue(this.formValue(), this.value)
    const control = this.control
    if (!control) {
      return
    }
    // The platform's verdict, copied rather than recomputed, with the control as
    // the anchor so a validity bubble points at the text and not at the host.
    this.copyValidity(control)
    const own = control.validity.valid ? this.validate?.(this.value) : undefined
    const message = Array.isArray(own) ? own.join(' ') : typeof own === 'string' ? own : ''
    if (message !== '') {
      this.internals.setValidity({ customError: true }, message, control)
    }
    this.refreshFeedback()
  }

  /**
   * Empties the field and puts the caret back in it, through `requestValue`,
   * so a consumer who owns the value can refuse. `Input` clears the same way.
   */
  private readonly handleClear = (): void => {
    if (this.value !== '' && this.requestValue('')) {
      this.announceChange()
      this.dispatchEvent(new HelixClearEvent())
    }
    const control = this.control
    if (control) {
      restoreValue(control, this.value)
      control.focus()
    }
  }

  /* Rebuilt on reconnection, because nothing else does it.
   *
   * `firstUpdated` runs once for the life of the element and
   * `disconnectedCallback` runs every time it moves, so without this a
   * framework reordering a list leaves the observer gone with nothing to
   * rebuild it. Guarded on `hasUpdated`, because the first connection happens
   * before the first render and there is nothing to watch yet. */
  override connectedCallback(): void {
    super.connectedCallback()
    if (this.hasUpdated) {
      this.watchControl()
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.resize?.disconnect()
    this.resize = undefined
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.watchControl()
  }

  /** Watches the control so the box grows with what is typed into it. */
  private watchControl(): void {
    const control = this.control
    if (!control) {
      return
    }
    this.resize?.disconnect()
    this.resize = new ResizeObserver(() => this.grow())
    this.resize.observe(control)
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
    this.toggleState('blank', this.value === '')
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
    this.grow()
  }

  /**
   * How many lines the box is before anything is typed.
   */
  @property({ type: Number })
  rows = 3

  /**
   * Your own rule for the value, run on every change once the browser finds
   * nothing wrong. Return a message, or a list of them, to mark the field
   * invalid, and `true`, `null`, or nothing to accept the value.
   */
  @property({ attribute: false })
  validate?: (value: string) => string | string[] | true | null | undefined

  /**
   * How the browser wraps the text, and whether the breaks are submitted with
   * it.
   */
  @property()
  wrap: 'hard' | 'off' | 'soft' = 'soft'

  /** The cross on the clear button, behind a seam a tier can move. */
  protected renderClearIcon(): TemplateResult {
    return html`<slot name="clear-icon">${drawIcon(x)}</slot>`
  }

  protected override render(): TemplateResult {
    return html`${this.renderLabel()}
    <div part="field">
      <slot name="start"></slot>
      <textarea
        part="control"
        id=${this.controlId}
        .value=${this.value}
        rows=${this.rows}
        cols=${this.cols ?? nothing}
        wrap=${this.wrap}
        name=${this.name || nothing}
        placeholder=${this.placeholder || nothing}
        autocomplete=${this.autocomplete || nothing}
        minlength=${this.minLength ?? nothing}
        maxlength=${this.maxLength ?? nothing}
        aria-describedby=${this.describedBy ?? nothing}
        aria-invalid=${this.invalidity ?? nothing}
        ?disabled=${this.isDisabled}
        ?readonly=${this.readOnly}
        ?required=${this.required}
        @input=${this.handleInput}
        @change=${this.handleChange}
      ></textarea>
      <slot name="end"></slot>
      ${
        this.clearable && this.value !== '' && !this.isDisabled && !this.readOnly
          ? html`<button
              part="clear"
              type="button"
              aria-label=${this.clearLabel}
              @click=${this.handleClear}
            >
              ${this.renderClearIcon()}
            </button>`
          : nothing
      }
    </div>
    ${this.renderHint()}${this.renderFeedback()}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-textarea': HelixHeadlessTextarea
  }
}
