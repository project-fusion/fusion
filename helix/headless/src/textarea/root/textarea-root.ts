import {
  customElement,
  HelixFormElement,
  MixinControllerValue,
  MixinField,
  restoreValue,
} from '@helix-io/core'
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
 * @status experimental
 * @aliases Multiline, TextArea
 * @documentation https://helix.fusion.dev/components/textarea
 *
 * @event {HelixChangeEvent} helix-change - Fired as the text changes, and cancelable.
 * @event {Event} change - Relayed from the textarea once the reader has finished.
 *
 * @csspart field - The box holding the control.
 * @csspart control - The textarea itself.
 */
@customElement('helix-base-textarea')
export class HelixBaseTextarea extends MixinControllerValue(MixinField(HelixFormElement)) {
  /** Whether the box follows its own content rather than scrolling. */
  @property({ attribute: 'auto-grow', reflect: true, type: Boolean })
  autoGrow = false

  /** Shown while the field is empty. Not a label: it goes when typing starts. */
  @property()
  placeholder = ''

  /** Whether the field refuses input while still submitting its value. */
  @property({ attribute: 'read-only', reflect: true, type: Boolean })
  readOnly = false

  /** How many lines the box is before anything is typed. */
  @property({ type: Number })
  rows = 3

  /** Focus is delegated to the control, so the host is never the target. */
  static override shadowRootOptions: ShadowRootInit = {
    ...HelixFormElement.shadowRootOptions,
    delegatesFocus: true,
  }

  private get control(): HTMLTextAreaElement | null {
    return this.renderRoot.querySelector<HTMLTextAreaElement>('[part="control"]')
  }

  /**
   * Every keystroke, cancelable, and put back where it is refused.
   *
   * The control has already taken the character by the time this runs, so
   * refusing has to restore it, or what is on screen and what the form would
   * submit disagree.
   */
  private readonly handleInput = (event: Event): void => {
    const control = event.target as HTMLTextAreaElement
    const next = control.value
    /* Through the mixin, which announces and then applies only if the value is
       the element's to move. The native control has already changed either way,
       so wherever the answer does not follow it has to be put back: that is a
       refusal, and it is equally a consumer who owns the value and has not
       given a new one yet. Both are "what is on screen is not the answer". */
    this.requestValue(next)
    restoreValue(control, this.value)
    this.grow()
  }

  /** Relayed, because `change` does not cross a shadow boundary on its own. */
  private readonly handleChange = (event: Event): void => {
    event.stopPropagation()
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
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
     * as zero, and this wrote that straight back as a fixed `block-size`. The
     * field then had a real inline height of zero pixels and stayed there:
     * every later call measured a control pinned to zero and measured zero
     * again. A textarea inside a tab panel, an accordion, or anything else that
     * renders shut and opens later came out as a hairline with the text hidden
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
   * The height was computed on Lit updates alone, and nothing about a container
   * narrowing, a font swapping, or the field finally gaining a layout box is a
   * property change here. A field that wrapped to three lines at one width kept
   * a three-line height at half the width and clipped the rest behind
   * `overflow: hidden`, with no way for a reader to reach it.
   *
   * Observing the control also covers the zero case above from the other side:
   * a `ResizeObserver` fires when an element gains a box, so a field that was
   * hidden when it first tried to grow measures itself the moment it is shown.
   */
  private resize: ResizeObserver | undefined

  /** Puts the caret in the field, the way a label pointing at one would. */
  override focus(options?: FocusOptions): void {
    this.control?.focus(options)
  }

  /** Reports the value and the validity the host stands behind. */
  private sync(): void {
    this.internals.setFormValue(this.value)
    const control = this.control
    if (!control) {
      return
    }
    // The platform's verdict, copied rather than recomputed, with the control as
    // the anchor so a validity bubble points at the text and not at the host.
    this.internals.setValidity(control.validity, control.validationMessage, control)
    this.refreshFeedback()
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.resize?.disconnect()
    this.resize = undefined
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    const control = this.control
    if (control) {
      this.resize = new ResizeObserver(() => this.grow())
      this.resize.observe(control)
    }
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.sync()
    this.grow()
  }

  protected override render(): TemplateResult {
    return html`${this.renderLabel()}
    <div part="field">
      <textarea
        part="control"
        id="control"
        .value=${this.value}
        rows=${this.rows}
        name=${this.name || nothing}
        placeholder=${this.placeholder || nothing}
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
    'helix-base-textarea': HelixBaseTextarea
  }
}
