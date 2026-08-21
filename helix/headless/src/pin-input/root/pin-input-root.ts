import {
  customElement,
  HelixCompleteEvent,
  HelixFormElement,
  MixinControllerValue,
  MixinField,
} from '@helix-io/core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/** What a cell accepts, which decides the keyboard a phone offers. */
export type PinType = 'alphanumeric' | 'numeric' | 'text'

/**
 * @summary A short code, one character to a box.
 *
 * @description
 * **One `<input>` per cell, rather than one input drawn as cells.** Both are
 * built in the wild and the trade is real: a single field autofills perfectly
 * and needs a drawn caret nobody can style well, and separate fields give every
 * box a real focus ring, a real caret and a real tab stop for free. This takes
 * the second, and then closes autofill's gap rather than living with it, below.
 *
 * **Anything longer than one character is treated as a paste, wherever it
 * lands.** That covers the obvious case and two that are not: a browser
 * autofilling an SMS code drops the whole thing into whichever box is focused,
 * and a password manager does the same. So a six-character arrival in cell three
 * fills from cell three rather than being truncated to its first character,
 * which is what a per-cell `maxlength` would have done silently.
 *
 * **The code is one value to a form.** The cells are inside a shadow root and
 * submit nothing on their own; the host is form-associated and reports the
 * joined string, which is also what carries validity and answers a reset.
 *
 * `autocomplete="one-time-code"` is on the first cell only. It is a hint about
 * the field as a whole, and repeating it on six boxes offers a browser six
 * places to put one code.
 *
 * @since 0.1.0
 * @status experimental
 * @category forms
 * @aliases PinField, OTP, One-time code, Verification code, InputPin
 * @documentation https://helix.fusion.dev/components/pin-input
 *
 * @event {HelixInputEvent} helix-input - Fired as the code changes, and cancelable.
 * @event {HelixCompleteEvent} helix-complete - Fired when the last box is filled.
 *
 * @csspart field - The row of boxes.
 * @csspart cell - One box.
 */
@customElement('helix-base-pin-input')
export class HelixBasePinInput extends MixinControllerValue(MixinField(HelixFormElement)) {
  /** Typed or dragged, so every edit is announced. See `announcesInput`. */
  protected override readonly announcesInput = true

  /** How many characters the code has. */
  @property({ type: Number })
  length = 6

  /**
   * What a box accepts, which decides the keyboard a phone offers.
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
   * **Not reflected**, and it was until this component's own server spec caught
   * it: nothing selects on it, so all reflection did was write `type="numeric"`
   * onto every `<helix-pin-input>` ever rendered, an attribute no consumer's
   * markup had. That is the fault `Input`'s own `type` had and the reason the
   * area rules carry the sentence "reflect only what CSS selects on". The real
   * inputs take it as a binding, which is what makes the keyboard follow.
   */
  @property()
  type: PinType = 'numeric'

  /** Whether the characters are hidden, the way a password is. */
  @property({ reflect: true, type: Boolean })
  mask = false

  /**
   * What an empty box shows, usually a single dot.
   *
   * The platform's own placeholder, on each cell, rather than a character
   * drawn behind the field: it clears the moment anything is typed, it is
   * already excluded from the accessible value, and it works the same under
   * `mask`, where the cell is a password input and a hand-drawn glyph would
   * have to know that.
   *
   * Empty by default, because a row of boxes already reads as a row of boxes
   * and a dot in each is a choice about how much the field should announce
   * itself before anybody has touched it.
   */
  @property()
  placeholder = ''

  /** Whether the boxes refuse input while still submitting their value. */
  @property({ attribute: 'read-only', reflect: true, type: Boolean })
  readOnly = false

  /** Accessible name for one box, with `{index}` and `{length}` filled in. */
  @property({ attribute: 'cell-label' })
  cellLabel = 'Character {index} of {length}'

  /** Focus is delegated, so the host is never the focus target. */
  static override shadowRootOptions: ShadowRootInit = {
    ...HelixFormElement.shadowRootOptions,
    delegatesFocus: true,
  }

  /** How many boxes there are, clamped once so every reader agrees. */
  private get count(): number {
    return Math.max(1, Math.floor(this.length) || 1)
  }

