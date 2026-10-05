import {
  AriaForwardController,
  customElement,
  fillTemplate,
  HelixCompleteEvent,
  HelixFormElement,
  MixinControllerValue,
  MixinField,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { cleanCode } from '../code.js'
import { separatorsAfter } from '../format.js'

/** What a cell accepts, which decides the keyboard a phone offers. */
export type PinType = 'alphanumeric' | 'numeric' | 'text'

/** How typed letters are cased: as typed, or turned upper or lower case. */
export type PinCase = 'lower' | 'preserve' | 'upper'

/**
 * @summary A field for a short code, with one box for each character.
 *
 * @description
 * Each cell is its own `<input>`, so every box has a real focus ring, caret,
 * and tab stop.
 *
 * Input longer than one character is treated as a paste, in any cell. This
 * covers pasting, a browser autofilling an SMS code, and a password manager,
 * which all put the whole code into the focused box. A six-character code that
 * arrives in cell three fills from cell three.
 *
 * The code is one value to a form. The cells are in a shadow root and submit
 * nothing. The host is form-associated and submits the joined string, which
 * also carries validity and responds to a form reset.
 *
 * Only the first cell has `autocomplete="one-time-code"`, because the hint
 * applies to the whole field.
 *
 * `autosubmit` submits the form once the last box is filled, through the form's
 * default button where there is one. `format` draws separators between the
 * boxes, such as the dash in `###-###`, as text a screen reader skips. Delete
 * removes the character in the focused box and pulls the rest of the code
 * back, as Backspace removes the one before it.
 *
 * The row of cells always runs left to right, with `dir="ltr"`, including in
 * Arabic and Hebrew. The first box is the leftmost, a paste fills to the right,
 * and the right arrow moves to the next box. The label, hint, and feedback
 * follow the page's direction.
 *
 * **Keyboard.** Each box is a tab stop of its own, as each is a real input.
 *
 * | Key | What it does |
 * |---|---|
 * | A character | Fills the box and moves to the next one. A longer run is read as a paste. |
 * | Left, Right | Moves to the box before or after. |
 * | Home, End | Moves to the first box, or to the box after the last character. |
 * | Backspace | In an empty box, clears the box before it and moves there. |
 * | Delete | Removes the character in the box and pulls the rest of the code back. |
 * | Enter | Submits the form. |
 *
 * The row has `role="group"` and the field's name, and each box is named by
 * `cell-label`, such as "Character 2 of 6". `helix-complete` is a
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
 * @csspart cell - One box.
 * @csspart feedback - The message that says what is wrong with the code.
 * @csspart field - The row of boxes, ordered left to right in every language.
 * @csspart hint - The help under the boxes, shown while there is no feedback.
 * @csspart label - The label above the boxes.
 * @csspart separator - The text `format` draws between two boxes.
 *
 * @cssstate complete - Every box holds a character.
 * @cssstate invalid - The control has an error to show, from the browser's validation or from your `feedback`.
 */
@customElement('helix-headless-pin-input')
export class HelixHeadlessPinInput extends MixinControllerValue(MixinField(HelixFormElement)) {
  /* A consumer's `aria-describedby` names ids in their own tree and the control
     is in this shadow root, so the reference has to be carried down as an
     element rather than copied as an id. See `AriaForwardController`: measured
     in Chrome's own tree, the host held the description and the control the
     reader is actually on was exposed without it. */
  protected readonly aria = new AriaForwardController(this, {
    /* The group, which names the row. Forwarded to the first box, a host
       `aria-labelledby` replaced that box's "Character 1 of 4" and left the
       group and every other box without the field's name. */
    target: () => this.partNamed('field'),
  })

  /** @internal The element a missing name is checked on: the row of cells, so the name of one cell does not count as the name of the field. */
  protected override get namedControl(): HTMLElement | null {
    return this.partNamed('field')
  }

  /** Typed or dragged, so every edit is announced. See `announcesInput`. */
  protected override readonly announcesInput = true

  /**
   * The autofill hint for the browser, set on the first box only.
   *
   * `one-time-code` is why this defaults to anything at all: it is the token
   * that lets a phone offer the code out of a message. Later cells stay `off`
   * for the reason in the class comment above, that six cells each offering
   * the same code is one offer made six times.
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
   * Accessible name for one box, with `{index}` and `{length}` filled in.
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
   * Whether the characters are hidden, the way a password is.
   */
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
   * Empty by default, because a row of boxes already reads as a row of boxes.
   */
  @property()
  placeholder = ''

  /**
   * Whether the boxes block input. A read-only code still submits its value.
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
   * attribute no consumer's markup had. The area rules carry the sentence
   * "reflect only what CSS selects on". The real inputs take it as a binding,
   * which is what makes the keyboard follow.
   */
  @property()
  type: PinType = 'numeric'

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

  /** Everything this box would accept, with the rest dropped and cased. */
  private clean(text: string): string {
    return cleanCode(text, this.type, this.case)
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
       one compact string and a gap in the middle of it does not exist: unclamped,
       the boxes and the value disagree about where the reader typed.

       It reads correctly in both directions. Pasting a whole code while the
       caret happens to sit in box three fills from the start, which is what a
       reader pasting a code means. Pasting two characters into box three of a
       field with two already in it fills from box three, because that is where
       the end was. */
    const start = Math.min(from, this.value.length)
    const characters = this.characters
    for (let at = 0; at < cleaned.length && start + at < this.count; at += 1) {
      characters[start + at] = cleaned[at] as string
    }
    const next = characters.join('')
    const filled = Math.min(this.count - 1, start + cleaned.length)
    const applied = this.requestValue(next)
    this.updateComplete.then(() => {
      this.paint()
      this.cells[filled]?.focus()
      this.cells[filled]?.select()
      /* Only a code the element took. A refused last character left the
         shorter code in place, and announcing the refused one sent an
         auto-submit a code the field does not hold. */
      if (applied && this.value === next && next.length === this.count) {
        this.dispatchEvent(new HelixCompleteEvent({ value: next }))
        /* And a native `change`, because a filled code is this control's
           commit. There is no inner control to relay one from: six boxes each
           fire their own, and none of them means the code is entered. */
        this.commit()
        if (this.autosubmit) {
          this.submitImplicitly()
        }
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
    // Stopped for the reason `Input.handleInput` gives: the inner control's own
    // `input` is composed and would reach a consumer beside this element's.
    event.stopPropagation()
    const cell = event.target as HTMLInputElement
    const at = this.cells.indexOf(cell)
    if (at === -1) {
      return
    }
    /* **An emptied box is a deletion, and without this branch it is
       unreachable.** A Backspace in a *filled* box is the browser's own: the
       keydown handler leaves it alone, the character goes, and `input` arrives
       carrying "". That falls through to `write`, which returns early on empty,
       and then `paint` puts the character straight back. Only real keystrokes
       reproduce it: dispatched events do not, which is why the specs pass over
       it.

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
    // A read-only box still takes a paste event, and the keys are guarded too.
    if (at === -1 || this.isDisabled || this.readOnly) {
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
   *
   * Home goes to the first box and End to the end of the code, the box after
   * its last character, which is where the caret goes in a single text field.
   */
  private readonly handleKeydown = (event: KeyboardEvent): void => {
    const cell = event.target as HTMLInputElement
    const at = this.cells.indexOf(cell)
    if (at === -1 || this.isDisabled || this.readOnly) {
      return
    }
    /* Not `inlineStep`: the row is left to right whatever the page, so the key
       pointing right is the one that moves on in every script. */
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    const to =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? Math.min(this.value.length, this.count - 1)
          : at + step
    if (event.key === 'Delete' && at < this.value.length) {
      /* The character in this box goes and the rest of the code moves back
         one, the way Delete works in one text field. */
      const characters = this.characters
      characters.splice(at, 1)
      this.requestValue(characters.join('').replace(/\s+$/, ''))
      this.updateComplete.then(() => {
        this.paint()
        this.cells[at]?.focus()
      })
    } else if (event.key === 'Backspace' && cell.value === '' && at > 0) {
      const characters = this.characters
      characters[at - 1] = ''
      this.requestValue(characters.join('').replace(/\s+$/, ''))
      this.updateComplete.then(() => {
        this.paint()
        this.cells[at - 1]?.focus()
      })
    } else if (to !== at && to >= 0 && to < this.count) {
      this.cells[to]?.focus()
      this.cells[to]?.select()
    } else {
      return
    }
    event.preventDefault()
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
   * `value` and then has a reader tab through the row was told the reader had
   * entered a code. `change` on a field means "the reader had a go at this",
   * `MixinField` treats it as exactly that, and announcing a value the consumer
   * set themselves is a false positive rather than the safe half of a trade.
   *
   * **The narrower divergence that is left** is a script assigning while the row
   * is focused, where the platform stays silent because no user edit happened
   * and this commits on the way out. Closing it needs a dirty flag set from real
   * cell input rather than a baseline, which is more machinery than the case has
   * earned: a consumer writing to a field the reader is inside is already in a
   * fight with them.
   *
   * Seeded in `firstUpdated`, a code in the markup being committed by whoever
   * wrote it, and re-taken on every arrival from outside the row.
   */
  private committed = ''

  /** Selecting on focus, so typing replaces rather than appending. */
  private readonly handleFocus = (event: FocusEvent): void => {
    ;(event.target as HTMLInputElement).select()
  }

  /**
   * Whether focus is currently somewhere inside the row.
   *
   * **The arrival is a transition, not a `relatedTarget` reading**, which is
   * what the exit still does. `relatedTarget` does not work on the way in for
   * two reasons and the second decides it. Every character moves focus to the
   * next box, so an unguarded `focusin` re-baselines on each keystroke and the
   * row can never report anything: measured, the three commit specs went silent
   * at once. And `focusin` carries `relatedTarget` in a browser and not in
   * happy-dom, so a guard written on it holds in production and not in the
   * specs, which is the worse half. This flag needs neither: entering is
   * `focusin` while it is `false`, and nothing else is.
   */
  private within = false

  /**
   * Takes the baseline when focus arrives from outside the row.
   *
   * The value at arrival is what the platform compares against, and the table
   * on `committed` is why.
   */
  private readonly handleFocusIn = (): void => {
    if (this.within) {
      return
    }
    this.within = true
    this.committed = this.value
  }

  /**
   * Commits when focus leaves the row.
   *
   * `change` is one of the two events `MixinField` reads as "the reader has had
   * a go at this", so without this a code that was never completed is never
   * `touched` and its own `tooShort` message cannot show: two boxes of four
   * filled and tabbed away from is answered with nothing at all. `Input` gets
   * this for free by relaying its control's own `change`; here the cells each
   * fire one, none of them means the code is entered, and neither does any
   * single one of them mean the reader has left.
   *
   * **Focus leaving the row, and not a cell.** Every character moves focus to
   * the next box, so a per-cell blur would commit on every keystroke, which is
   * the fault this exists to fix pointed the other way.
   */
  private readonly handleFocusOut = (event: FocusEvent): void => {
    if (this.cells.includes(event.relatedTarget as HTMLInputElement)) {
      return
    }
    this.within = false
    this.commit()
  }

  /**
   * Announces the code as entered, from whichever moment reached it first.
   *
   * **One writer, because the fact has two moments and only one meaning.** A
   * filled code and a row being left are both "the reader is done with this".
   * Dispatching from either site directly is how a moment gets added that fires
   * without baselining.
   *
   * Silent when nothing moved since the baseline, which is what makes it safe
   * to call from both: completing a code that is already the committed one, or
   * leaving a row nobody edited, says nothing.
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
   * applies to anything that is not nothing. That is the right split for a code
   * as well: two of four characters is not an optional code omitted, it is a
   * code got wrong, and submitting it would send a fragment. The gate on the
   * message is `touched` rather than `required`, which is what stops a reader
   * being told off before they have had a go.
   *
   * `execCommand('insertText')` is not enough to measure this: `tooShort`
   * applies only to a value the user edited, and the first run of the probe
   * reported every case valid because nothing had set that flag.
   */
  private sync(): void {
    this.internals.setFormValue(this.value)
    const first = this.cells[0]
    if (!first) {
      return
    }
    if (this.required && this.value === '') {
      this.internals.setValidity(
        { valueMissing: true },
        this.valueMissingMessage || 'Please fill in this field.',
        first,
      )
    } else if (this.value !== '' && this.value.length < this.count) {
      this.internals.setValidity(
        { tooShort: true },
        fillTemplate(this.tooShortMessage || 'Please enter all {length} characters.', {
          length: this.count,
        }),
        first,
      )
    } else {
      this.internals.setValidity({}, '', first)
    }
    // Straight after, because validity moved without any property moving.
    this.refreshFeedback()
  }

  /** Puts the caret in the first empty box. */
  override focus(options?: FocusOptions): void {
    const cells = this.cells
    const at = Math.min(this.value.length, cells.length - 1)
    cells[at]?.focus(options)
  }

  /** Empties every box and moves focus to the first. */
  clear(): void {
    this.requestValue('')
    this.updateComplete.then(() => {
      this.paint()
      this.cells[0]?.focus()
    })
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.committed = this.value
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.toggleState('complete', this.value.length >= this.count)
    this.paint()
    this.sync()
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

  protected override render(): TemplateResult {
    const characters = this.characters
    const separators = separatorsAfter(this.format, this.count)
    /* `renderGroupLabel` and not `renderLabel`, which is what every other
       grouped control here uses. `renderLabel` emits `for="control"` and no
       element in this template carries that id, because a pin input is a row of
       cells and not one control: the visible label pointed at nothing, so
       pressing it focused nothing and the group had no accessible name at all.
       The row is named by the group label instead, which is in this tree. */
    return html`${this.renderGroupLabel()}
      <div
        dir="ltr"
        part="field"
        role="group"
        aria-describedby=${this.describedBy ?? nothing}
        aria-labelledby=${this.labeled ? this.labelId : nothing}
        @focusin=${this.handleFocusIn}
        @focusout=${this.handleFocusOut}
      >
        ${characters.map(
          (character, at) => html`<input
            part="cell"
            .value=${character}
            type=${this.mask ? 'password' : 'text'}
            placeholder=${this.placeholder || nothing}
            inputmode=${this.type === 'numeric' ? 'numeric' : 'text'}
            autocomplete=${at === 0 ? this.autocomplete || nothing : 'off'}
            aria-label=${fillTemplate(this.cellLabel, { index: at + 1, length: this.count })}
            aria-invalid=${this.invalidity ?? nothing}
            ?disabled=${this.isDisabled}
            ?readonly=${this.readOnly}
            @focus=${this.handleFocus}
            @input=${this.handleInput}
            @keydown=${this.handleKeydown}
            @keypress=${this.handleKeypress}
            @paste=${this.handlePaste}
          />${
            separators[at]
              ? html`<span part="separator" aria-hidden="true">${separators[at]}</span>`
              : nothing
          }`,
        )}
      </div>
      ${this.renderHint()}${this.renderFeedback()}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-pin-input': HelixHeadlessPinInput
  }
}
