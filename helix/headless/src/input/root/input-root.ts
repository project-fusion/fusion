import { customElement, HelixChangeEvent, HelixFormElement, MixinField } from '@helix-io/core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/** What the control accepts, which is text of one kind or another. */
export type InputType = 'email' | 'number' | 'password' | 'search' | 'tel' | 'text' | 'url'

/**
 * @summary A single line of text a reader types into.
 *
 * @description
 * Renders a real `<input>`, so the caret, selection, autofill, spellcheck, the
 * password manager, and the on-screen keyboard a phone chooses all come from the
 * platform. `delegatesFocus` puts focus on it, and it serializes into the
 * server's markup, so the field is usable before any script loads.
 *
 * **The input inside a shadow root submits nothing**, because the form is on the
 * other side of the boundary. The host is form-associated instead and reports
 * its own value through `ElementInternals`, which is also what carries validity
 * and what answers a form reset.
 *
 * `value` and `defaultValue` are separate for the reason `checked` and
 * `defaultChecked` are: `value` is what is in the field now and
 * `defaultValue` is what the markup asked for, which is where a reset returns
 * to and is gone the moment anyone types.
 *
 * **Validity is the platform's.** The type, `required`, `pattern`, `minlength`
 * and the rest are set on the real input and its `validity` is copied onto the
 * host, so an email field rejects what the browser says is not an email rather
 * than what a regular expression here guesses. What this adds is the anchor, so
 * `reportValidity` points the bubble at the input rather than at the host.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases TextField, Field, TextInput
 * @documentation https://helix.fusion.dev/components/input
 *
 * @slot start - Before the text, for an icon or a prefix.
 * @slot end - After the text, for an icon, a unit, or a clear button.
 *
 * @event {HelixChangeEvent} helix-change - Fired as the text changes, and cancelable.
 * @event {Event} change - Relayed from the input once the reader has finished.
 *
 * @csspart field - The box holding everything.
 * @csspart control - The input itself.
 */
@customElement('helix-base-input')
export class HelixBaseInput extends MixinField(HelixFormElement) {
  /**
   * The text the markup declared, which is what a reset returns to.
   *
   * Separate from `value`, which is where the field is now.
   */
  @property({ attribute: 'default-value' })
  defaultValue = ''

  /** Name submitted with the form. */
  @property()
  name = ''

  /** Shown while the field is empty. Not a label: it goes when typing starts. */
  @property()
  placeholder = ''

  /** Whether the field refuses input while still submitting its value. */
  @property({ attribute: 'read-only', reflect: true, type: Boolean })
  readOnly = false

  /** What the field accepts, which decides the keyboard and the validation. */
  @property({ reflect: true })
  type: InputType = 'text'

  /** The text in the field. */
  @property()
  value = ''

  /** Focus is delegated to the input, so the host is never the focus target. */
  static override shadowRootOptions: ShadowRootInit = {
    ...HelixFormElement.shadowRootOptions,
    delegatesFocus: true,
  }

  private get control(): HTMLInputElement | null {
    return this.renderRoot.querySelector<HTMLInputElement>('[part="control"]')
  }

  /**
   * Every keystroke, cancelable, and put back where it is refused.
   *
   * The input has already taken the character by the time this runs, so a
   * consumer that refuses the change has to see the field returned to what the
   * element still holds. Otherwise the text on screen and the value the form
   * would submit disagree, which is the one thing a controlled field must never
   * do.
   */
  private readonly handleInput = (event: Event): void => {
    const control = event.target as HTMLInputElement
    const next = control.value
    const allowed = this.dispatchEvent(new HelixChangeEvent({ name: this.name, value: next }))
    if (!allowed) {
      control.value = this.value
      return
    }
    this.value = next
  }

  /** Relayed, because `change` does not cross a shadow boundary on its own. */
  private readonly handleChange = (event: Event): void => {
    event.stopPropagation()
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
  }

  /** Reports the value and the validity the host stands behind. */
  private sync(): void {
    this.internals.setFormValue(this.value)
    const control = this.control
    if (!control) {
      return
    }
    /* The input's own verdict, copied over rather than recomputed. It knows
       what an email is and what `pattern` means, and it knows it the same way
       the browser will when the form is submitted. The anchor is what this adds:
       without it the validity bubble points at the host, which is a box with no
       text in it. */
    this.internals.setValidity(control.validity, control.validationMessage, control)
  }

  /** Returns the field to the text its markup declared. */
  formResetCallback(): void {
    this.value = this.defaultValue
  }

  /** Restores the text when the browser brings a form back. */
  formStateRestoreCallback(state: string | null): void {
    this.value = state ?? this.defaultValue
  }

  /** Puts the caret in the field, the way a label pointing at one would. */
  override focus(options?: FocusOptions): void {
    this.control?.focus(options)
  }

  /** Selects everything in the field. */
  select(): void {
    this.control?.select()
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    // Once, before anything is typed. `default-value` is what the markup asked
    // for, so it is the starting text as well as the text a reset comes back to.
    if (!this.hasUpdated && this.value === '' && this.defaultValue !== '') {
      this.value = this.defaultValue
    }
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.sync()
  }

  protected override render(): TemplateResult {
    return html`${this.renderLabel()}
    <div part="field">
      <slot name="start"></slot>
      <input
        part="control"
        id="control"
        .value=${this.value}
        type=${this.type}
        name=${this.name || nothing}
        placeholder=${this.placeholder || nothing}
        aria-describedby=${this.describedBy ?? nothing}
        ?disabled=${this.disabled}
        ?readonly=${this.readOnly}
        ?required=${this.required}
        @input=${this.handleInput}
        @change=${this.handleChange}
      />
      <slot name="end"></slot>
    </div>
    ${this.renderCaption()}${this.renderFeedback()}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-input': HelixBaseInput
  }
}