  private get cells(): HTMLInputElement[] {
    return [...this.renderRoot.querySelectorAll<HTMLInputElement>('[part="cell"]')]
  }

  /** The code as characters, padded to the row so every box has one to show. */
  private get characters(): string[] {
    return Array.from({ length: this.count }, (_, at) => this.value[at] ?? '')
  }

  /** Everything this box would accept, with the rest dropped. */
  private clean(text: string): string {
    const trimmed = text.trim()
    if (this.type === 'numeric') {
      return trimmed.replace(/\D/g, '')
    }
    if (this.type === 'alphanumeric') {
      return trimmed.replace(/[^0-9A-Za-z]/g, '')
    }
    return trimmed
  }

  /**
   * Writes a run of characters from one box onward.
   *
   * The single path for typing, pasting and autofill alike, because they are
   * the same act at different lengths and splitting them is how the three
   * disagree about trimming, about the cursor, and about what happens at the
   * end.
   */
  private write(from: number, text: string): void {
    const cleaned = this.clean(text)
    if (cleaned === '') {
      return
    }
    /* **A code has no holes in it**, so a character cannot land past the end of
       what is already there. Clamped rather than allowed, because the value is
       one compact string and a gap in the middle of it does not exist: writing
       four characters into box three of an empty field produced "4321" and
       showed it in boxes one to four, so the boxes and the value disagreed about
       where the reader had typed.
    
       Clamping is what makes them agree, and it reads correctly in both
       directions. Pasting a whole code while the caret happens to sit in box
       three fills from the start, which is what a reader pasting a code means.
       Pasting two characters into box three of a field with two already in it
       fills from box three, because that is where the end was. */
    const start = Math.min(from, this.value.length)
    const characters = this.characters
    for (let at = 0; at < cleaned.length && start + at < this.count; at += 1) {
      characters[start + at] = cleaned[at] as string
    }
    const next = characters.join('')
    const filled = Math.min(this.count - 1, start + cleaned.length)
    this.requestValue(next)
    this.updateComplete.then(() => {
      this.paint()
      this.cells[filled]?.focus()
      this.cells[filled]?.select()
      if (next.length === this.count) {
        this.dispatchEvent(new HelixCompleteEvent({ value: next }))
      }
    })
  }

  /**
   * Puts the value back into the boxes.
   *
   * The cells are uncontrolled between renders, because Lit will not rewrite an
   * input's `.value` when the bound string has not changed, and a refused
   * keystroke leaves the box holding a character the element rejected. This is
   * the same put-back `Input` does with `restoreValue`, once per box.
   */
  private paint(): void {
    const characters = this.characters
    for (const [at, cell] of this.cells.entries()) {
      const want = characters[at] ?? ''
      if (cell.value !== want) {
        cell.value = want
      }
    }
  }

  private readonly handleInput = (event: Event): void => {
    const cell = event.target as HTMLInputElement
    const at = this.cells.indexOf(cell)
    if (at === -1) {
      return
    }
    /* **An emptied box is a deletion, and this used to be unreachable.** A
       Backspace in a *filled* box is the browser's own: the keydown handler
       leaves it alone, the character goes, and `input` arrives carrying "". That
       fell through to `write`, which returns early on empty, and then `paint`
       put the character straight back. Pressing Backspace on a full code changed
       nothing at all, twice in a row, measured with real keystrokes rather than
       dispatched events, which is why every spec and the whole state audit
       passed over it.
    
       The rest collapse left, which is what the model already requires and what
       a single text field does: "123456" with the 2 deleted is "13456", not a
       hole. Focus stays where the reader was, so the box under the caret now
       holds what followed. */
    if (cell.value === '') {
      const characters = this.characters
      characters[at] = ''
      this.requestValue(characters.join(''))
      this.updateComplete.then(() => {
        this.paint()
        this.cells[at]?.focus()
      })
      return
    }
    /* Longer than one character is a paste or an autofill, whichever box it
       landed in. A per-cell `maxlength` would have silently truncated it to the
       first character and lost the rest. */
    this.write(at, cell.value)
    // And put the box back, in case what arrived was refused or filtered.
    this.updateComplete.then(() => this.paint())
  }

