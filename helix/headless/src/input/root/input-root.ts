import {
  customElement,
  HelixFormElement,
  MixinControllerValue,
  MixinField,
  restoreValue,
} from '@helix-io/core'
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
 * **Validity is the platform's.** The `type` and `required` are set on the real
 * input and its `validity` is copied onto the host, so an email field rejects
 * what the browser says is not an email rather than what a regular expression
 * here guesses. What this adds is the anchor, so `reportValidity` points the
 * bubble at the input rather than at the host.
 *
 * `pattern`, `minlength` and `maxlength` are forwarded with them. They were
 * promised by this paragraph and did not exist, so a consumer following the
 * sentence wrote an attribute on the host that reached no input and constrained
 * nothing: the field looked as though it were checked and was not.
 *
 * @since 0.1.0
 * @status experimental
 * @category forms
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
export class HelixBaseInput extends MixinControllerValue(MixinField(HelixFormElement)) {
  /** Shown while the field is empty. Not a label: it goes when typing starts. */
  @property()
  placeholder = ''

  /** Whether the field refuses input while still submitting its value. */
  @property({ attribute: 'read-only', reflect: true, type: Boolean })
  readOnly = false

  /**
   * What the field accepts, which decides the keyboard and the validation.
   *
   * **Not reflected**, and it was. Reflection exists so a selector can reach a
   * value, and no stylesheet in this repository selects on `type`: what it did
   * instead was write `type="text"` onto every `<helix-input>` ever rendered,
   * an attribute no consumer's markup had. That is precisely the fault `Button`
   * had with `href`, `target` and `rel`, written up in the area rules as the
   * reason the rule exists, and this was the last property in the library still
   * doing it. Audited: ten reflected attributes have no selector anywhere, and
   * this is the only one of them with a value that puts itself on the host.
   *
   * Nothing reads it from the attribute either. The real `<input>` inside takes
   * it as a property binding, which is what makes the keyboard and the
   * validation follow.
   */
  @property()
  type: InputType = 'text'

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
    /* Through the mixin, which announces and then applies only if the value is
       the element's to move. The native control has already changed either way,
       so wherever the answer does not follow it has to be put back: that is a
       refusal, and it is equally a consumer who owns the value and has not
       given a new one yet. Both are "what is on screen is not the answer". */
    this.requestValue(next)
    restoreValue(control, this.value)
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
    // Straight after, because validity moved without any property moving.
    this.refreshFeedback()
  }

  /** Puts the caret in the field, the way a label pointing at one would. */
  override focus(options?: FocusOptions): void {
    this.control?.focus(options)
  }

  /** Selects everything in the field. */
  select(): void {
    this.control?.select()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.sync()
  }

  /**
   * A regular expression the value has to match, as the platform reads it.
   *
   * The class documentation promised `pattern` and `minlength` "and the rest"
   * were set on the real input, and no such properties existed: a consumer
   * following that sentence wrote an attribute on the host, it reached no input,
   * and the field constrained nothing while looking as though it did.
   *
   * Forwarded rather than checked here, which is the whole reason validity is
   * the platform's: the browser knows what a `pattern` means, anchors it at both
   * ends, and produces the message in the reader's own language.
   */
  @property()
  pattern = ''

  /** Fewest characters the value may have. */
  @property({ attribute: 'minlength', type: Number })
  minLength?: number

  /** Most characters the value may have. */
  @property({ attribute: 'maxlength', type: Number })
  maxLength?: number

  protected override render(): TemplateResult {
    /* Label, field, and one line under it.
       The hint and the feedback share that line rather than stacking, so a
       field is the same height either way and nothing below it moves when the
       message changes. */
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
        pattern=${this.pattern || nothing}
        minlength=${this.minLength ?? nothing}
        maxlength=${this.maxLength ?? nothing}
        aria-describedby=${this.describedBy ?? nothing}
        ?disabled=${this.isDisabled}
        ?readonly=${this.readOnly}
        ?required=${this.required}
        @input=${this.handleInput}
        @change=${this.handleChange}
      />
      <slot name="end"></slot>
    </div>
    ${this.renderHint()}${this.renderFeedback()}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-input': HelixBaseInput
  }
}
