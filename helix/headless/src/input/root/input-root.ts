import {
  AriaForwardController,
  customElement,
  drawIcon,
  HelixClearEvent,
  HelixFormElement,
  holdCaret,
  MixinControllerValue,
  MixinField,
  restoreValue,
} from '@fusion.dev/helix-core'
import { eye, eyeSlash, x } from '@fusion.dev/helix-icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'

/** What the control accepts, which is text of one kind or another. */
export type InputType = 'email' | 'number' | 'password' | 'search' | 'tel' | 'text' | 'url'

/**
 * @summary A field for a single line of text.
 *
 * @description
 * Renders a real `<input>`, so the caret, selection, autofill, spellcheck,
 * password managers, and a phone's on-screen keyboard all work natively. The
 * field is in the server markup, so it works before any script loads.
 *
 * An input inside a shadow root does not submit with a form outside it, so the
 * host is form-associated and reports its value through `ElementInternals`.
 * That also carries validity and handles a form reset.
 *
 * `value` and `defaultValue` work like `checked` and `defaultChecked`. `value`
 * is what is in the field now, and `defaultValue` is the value from the markup,
 * which a reset restores.
 *
 * Validity comes from the browser. `type` and `required` are set on the real
 * input, and its `validity` is copied to the host.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @aliases TextField, Field, TextInput
 * @documentation https://fusion.dev/helix/components/input
 *
 * @slot end - After the text, for an icon or a unit.
 * @slot feedback - The message that says what is wrong, for content richer than a string. It shows while there is a message.
 * @slot hint - Help under the control, for content richer than the `hint` text.
 * @slot label - The label, for content richer than the `label` text.
 * @slot start - Before the text, for an icon or a prefix.
 *
 * @event {Event} change - Sent when the user finishes changing the value. Relayed from the native input.
 * @event {HelixBeforeChangeEvent} helix-before-change - The text is about to change. Cancelable: cancel it to keep the current text.
 * @event {HelixClearEvent} helix-clear - Fired after the clear button has emptied the field, after `input` and `change`.
 * @event {Event} input - Fired as the value changes.
 *
 * @csspart clear - The button that empties the field.
 * @csspart control - The native input.
 * @csspart feedback - The message that says what is wrong with the value.
 * @csspart field - The box around the input, its slots, and its buttons.
 * @csspart hint - Help text under the field, shown while there is no feedback.
 * @csspart label - The label above the field.
 * @csspart reveal - The button that shows and hides a password.
 * @csspart reveal-pressed - The reveal button while the password is shown, added beside `reveal`.
 *
 * @cssstate invalid - The control has an error to show, from the browser's validation or from your `feedback`.
 */
@customElement('helix-headless-input')
export class HelixHeadlessInput extends MixinControllerValue(MixinField(HelixFormElement)) {
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
   * Whether a phone capitalizes as the reader types: `off`, `sentences`,
   * `words` or `characters`, as the platform's `autocapitalize`.
   */
  @property()
  override autocapitalize = ''

  /**
   * What the browser may autofill in the field, as an HTML `autocomplete`
   * token.
   *
   * Empty leaves the attribute off, which is the browser's default. Set it to
   * a token like `email` or `bday` to ask for autofill, or to `off` to refuse.
   */
  @property()
  autocomplete = ''

  /**
   * Whether the field shows a button that empties it.
   *
   * Shown only while there is something to clear, because a control that does
   * nothing is worse than no control: a reader who presses it and sees no
   * change has to work out whether the field was already empty or the button
   * is broken.
   */
  @property({ type: Boolean })
  clearable = false

  /**
   * The accessible name of the clear button, which shows only an icon.
   */
  @property({ attribute: 'clear-label' })
  clearLabel = 'Clear'

  /**
   * The key the on-screen keyboard shows for Enter, as the platform's
   * `enterkeyhint`: `search`, `send`, `go`, `next`, `previous`, `done` or
   * `enter`.
   */
  @property({ attribute: 'enterkeyhint' })
  override enterKeyHint = ''

  /**
   * The keyboard a phone offers, as the platform's `inputmode`, such as
   * `numeric` for a code typed as text.
   */
  @property({ attribute: 'inputmode' })
  override inputMode = ''

  /**
   * The greatest value, for `type="number"`. Number Input adds steppers and
   * keys to the same bounds.
   */
  @property()
  max = ''

  /**
   * Most characters the value may have.
   */
  @property({ attribute: 'maxlength', type: Number })
  maxLength?: number

  /**
   * The least value, for `type="number"`.
   */
  @property()
  min = ''

  /**
   * Fewest characters the value may have.
   */
  @property({ attribute: 'minlength', type: Number })
  minLength?: number

  /**
   * A regular expression the value has to match, as the platform reads it.
   *
   * Forwarded rather than checked here, which is the whole reason validity is
   * the platform's: the browser knows what a `pattern` means, anchors it at both
   * ends, and produces the message in the reader's own language.
   */
  @property()
  pattern = ''

  /**
   * The text shown while the field is empty.
   *
   * Not a label: it goes when typing starts.
   */
  @property()
  placeholder = ''

  /**
   * Whether the field blocks editing. A read-only field still submits its
   * value.
   *
   * **The attribute is `readonly`, which is the platform's spelling.** A
   * camelCase property needs an explicit `attribute`, and dash-casing a word
   * HTML writes as one costs what an attribute always costs here: nothing
   * warns. `<helix-headless-input readonly>` is what anybody who has written
   * HTML types; against `read-only` it parses to no property at all, and the
   * field stays editable with no error anywhere. Measured on the dash-cased
   * form, `readOnly` came back `false`.
   */
  @property({ attribute: 'readonly', reflect: true, type: Boolean })
  readOnly = false

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

