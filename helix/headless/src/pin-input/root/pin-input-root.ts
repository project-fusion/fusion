import {
  AriaForwardController,
  customElement,
  HelixCompleteEvent,
  HelixFormElement,
  MixinControllerValue,
  MixinField,
  restoreValue,
  submitImplicitly,
  verdictFlags,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import {
  type CodeEdit,
  caretTo,
  cleanCode,
  codeVerdict,
  overwriteCode,
  type PinCase,
  type PinType,
  readTyped,
} from '../code.js'
import { separatorsAfter } from '../format.js'

export type { PinCase, PinType } from '../code.js'

/**
 * The one field, out of sight and out of the way of the pointer, written on the
 * element because the headless tier ships no stylesheet. Sixteen pixels of
 * type, because a phone zooms the page into a field whose text is smaller.
 */
const UNSEEN = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;font-size:16px'

/**
 * Keeps focus where it is through a press on a box: a box is no control, and
 * focus leaving the field for the moment of the press would commit the code.
 */
const keepFocus = (event: Event): void => event.preventDefault()

/**
 * @summary A field for a short code, with one box for each character.
 *
 * @description
 * One real `<input>` holds the code, and the boxes are drawn from it, as Web
 * Awesome's OTP input does. A screen reader meets one field, named by the
 * label, and the code never sits in a row of separate fields. The boxes are
 * hidden from it.
 *
 * The caret is drawn in the box it is in, and the box is marked with
 * `cell-active` while the field has focus. A filled box selects its character,
 * so typing replaces it and moves on.
 *
 * Input longer than one character is treated as a paste. This covers pasting,
 * a browser autofilling an SMS code, and a password manager. A six-character
 * code pasted into an empty field fills from the first box.
 *
 * The code is one value to a form. The field is in a shadow root and submits
 * nothing. The host is form-associated and submits the code, which also
 * carries validity and responds to a form reset. The field carries
 * `autocomplete="one-time-code"`, which lets a phone offer the code from a
 * message.
 *
 * `autosubmit` submits the form once the last box is filled, through the form's
 * default button where there is one. `format` draws separators between the
 * boxes, such as the dash in `###-###`, as text a screen reader skips. `mask`
 * makes the field a password field and draws `mask-character` in each filled
 * box, so the code is never drawn as text.
 *
 * The row of boxes always runs left to right, with `dir="ltr"`, including in
 * Arabic and Hebrew. The first box is the leftmost, a paste fills to the right,
 * and the right arrow moves to the next box. The label, hint, and feedback
 * follow the page's direction.
 *
 * **Keyboard.** The field is one tab stop.
 *
 * | Key | What it does |
 * |---|---|
 * | A character | Fills the box and moves to the next one. A longer run is read as a paste. |
 * | Left, Right | Moves to the box before or after. |
 * | Home, End | Moves to the first box, or to the box after the last character. |
 * | Backspace | Removes the character in the box, or in an empty box the one before it, and moves there. |
 * | Delete | Removes the character in the box and pulls the rest of the code back. |
 * | Enter | Submits the form. |
 *
 * The field is a text field, or a password field under `mask`, named by the
 * label and described by the hint and the message, with `aria-invalid` while
 * a message shows and `aria-required` under `required`. `helix-complete` is a
 * `HelixCompleteEvent` sent once the last box is filled.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @aliases PinField, OTP, One-time code, Verification code, InputPin
 * @documentation https://fusion.dev/helix/components/pin-input
 *
 * @slot feedback - The message that says what is wrong, for content richer than a string. It shows while there is a message.
 * @slot hint - Help under the control, for content richer than the `hint` text.
 * @slot label - The label, for content richer than the `label` text.
 *
 * @event {Event} change - The code was filled, or an edited code lost focus.
 * @event {HelixBeforeChangeEvent} helix-before-change - The code is about to change. Cancelable.
 * @event {HelixCompleteEvent} helix-complete - The last box was filled.
 * @event {Event} input - The code changed.
 *
 * @csspart caret - The caret, drawn in the empty box it is in while the field has focus.
 * @csspart cell - One box.
 * @csspart cell-active - The box the caret is in, while the field has focus. Set together with `cell`.
 * @csspart cell-filled - A box that holds a character. Set together with `cell`.
 * @csspart control - The one field that holds the code, out of sight: the boxes are drawn from it.
 * @csspart feedback - The message that says what is wrong with the code.
 * @csspart field - The row of boxes, ordered left to right in every language.
 * @csspart hint - The help under the boxes, shown while there is no feedback.
 * @csspart label - The label above the boxes.
 * @csspart placeholder - The `placeholder` text in an empty box.
 * @csspart separator - The text `format` draws between two boxes.
 *
 * @cssstate complete - Every box holds a character.
 * @cssstate invalid - The control has an error to show, from the browser's validation or from your `feedback`.
 */
@customElement('helix-headless-pin-input')
export class HelixHeadlessPinInput extends MixinControllerValue(MixinField(HelixFormElement)) {
  /* A consumer's `aria-describedby` names ids in their own tree and the field
     is in this shadow root, so the reference has to be carried down as an
     element rather than copied as an id. See `AriaForwardController`. */
  protected readonly aria = new AriaForwardController(this, {
    target: () => this.control,
  })

  /** Typed or pasted, so every edit is announced. See `announcesInput`. */
  protected override readonly announcesInput = true

  /**
   * The autofill hint for the browser. `one-time-code` is why this defaults to
   * anything at all: it is the token that lets a phone offer the code out of a
   * message.
   */
  @property()
  autocomplete = 'one-time-code'

  /**
   * Whether the form is submitted once the last box is filled, as Web
   * Awesome's `autosubmit` and Radix's `autoSubmit`. Only for a code the field
   * took: a refused last character submits nothing.
   */
  @property({ type: Boolean })
  autosubmit = false

  /**
   * How typed and pasted letters are cased: `upper`, `lower`, or `preserve`
   * to keep them as typed. Web Awesome's OTP input takes the same `case`, for
   * a code a service reads in one case.
   */
  @property()
  case: PinCase = 'preserve'

  /**
   * The name each box once had, with `{index}` and `{length}` filled in.
   *
   * @deprecated No longer read. The boxes are drawn from one field, which is
   * named by `label`, and a screen reader does not meet the boxes. Removed in
   * the next breaking release.
   */
  @property({ attribute: 'cell-label' })
  cellLabel = 'Character {index} of {length}'

  /**
   * Separators drawn between the boxes: `#` or `*` for a box and anything
   * else as it is written, so `###-###` draws a dash after the third. The
   * separators are hidden from screen readers and are not part of the value.
   */
  @property()
  format = ''

  /**
   * How many characters the code has.
   */
  @property({ type: Number })
  length = 6

  /**
   * Whether the characters are hidden, the way a password is. The field is a
   * password field, and each filled box draws `mask-character`.
   */
  @property({ reflect: true, type: Boolean })
  mask = false

  /**
   * What a filled box draws under `mask`, in place of its character, as Web
   * Awesome's `--mask-char`.
   */
  @property({ attribute: 'mask-character' })
  maskCharacter = '•'

  /**
   * What an empty box shows, usually a single dot. It is not shown in the box
   * the caret is in. Empty by default, because a row of boxes already reads as
   * a row of boxes.
   */
  @property()
  placeholder = ''

  /**
   * Whether the field blocks input. A read-only code still submits its value.
   */
  @property({ attribute: 'readonly', reflect: true, type: Boolean })
  readOnly = false

  /**
   * The message shown when the code is started and not finished, with
   * `{length}` filled in. When it is unset, an English default is shown.
   */
  @property({ attribute: 'too-short-message' })
  tooShortMessage?: string

  /**
   * The characters a box accepts, which also sets the keyboard a phone shows.
   *
   * `numeric` and `alphanumeric` also refuse anything else on the way in,
   * because a code that is digits is digits: letting a letter into a box a
   * reader cannot submit is a mistake they have to find and undo themselves.
   * `text` refuses nothing and only trims, so it is the mode for a code with a
   * hyphen in it.
   *
   * **`alphanumeric` is ASCII letters and digits**, which is narrower than the
   * word is in general and is the right narrowness here. A code of this kind
   * comes off a keypad, an SMS or an authenticator, and none of them emit `é`;
   * a filter that accepted it would let through a character the service on the
   * other end is going to reject. A consumer whose codes really do carry
   * marked letters wants `text`, which judges nothing.
   *
   * **Not reflected**: nothing selects on it, so reflecting only writes
   * `type="numeric"` onto every `<helix-headless-pin-input>` ever rendered, an
   * attribute no consumer's markup had. The field takes it as `inputmode`,
   * which is what makes the keyboard follow.
   */
  @property()
  type: PinType = 'numeric'

  /** Focus is delegated, so the host is never the focus target. */
  static override shadowRootOptions: ShadowRootInit = {
    ...HelixFormElement.shadowRootOptions,
    delegatesFocus: true,
  }

  /**
   * The box the caret is in while the field has focus, and -1 while it does
   * not or while the field is read-only, where there is nothing to type into.
   */
  @state()
  private active = -1

  /** The box a press asked for, taken when the focus it starts arrives. */
  private pressedAt: number | undefined = undefined

  /** How many boxes there are, clamped once so every reader agrees. */
  private get count(): number {
    return Math.max(1, Math.floor(this.length) || 1)
  }

  private get control(): HTMLInputElement | null {
    return this.partNamed<HTMLInputElement>('control')
  }

  /** The furthest box the caret can be in: after the code, and the last box at most. */
  private get end(): number {
    return Math.min(this.value.length, this.count - 1)
  }

  /** The box the caret is drawn in, kept within the code a script may have shortened. */
  private get caretBox(): number {
    return this.active < 0 ? -1 : Math.min(this.active, this.end)
  }

  /**
   * Takes a code the field was edited to, and moves the caret to `caret`.
   *
   * The single path for typing, pasting and autofill alike, because they are
   * the same act at different lengths. Through `requestValue`, so a consumer
   * who owns the code can refuse it, and a refused edit puts the field back.
   */
  private take({ caret, code }: CodeEdit): void {
    const applied = this.requestValue(code)
    const control = this.control
    if (control) {
      restoreValue(control, this.value)
    }
    if (this.active >= 0 && applied) {
      this.active = caret
    }
    this.placeCaret(true)
    /* Only a code the element took. A refused last character left the shorter
       code in place, and announcing the refused one sent an auto-submit a code
       the field does not hold. */
    if (applied && this.value === code && code.length === this.count) {
      this.dispatchEvent(new HelixCompleteEvent({ value: code }))
      /* And a native `change`, because a filled code is this control's commit:
         the field's own `change` waits for it to lose focus. */
      this.commit()
      if (this.autosubmit) {
        submitImplicitly(this.form)
      }
    }
  }

  /**
   * Puts the field's selection on the box the caret is in: the character
   * there, so typing replaces it, or the empty place after the code.
   *
   * Left alone while the reader holds a wider selection of their own, such as
   * everything after Control+A, unless `force` says the caret moved.
   */
  private placeCaret(force = false): void {
    const control = this.control
    const at = this.caretBox
    if (!control || at < 0) {
      return
    }
    const start = control.selectionStart ?? 0
    const end = control.selectionEnd ?? start
    if (!force && end - start > 1) {
      return
    }
    control.setSelectionRange(at, at < this.value.length ? at + 1 : at)
  }

  private readonly handleInput = (event: Event): void => {
    // Stopped for the reason `Input.handleInput` gives: the inner control's own
    // `input` is composed and would reach a consumer beside this element's.
    event.stopPropagation()
    const control = event.target as HTMLInputElement
    this.take(
      readTyped(
        control.value,
        control.selectionStart ?? control.value.length,
        this.type,
        this.case,
        this.count,
      ),
    )
  }

  /**
   * A paste writes over the boxes from the caret on, rather than into the
   * field's text, so a code pasted into box three of a full code replaces the
   * characters there instead of pushing them along.
   */
  private readonly handlePaste = (event: ClipboardEvent): void => {
    event.preventDefault()
    const control = this.control
    if (!control || this.isDisabled || this.readOnly) {
      return
    }
    const text = cleanCode(event.clipboardData?.getData('text') ?? '', this.type, this.case)
    if (text === '') {
      return
    }
    const start = control.selectionStart ?? this.end
    const end = control.selectionEnd ?? start
    /* A wider selection is replaced, as pasting over a selection does. */
    const kept = end - start > 1 ? this.value.slice(0, start) + this.value.slice(end) : this.value
    this.take(overwriteCode(kept, start, text, this.count))
  }

  /**
   * The keys that move between boxes. Backspace and Delete are the field's
   * own: the selection on a filled box makes them remove its character, and
   * the empty place after the code makes Backspace remove the one before.
   *
   * Home goes to the first box and End to the end of the code, the box after
   * its last character, which is where the caret goes in a single text field.
   */
  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (event.isComposing || this.isDisabled) {
      return
    }
    if (this.readOnly) {
      /* WebKit reads a Backspace a read-only field does not take as going
         back a page. */
      if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault()
      }
      return
    }
    const to = caretTo(event.key, this.caretBox, this.end)
    if (to === undefined) {
      return
    }
    event.preventDefault()
    this.active = to
    this.placeCaret(true)
  }

  /** A press on a box puts the caret there, or after the code where the box is past it. */
  private readonly handlePress = (event: MouseEvent): void => {
    const control = this.control
    if (!control || this.isDisabled) {
      return
    }
    const boxes = [...this.renderRoot.querySelectorAll('[part~="cell"]')]
    const box = (event.target as Element).closest('[part~="cell"]')
    const at = box ? boxes.indexOf(box) : this.end
    if (this.shadowRoot?.activeElement === control) {
      if (!this.readOnly) {
        this.active = Math.min(at, this.end)
        this.placeCaret(true)
      }
      return
    }
    this.pressedAt = at
    control.focus()
  }

  /**
   * The code as it stood when focus arrived, so a visit that changed nothing
   * says nothing.
   *
   * **Baselined on arrival, not at the last commit**, which is the platform's
   * reading. What the two do to a real browser, measured in Chromium against a
   * native `<input>` with real keystrokes:
   *
   * | | native | last commit | on arrival |
   * |---|---|---|---|
   * | types, leaves | `change` | `change` | `change` |
   * | script assigns unfocused, visit with no edit | silent | **`change`** | silent |
   * | script assigns unfocused, then edits | `change` | `change` | `change` |
   * | types a character and deletes it | silent | silent | silent |
   *
   * One row differed and it is the one that matters: a consumer who assigns
   * `value` and then has a reader tab through the field was told the reader had
   * entered a code. `change` on a field means "the reader had a go at this",
   * `MixinField` treats it as exactly that, and announcing a value the consumer
   * set themselves is a false positive rather than the safe half of a trade.
   *
   * Seeded in `firstUpdated`, a code in the markup being committed by whoever
   * wrote it, and re-taken on every arrival.
   */
  private committed = ''

  /** Takes the baseline, and puts the caret in the box pressed or after the code. */
  private readonly handleFocus = (): void => {
    this.committed = this.value
    this.active = this.readOnly ? -1 : Math.min(this.pressedAt ?? this.end, this.end)
    this.pressedAt = undefined
    this.placeCaret(true)
  }

  /**
   * Commits when focus leaves the field.
   *
   * `change` is one of the two events `MixinField` reads as "the reader has had
   * a go at this", so without this a code that was never completed is never
   * `touched` and its own `tooShort` message cannot show: two boxes of four
   * filled and tabbed away from is answered with nothing at all.
   */
  private readonly handleBlur = (): void => {
    this.active = -1
    this.commit()
  }

  /**
   * Announces the code as entered, from whichever moment reached it first.
   *
   * **One writer, because the fact has two moments and only one meaning.** A
   * filled code and a field being left are both "the reader is done with this".
   * Dispatching from either site directly is how a moment gets added that fires
   * without baselining.
   *
   * Silent when nothing moved since the baseline, which is what makes it safe
   * to call from both: completing a code that is already the committed one, or
   * leaving a field nobody edited, says nothing.
   *
   * `composed: false`, like the native event this stands in for. It is
   * dispatched on the host, so a consumer hears it.
   */
  private commit(): void {
    if (this.value === this.committed) {
      return
    }
    this.committed = this.value
    this.announceChange()
  }

  /**
   * Reports the code and a verdict on it.
   *
   * **A half-entered code is invalid whether or not it is required, and that is
   * the platform's answer rather than ours.** `required` guards `valueMissing`
   * and nothing guards `tooShort`, so an optional code is refused for being half
   * filled. Measured in Chromium against a native `<input minlength="4">` with
   * real keystrokes, which is the feature this is the same shape as:
   *
   * | | optional | required |
   * |---|---|---|
   * | typed `12` | `tooShort`, invalid | `tooShort`, invalid |
   * | left empty | valid | `valueMissing` |
   * | typed `1234` | valid | valid |
   *
   * So `required` decides whether *nothing* is acceptable, and the length rule
   * applies to anything that is not nothing. Two of four characters is not an
   * optional code omitted, it is a code got wrong, and submitting it would send
   * a fragment. The gate on the message is `touched` rather than `required`,
   * which is what stops a reader being told off before they have had a go.
   */
  private sync(): void {
    this.internals.setFormValue(this.value)
    const control = this.control
    if (!control) {
      return
    }
    const found = verdictFlags(
      codeVerdict(this.value, this.count, this.required, {
        missing: this.valueMissingMessage,
        short: this.tooShortMessage,
      }),
    )
    this.internals.setValidity(found?.[0] ?? {}, found?.[1] ?? '', control)
    // Straight after, because validity moved without any property moving.
    this.refreshFeedback()
  }

  /** Puts the caret in the first empty box. */
  override focus(options?: FocusOptions): void {
    this.control?.focus(options)
  }

  /** Empties every box and puts the caret in the first. */
  clear(): void {
    this.requestValue('')
    const control = this.control
    if (control) {
      restoreValue(control, this.value)
      this.pressedAt = 0
      control.focus()
    }
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.committed = this.value
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.toggleState('complete', this.value.length >= this.count)
    this.sync()
    this.placeCaret()
  }

  /**
   * Enter submits the form, as it does in a native text field.
   *
   * On `keypress`, where the platform runs its own implicit submission, so a
   * consumer who prevents the `keydown` for Enter stops this too.
   */
  private readonly handleKeypress = (event: KeyboardEvent): void => {
    if (event.key === 'Enter' && !event.defaultPrevented) {
      submitImplicitly(this.form)
    }
  }

  /** @internal A single line of text counts against implicit submission. */
  protected override get blocksImplicitSubmission(): boolean {
    return true
  }

  /** What one box draws: its character, the mask, the caret, or the placeholder. */
  private renderBox(character: string, at: number): TemplateResult {
    const caret = at === this.caretBox
    const content =
      character !== ''
        ? this.mask
          ? this.maskCharacter
          : character
        : caret
          ? html`<span part="caret"></span>`
          : this.placeholder
            ? html`<span part="placeholder">${this.placeholder}</span>`
            : nothing
    return html`<div
      part="cell${caret ? ' cell-active' : ''}${character === '' ? '' : ' cell-filled'}"
      aria-hidden="true"
    >${content}</div>`
  }

  protected override render(): TemplateResult {
    const separators = separatorsAfter(this.format, this.count)
    /* `renderLabel`, a real `<label for>`, because the field is one control
       now: pressing the words focuses it, and it is named by them. */
    return html`${this.renderLabel()}
      <div
        dir="ltr"
        part="field"
        @click=${this.handlePress}
        @mousedown=${keepFocus}
      >
        <input
          part="control"
          id=${this.controlId}
          style=${UNSEEN}
          .value=${this.value}
          type=${this.mask ? 'password' : 'text'}
          inputmode=${this.type === 'numeric' ? 'numeric' : 'text'}
          autocomplete=${this.autocomplete || nothing}
          aria-describedby=${this.describedBy ?? nothing}
          aria-invalid=${this.invalidity ?? nothing}
          aria-required=${this.required ? 'true' : nothing}
          ?disabled=${this.isDisabled}
          ?readonly=${this.readOnly}
          @blur=${this.handleBlur}
          @focus=${this.handleFocus}
          @input=${this.handleInput}
          @keydown=${this.handleKeydown}
          @keypress=${this.handleKeypress}
          @paste=${this.handlePaste}
        />${Array.from({ length: this.count }, (_, at) => {
          const separator = separators[at]
          return html`${this.renderBox(this.value[at] ?? '', at)}${
            separator
              ? html`<span part="separator" aria-hidden="true">${separator}</span>`
              : nothing
          }`
        })}
      </div>
      ${this.renderHint()}${this.renderFeedback()}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-pin-input': HelixHeadlessPinInput
  }
}
