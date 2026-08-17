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
 * @csspart field - The row the box and its label share, and the surface the card appearance draws.
 * @csspart box - The frame the input is painted as, and the mark sits over.
 * @csspart control - The input.
 * @csspart label - The label beside it.
 * @csspart mark - The tick, or the dash when the box is indeterminate.
 */
@customElement('helix-base-checkbox')
export class HelixBaseCheckbox extends MixinControllerChecked(MixinField(HelixFormElement)) {
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
    /* The dash goes only where the change is taken.
     *
     * It was cleared first and unconditionally, so a consumer calling
     * `preventDefault()` on the change kept the checked state and lost the
     * third one: the box came back neither ticked nor dashed, which is a state
     * nobody asked for and the element did not hold. Refusing a change should
     * leave everything as it was, which is the argument the line below already
     * makes for `checked`. */
    if (this.requestChecked(next)) {
      this.indeterminate = false
    }
    input.checked = this.checked
    this.relayNativeEvent(event)
  }

  /** Reports the value and the validity the host stands behind. */
  private sync(): void {
    this.internals.setFormValue(this.checked ? this.value : null)
    if (this.required && !this.checked) {
      this.internals.setValidity(
        { valueMissing: true },
        'Tick this box to continue.',
        this.renderRoot.querySelector<HTMLElement>('[part="control"]') ?? undefined,
      )
    } else {
      this.internals.setValidity({})
    }
    // Straight after, because validity moved without any property moving.
    this.refreshFeedback()
  }

  /** Returns the box to the state its markup declared. */
  formResetCallback(): void {
    this.indeterminate = false
    // `resetChecked` drops both halves now, the consumer's and the element's,
    // so there is nothing to clear before it.
    this.resetChecked()
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    this.internals.ariaRequired = this.required ? 'true' : null
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.sync()
    this.syncLabelPresence()
  }

  /**
   * Whether there is a label to leave room for, written to the host.
   *
   * The row is a flex line with a gap in it, so a label span rendered empty is
   * still a box and still takes that gap: an unlabelled box came out with eight
   * pixels of nothing after it. The input answers this by not rendering the
   * element, which cannot work here, because a checkbox is named by its own
   * content and the property is only that slot's fallback. Gating on the
   * property would unlabel every `<helix-checkbox>Text</helix-checkbox>` ever
   * written.
   *
   * So the slot is asked instead, the same way `Tooltip` asks its own: with
   * `flatten`, because here the fallback counts, being where the property
   * renders. Client only, so a server-rendered unlabelled checkbox carries the
   * gap for one frame. That is a control with no accessible name, which has a
   * worse problem than its spacing.
   */
  private readonly handleLabelChange = (): void => {
    this.syncLabelPresence()
  }

  /**
   * Asks the slot, and says the answer on the host.
   *
   * Called on `slotchange` and after every update, and the second is not
   * belt-and-braces: **`slotchange` does not fire when nothing is assigned.**
   * So a checkbox labelled only by its property, which is most of them, never
   * heard about its own label and rendered without one. Caught by the spec that
   * asks a labelled row to be wider than a bare one.
   */
  private syncLabelPresence(): void {
    const slot = this.renderRoot.querySelector<HTMLSlotElement>('[part="label"] slot')
    const filled = (slot?.assignedNodes({ flatten: true }) ?? []).some(
      (node) => node.textContent?.trim() !== '' || node.nodeType === Node.ELEMENT_NODE,
    )
    this.toggleAttribute('data-has-label', filled)
  }

  protected override render(): TemplateResult {
    /* A real `<label>` around both, which is the whole of what makes the text a
       target. It was a `<span>` beside the input, so pressing the words did
       nothing: the styled tier's own description claimed the pair behaved like
       a native label wrapping a checkbox, and nothing was doing that work.

       Labelling is behavior, which is what earns an element here rather than a
       bare slot: the wrapper is not decoration and there is no other way to get
       it. The browser handles the forwarding, so there is no click handler to
       write and none to get wrong.
 
       The one line of description goes under that row, which is where a field
       puts it too. */
    return html`<label part="field">
      <span part="box">
        <input
          part="control"
          type="checkbox"
          .checked=${this.checked}
          .indeterminate=${this.indeterminate}
          ?disabled=${this.isDisabled}
          ?required=${this.required}
          aria-describedby=${this.describedBy ?? nothing}
          @change=${this.handleChange}
        />
        <span part="mark" aria-hidden="true"></span>
      </span>
      <span part="label"><slot @slotchange=${this.handleLabelChange}>${this.label}</slot></span>
    </label>
    ${this.renderHint()}${this.renderFeedback()}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-checkbox': HelixBaseCheckbox
  }
}