  /**
   * The direction of the selection, as the native input names it.
   *
   * The `<input>` is inside this shadow root, so a consumer had no way to ask
   * where the selection is, let alone move it: `querySelector` does not cross
   * the boundary. An insert-at-cursor toolbar, a format button, a mask that
   * repositions the caret after rewriting the value, all of them need this and
   * none of them could be written. Textarea gained the same surface for the same
   * reason.
   *
   * Zero before there is a control, which is where an empty field's caret would
   * be anyway.
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
   * Selects the range from `start` to `end` in one call, which setting
   * `selectionStart` and `selectionEnd` one at a time cannot always do.
   *
   * Setting `selectionStart` past the current `selectionEnd` drags the end
   * along, so the two writes a consumer would make in sequence do not compose
   * into the range they asked for. The platform has this method for that reason
   * and so does this.
   */
  setSelectionRange(start: number, end: number, direction?: SelectionDirection): void {
    this.control?.setSelectionRange(start, end, direction)
  }

  private get control(): HTMLInputElement | null {
    return this.partNamed<HTMLInputElement>('control')
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
    /* **Stopped, because the control inside this one is not a control a consumer
       has.** `input` is composed by specification, so the native event from the
       `<input>` in this shadow root crosses the boundary and reaches the host
       beside the one the mixin announces: measured in Chrome 148, one keystroke
       produced `helix-before-change`, this element's own `input`, and the inner
       control's, so `onInput` ran twice and one of the two carried the value
       from before the change. `handleChange` two methods down does the same. */
    event.stopPropagation()
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
   * value hears about it and decides, and a canceled clear leaves the text
   * where it was.
   */
  private readonly handleClear = (): void => {
    /* `change` as well as `input`, because the reader is done: the native
       control never saw an edit, so no `change` of its own would follow, and a
       consumer saving on `change` never learned the field was emptied. */
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

  /** Relayed, because `change` does not cross a shadow boundary on its own. */
  private readonly handleChange = (event: Event): void => {
    event.stopPropagation()
    this.announceChange()
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
    this.copyValidity(control)
    // Straight after, because validity moved without any property moving.
    this.refreshFeedback()
  }

  /** Puts the caret in the field, as clicking its label does. */
  override focus(options?: FocusOptions): void {
    this.control?.focus(options)
  }

  /** Selects everything in the field. */
  select(): void {
    this.control?.select()
  }

  /**
   * Moves a number, a date or a time up by `step`, `count` times, as the native
   * method does. It sends no event, as the native method sends none, and it
   * throws `InvalidStateError` on a type with no step, such as `text`.
   */
  stepUp(count = 1): void {
    this.control?.stepUp(count)
    this.takeStep()
  }

  /** Moves a number, a date or a time down by `step`, `count` times. See `stepUp`. */
  stepDown(count = 1): void {
    this.control?.stepDown(count)
    this.takeStep()
  }

  /** Takes the native control's answer, which knows `min`, `max` and `step`. */
  private takeStep(): void {
    const control = this.control
    if (control) {
      this.value = control.value
    }
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
   * The accessible name of the reveal toggle.
   *
   * The state is `aria-pressed`, not this.
   */
  @property({ attribute: 'reveal-label' })
  revealLabel = 'Show password'

  /**
   * The step a valid value is a multiple of, counted from `min`, for
   * `type="number"`.
   */
  @property()
  step = ''

  /**
   * The kind of text the field accepts. It sets the on-screen keyboard and the
   * validation.
   *
   * **Not reflected.** Reflection exists so a selector can reach a value, and
   * no stylesheet in this repository selects on `type`. Reflecting it writes
   * `type="text"` onto every `<helix-headless-input>` ever rendered, an
   * attribute no consumer's markup has, which is the fault the area rules write
   * up under `Button`'s `href`, `target` and `rel`.
   *
   * Nothing reads it from the attribute either. The real `<input>` inside takes
   * it as a property binding, which is what makes the keyboard and the
   * validation follow.
   */
  @property()
  type: InputType = 'text'

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
        id=${this.controlId}
        .value=${this.value}
        type=${this.effectiveType}
        name=${this.name || nothing}
        placeholder=${this.placeholder || nothing}
        autocomplete=${this.autocomplete || nothing}
        pattern=${this.pattern || nothing}
        minlength=${this.minLength ?? nothing}
        maxlength=${this.maxLength ?? nothing}
        min=${this.min || nothing}
        max=${this.max || nothing}
        step=${this.step || nothing}
        inputmode=${this.inputMode || nothing}
        enterkeyhint=${this.enterKeyHint || nothing}
        autocapitalize=${this.autocapitalize || nothing}
        aria-describedby=${this.describedBy ?? nothing}
        aria-invalid=${this.invalidity ?? nothing}
        ?disabled=${this.isDisabled}
        ?readonly=${this.readOnly}
        ?required=${this.required}
        @input=${this.handleInput}
        @change=${this.handleChange}
        @keypress=${this.handleKeypress}
      />
      <slot name="end"></slot>
      <!-- In the tab order, unlike the browser's own search clear, which is not
           reachable by keyboard at all: a control whose only affordance is an
           icon and that cannot be reached is one a keyboard reader is told
           about and cannot use. It only exists while there is a value, so the
           extra stop appears exactly when there is something to do with it. -->
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
              part="reveal${this.revealed ? ' reveal-pressed' : ''}"
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
    'helix-headless-input': HelixHeadlessInput
  }
}
