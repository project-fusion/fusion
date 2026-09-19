import {
  AriaForwardController,
  customElement,
  HelixFormElement,
  holdCaret,
  isRtl,
  MixinControllerValue,
  MixinField,
  restoreValue,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary Several lines of text a reader types into.
 *
 * @description
 * A real `<textarea>`, so the caret, the selection, spellcheck, the resize
 * handle and the keyboard a phone chooses are all the platform's, and it
 * serializes into the server's markup so the field is usable before any script
 * loads.
 *
 * **Not an Input with a taller box.** The difference is the Enter key: in a
 * single-line field it submits the form, and here it inserts a line. That is a
 * behavioral difference the platform owns and cannot be styled into existence,
 * which is why this is its own element rather than `Input` with a property.
 *
 * `rows` sets the height it starts at, and `auto-grow` lets it follow its own
 * content. They are not alternatives: `rows` is where an empty field begins and
 * `auto-grow` is what happens after, so a field that grows still has to start
 * somewhere.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @aliases Multiline, TextArea
 * @documentation https://fusion.dev/helix/components/textarea
 *
 * @event {Event} change - Relayed from the textarea once the reader has finished.
 * @event {HelixBeforeChangeEvent} helix-before-change - Fired as the text changes, and cancelable.
 * @event {Event} input - Announced once the value has moved.
 *
 * @csspart control - The textarea itself.
 * @csspart feedback - What is wrong with it.
 * @csspart field - The box holding the control.
 * @csspart hint - Help under the field, while nothing is wrong.
 * @csspart label - The question, over the field.
 *
 * @cssstate invalid - While there is feedback to show: the platform's verdict, or the consumer's `feedback`.
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
   * What the browser may autofill here, as one of the platform's own tokens.
   *
   * Empty leaves the attribute off, which is the browser's default. Set it to
   * a token like `email` or `bday` to ask for autofill, or to `off` to refuse.
   */
  @property()
  autocomplete = ''

  /**
   * Whether the box follows its own content rather than scrolling.
   */
  @property({ attribute: 'auto-grow', reflect: true, type: Boolean })
  autoGrow = false

  /**
   * How many characters wide the box is, where the layout is not deciding.
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
   * The name a second entry carries, holding which way the text runs.
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
   * Most characters the value may have.
   */
  @property({ attribute: 'maxlength', type: Number })
  maxLength?: number

  /**
   * Fewest characters the value may have.
   *
   * Forwarded to the real `<textarea>` rather than checked here, which is what
   * makes the message the browser's and therefore the reader's own language.
   * No `pattern`: the platform does not give a textarea one, and inventing it
   * would be this library guessing where the point is to stop guessing.
   */
  @property({ attribute: 'minlength', type: Number })
  minLength?: number

  /**
   * Shown while the field is empty.
   *
   * Not a label: it goes when typing starts.
   */
  @property()
  placeholder = ''

  /**
   * Whether the field refuses input while still submitting its value.
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
    control.style.blockSize = `${next}px`
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
   * The caret and the selection, under the platform's own names.
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
   * Selects a range, which is the one operation the three accessors above
   * cannot express between them.
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

  /** What kind of control this is, which for a textarea is always the one word. */
  get type(): string {
    return 'textarea'
  }

  /** Puts the caret in the field, the way a label pointing at one would. */
  override focus(options?: FocusOptions): void {
    this.control?.focus(options)
  }

  /** Reports the value and the validity the host stands behind. */
  private sync(): void {
    this.internals.setFormValue(this.formValue())
    const control = this.control
    if (!control) {
      return
    }
    // The platform's verdict, copied rather than recomputed, with the control as
    // the anchor so a validity bubble points at the text and not at the host.
    this.internals.setValidity(control.validity, control.validationMessage, control)
    this.refreshFeedback()
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
   * How the browser wraps the text, and whether the breaks are submitted with
   * it.
   */
  @property()
  wrap: 'hard' | 'off' | 'soft' = 'soft'

  protected override render(): TemplateResult {
    return html`${this.renderLabel()}
    <div part="field">
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
        ?disabled=${this.isDisabled}
        ?readonly=${this.readOnly}
        ?required=${this.required}
        @input=${this.handleInput}
        @change=${this.handleChange}
      ></textarea>
    </div>
    ${this.renderHint()}${this.renderFeedback()}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-textarea': HelixHeadlessTextarea
  }
}
