import { customElement, HelixFormElement, MixinControllerChecked, MixinField } from '@helix-io/core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary A box that is ticked, or not, or neither.
 *
 * @description
 * Renders a real `<input type="checkbox">`, so the space key, the focus ring,
 * and the indeterminate glyph come from the platform. `delegatesFocus` puts
 * focus on it, and it serializes into the server's markup, so the control is
 * reachable before any script loads.
 *
 * **The input inside a shadow root submits nothing**, because the form is on
 * the other side of the boundary. The host is form-associated instead and
 * reports its own value through `ElementInternals`, which is also what carries
 * validity and what answers a form reset.
 *
 * A checked box submits its `value`, and an unchecked one submits nothing at
 * all. That is what a native checkbox does, and a form built around one reads
 * the absence rather than a `false`.
 *
 * `indeterminate` is presentation and nothing else. It is neither checked nor
 * unchecked to a reader, it never submits, and the first click resolves it: a
 * third state that survives interaction is a control nobody can finish.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Tickbox, Toggle
 * @documentation https://helix.fusion.dev/components/checkbox
 *
 * @slot - The label.
 *
 * @event {HelixChangeEvent} helix-change - Fired before the state changes, and cancelable.
 * @event {Event} change - Relayed from the input once the state has changed.
 *
 * @csspart control - The input.
 * @csspart label - The label beside it.
 */
@customElement('helix-base-checkbox')
export class HelixBaseCheckbox extends MixinControllerChecked(MixinField(HelixFormElement)) {
  /** Name submitted with the form. */
  @property()
  name = ''

  /** Value submitted when the box is checked. */
  @property()
  value = 'on'

  /**
   * Whether the box shows as neither checked nor unchecked.
   *
   * Presentation only. It never submits, and the first change resolves it.
   */
  @property({ reflect: true, type: Boolean })
  indeterminate = false

  /** Focus is delegated to the input, so the host is never the focus target. */
  static override shadowRootOptions: ShadowRootInit = {
    ...HelixFormElement.shadowRootOptions,
    delegatesFocus: true,
  }

  private readonly handleChange = (event: Event): void => {
    const input = event.target as HTMLInputElement
    // The input has already flipped itself. Where the change is refused, or the
    // element is controlled, it is put back to whatever the element resolves
    // to, so the box never shows a state the element does not hold.
    const next = input.checked
    this.indeterminate = false
    this.requestChecked(next)
    input.checked = this.isChecked
    this.relayNativeEvent(event)
  }

  /** Reports the value and the validity the host stands behind. */
  private sync(): void {
    this.internals.setFormValue(this.isChecked ? this.value : null)
    if (this.required && !this.isChecked) {
      this.internals.setValidity(
        { valueMissing: true },
        'Tick this box to continue.',
        this.renderRoot.querySelector<HTMLElement>('[part="control"]') ?? undefined,
      )
    } else {
      this.internals.setValidity({})
    }
  }

  /** Returns the box to the state its markup declared. */
  formResetCallback(): void {
    this.checked = undefined
    this.indeterminate = false
    this.resetChecked()
  }

  /** Restores the box when the browser brings a form back. */
  formStateRestoreCallback(state: string | null): void {
    this.checked = state !== null
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    this.internals.ariaRequired = this.required ? 'true' : null
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.sync()
  }

  protected override render(): TemplateResult {
    /* A real `<label>` around both, which is the whole of what makes the text a
       target. It was a `<span>` beside the input, so pressing the words did
       nothing: the styled tier's own description claimed the pair behaved like
       a native label wrapping a checkbox, and nothing was doing that work.

       Labelling is behaviour, which is what earns an element here rather than a
       bare slot: the wrapper is not decoration and there is no other way to get
       it. The browser handles the forwarding, so there is no click handler to
       write and none to get wrong.
 
       Both descriptions go under that row, unlike a field where the caption
       goes above the control. There is no above here: the box and the words
       naming it are one line, so a caption between them would come between a
       label and the thing it labels. */
    return html`<label part="field">
      <input
        part="control"
        type="checkbox"
        .checked=${this.isChecked}
        .indeterminate=${this.indeterminate}
        ?disabled=${this.disabled}
        ?required=${this.required}
        aria-describedby=${this.describedBy ?? nothing}
        @change=${this.handleChange}
      />
      <span part="label"><slot>${this.label}</slot></span>
    </label>
    ${this.renderCaption()}${this.renderFeedback()}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-checkbox': HelixBaseCheckbox
  }
}
