import {
  customElement,
  drawIcon,
  HelixFormElement,
  holdCaret,
  MixinControllerValue,
  MixinField,
  restoreValue,
} from '@helix-io/core'
import { eye, eyeSlash, x } from '@helix-io/icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
/* Side-effect import, because both buttons render a `helix-icon` and a custom
   element registers on import. File Input's remove button does the same. */

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
 * **`clearable` and `reveal` are the field's, not the consumer's.** The `end`
 * slot used to be the answer to both, which meant every consumer of
 * `type="search"` built the same button and every consumer of
 * `type="password"` either built the same toggle or shipped a field a reader
 * cannot check what they typed into. Neither is a slot's worth of variation:
 * one empties the value, the other flips the type, and both want the same
 * position, the same size and the same disabled behaviour. The slot stays for
 * what actually varies, a unit or a prefix.
 *
 * Both opt in rather than following from `type`, and are booleans that default
 * to false. A Lit boolean property that defaults to *true* cannot be turned off
 * from HTML at all, only from script, which is the wrong way round for
 * revealing a password: a consumer should have to ask for it. Drawer's `modal`
 * defaults true for the opposite reason, that losing a focus trap by forgetting
 * a word is worse than having to say so.
 *
 * @slot start - Before the text, for an icon or a prefix.
 * @slot end - After the text, for an icon or a unit.
 *
 * @event {HelixInputEvent} helix-input - Fired as the text changes, and cancelable.
 * @event {Event} change - Relayed from the input once the reader has finished.
 *
 * @csspart field - The box holding everything.
 * @csspart control - The input itself.
 * @csspart clear - The button that empties the field.
 * @csspart icon - A glyph this component draws.
 * @csspart reveal - The button that shows and hides a password.
 */
@customElement('helix-base-input')
export class HelixBaseInput extends MixinControllerValue(MixinField(HelixFormElement)) {
  /** Typed or dragged, so every edit is announced. See `announcesInput`. */
  protected override readonly announcesInput = true

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

  /**
   * Whether the field offers a button that empties it.
   *
   * Shown only while there is something to clear, because a control that does
   * nothing is worse than no control: a reader who presses it and sees no
   * change has to work out whether the field was already empty or the button
   * is broken.
   */
  @property({ type: Boolean })
  clearable = false

  /** What the clear button is called, since an icon has no name of its own. */
  @property({ attribute: 'clear-label' })
  clearLabel = 'Clear'

  /**
   * Whether a password field offers a toggle that shows what was typed.
   *
   * Ignored on every other type. A reveal on an email field would be a button
   * that does nothing visible, and guarding it here rather than asking the
   * consumer not to means the property can be set once on a component that
   * changes type.
   */
  @property({ type: Boolean })
  reveal = false

  /** What the reveal toggle is called. The state is `aria-pressed`, not this. */
  @property({ attribute: 'reveal-label' })
  revealLabel = 'Show password'

  /**
   * Whether the password is currently showing.
   *
   * State rather than a property: it is a reader's momentary choice about what
   * is on their own screen, it must not survive anything, and a consumer that
   * could set it could reveal a password without the reader asking.
   */
  @state()
  private revealed = false

  /**
   * The type the real input is given, which is not always the type asked for.
   *
   * A revealed password is a text field for exactly as long as the reader is
   * looking at it. Reading through a getter rather than mutating `type` keeps
   * the property the consumer's: what they set is what they get back, whatever
   * the button is doing.
   */
  private get effectiveType(): InputType {
    return this.revealed && this.type === 'password' ? 'text' : this.type
  }

  /** Whether there is a clear button on screen right now. */
  private get showsClear(): boolean {
    return this.clearable && this.value !== '' && !this.isDisabled && !this.readOnly
  }

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

  /**
   * Empties the field and gives the caret back.
   *
   * Focus returns to the input rather than staying on the button, which is
   * about to disappear: a reader who cleared a field is going to type in it,
   * and focus resting on a control that is being removed lands on the body.
   *
   * Through `requestValue` like every other change, so a consumer who owns the
   * value hears about it and decides, and a cancelled clear leaves the text
   * where it was.
   */
  private readonly handleClear = (): void => {
    this.requestValue('')
    const control = this.control
    if (control) {
      restoreValue(control, this.value)
      control.focus()
    }
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
        type=${this.effectiveType}
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
      <!-- In the tab order, unlike the browser's own search clear, which is not
           reachable by keyboard at all. That is defensible for a native control
           a reader can empty with select-all and Delete, and less so for one
           whose only affordance is an icon: a control that exists on screen and
           cannot be reached is one a keyboard reader is told about and cannot
           use. It only exists while there is a value, so the extra stop appears
           exactly when there is something to do with it. -->
      ${
        this.showsClear
          ? html`<button
              part="clear"
              type="button"
              aria-label=${this.clearLabel}
              @click=${this.handleClear}
            >
              ${drawIcon(x)}
            </button>`
          : nothing
      }
      ${
        this.reveal && this.type === 'password'
          ? html`<button
              part="reveal"
              type="button"
              aria-label=${this.revealLabel}
              aria-pressed=${this.revealed ? 'true' : 'false'}
              ?disabled=${this.isDisabled}
              @click=${() => {
                this.revealed = !this.revealed
              }}
            >
              ${drawIcon(this.revealed ? eyeSlash : eye)}
            </button>`
          : nothing
      }
    </div>
    ${this.renderHint()}${this.renderFeedback()}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-input': HelixBaseInput
  }
}