  private readonly handlePaste = (event: ClipboardEvent): void => {
    const cell = event.target as HTMLInputElement
    const at = this.cells.indexOf(cell)
    if (at === -1) {
      return
    }
    // Taken here rather than left to `input`, so the browser does not first put
    // the whole string into one box and fire a change we then have to undo.
    event.preventDefault()
    this.write(at, event.clipboardData?.getData('text') ?? '')
  }

  /**
   * The keys that move between boxes, and the one that clears backwards.
   *
   * Backspace in an empty box goes back and clears the one it lands in, which
   * is what makes a code correctable without the reader hunting for the box
   * they meant. In a full box it does what it always does and is left alone.
   */
  private readonly handleKeydown = (event: KeyboardEvent): void => {
    const cell = event.target as HTMLInputElement
    const at = this.cells.indexOf(cell)
    if (at === -1 || this.isDisabled || this.readOnly) {
      return
    }
    if (event.key === 'Backspace' && cell.value === '' && at > 0) {
      const characters = this.characters
      characters[at - 1] = ''
      this.requestValue(characters.join('').replace(/\s+$/, ''))
      this.updateComplete.then(() => {
        this.paint()
        this.cells[at - 1]?.focus()
      })
    } else if (event.key === 'ArrowLeft' && at > 0) {
      this.cells[at - 1]?.focus()
      this.cells[at - 1]?.select()
    } else if (event.key === 'ArrowRight' && at < this.count - 1) {
      this.cells[at + 1]?.focus()
      this.cells[at + 1]?.select()
    } else {
      return
    }
    event.preventDefault()
  }

  /** Selecting on focus, so typing replaces rather than appending. */
  private readonly handleFocus = (event: FocusEvent): void => {
    ;(event.target as HTMLInputElement).select()
  }

  /** Reports the code and a verdict on it. */
  private sync(): void {
    this.internals.setFormValue(this.value)
    const first = this.cells[0]
    if (!first) {
      return
    }
    if (this.required && this.value === '') {
      this.internals.setValidity({ valueMissing: true }, 'Please fill in this field.', first)
    } else if (this.value !== '' && this.value.length < this.count) {
      this.internals.setValidity(
        { tooShort: true },
        `Please enter all ${this.count} characters.`,
        first,
      )
    } else {
      this.internals.setValidity({}, '', first)
    }
    // Straight after, because validity moved without any property moving.
    this.refreshFeedback()
  }

  /** Puts the caret in the first empty box, which is where a reader resumes. */
  override focus(options?: FocusOptions): void {
    const cells = this.cells
    const at = Math.min(this.value.length, cells.length - 1)
    cells[at]?.focus(options)
  }

  /** Empties every box and returns to the first. */
  clear(): void {
    this.requestValue('')
    this.updateComplete.then(() => {
      this.paint()
      this.cells[0]?.focus()
    })
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.paint()
    this.sync()
  }

  protected override render(): TemplateResult {
    const characters = this.characters
    /* `renderGroupLabel` and not `renderLabel`, which is what every other
       grouped control here uses. `renderLabel` emits `for="control"` and no
       element in this template carries that id, because a pin input is a row of
       cells and not one control: the visible label pointed at nothing, so
       pressing it focused nothing and the group had no accessible name at all.
       The set names itself through `hostAria` instead. */
    return html`${this.renderGroupLabel()}
      <div part="field" role="group" aria-describedby=${this.describedBy ?? nothing}>
        ${characters.map(
          (character, at) => html`<input
            part="cell"
            .value=${character}
            type=${this.mask ? 'password' : 'text'}
            placeholder=${this.placeholder || nothing}
            inputmode=${this.type === 'numeric' ? 'numeric' : 'text'}
            autocomplete=${at === 0 ? 'one-time-code' : 'off'}
            aria-label=${this.cellLabel
              .replaceAll('{index}', String(at + 1))
              .replaceAll('{length}', String(this.count))}
            ?disabled=${this.isDisabled}
            ?readonly=${this.readOnly}
            @focus=${this.handleFocus}
            @input=${this.handleInput}
            @keydown=${this.handleKeydown}
            @paste=${this.handlePaste}
          />`,
        )}
      </div>
      ${this.renderHint()}${this.renderFeedback()}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-pin-input': HelixBasePinInput
  }
}
