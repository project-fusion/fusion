import {
  AriaForwardController,
  customElement,
  drawIcon,
  HelixFormElement,
  holdCaret,
  MixinControllerOpen,
  MixinControllerValue,
  MixinField,
  MixinTokens,
  PopoverController,
  restoreValue,
} from '@fusion.dev/helix-core'
import { x } from '@fusion.dev/helix-icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'

/** A token that answers a request to go, which is what `Tag` is. */
type DismissibleToken = Element & { dismiss(): boolean }

/** Whether a slotted token can be asked to remove itself. */
const asksToGo = (node: Element | undefined): node is DismissibleToken =>
  typeof (node as Partial<DismissibleToken> | undefined)?.dismiss === 'function'

/** A suggestion the panel can highlight and press, which is what `Option` is. */
type SuggestionOption = HTMLElement & {
  active: boolean
  disabled: boolean
  select(): void
  value: string
}

/**
 * Whether a slotted node is an option.
 *
 * **By shape rather than by tag name, and that is not laziness.** The tag
 * differs by tier, `helix-option` against `helix-headless-option`, and a
 * consumer is free to subclass either; a name test would answer no to two of the
 * three. What the panel needs of a suggestion is exactly what is checked here.
 */
const isOption = (node: Element): node is SuggestionOption => 'active' in node && 'value' in node

/**
 * @summary A field that narrows something else, beside what is already narrowing it.
 *
 * @description
 * **The tokens are the consumer's own elements, slotted.** What a filter narrows
 * by belongs to the consumer's model rather than to this element: a facet with a
 * prefix, a saved query, a range. So they are slotted rather than rendered from
 * a list of strings, and removing one is a request this element makes rather
 * than a change it applies. Combobox is the other way round, and that is the
 * difference between the two: its tokens are a view of a selection it owns,
 * drawn from options it was handed.
 *
 * **`value` is the text being typed, not the tokens**, which is what makes this
 * a field a consumer can listen to. Every keystroke announces `input` with the
 * text on the element, so a table narrows as the reader types. The tokens need
 * no reporting back, being markup the consumer already holds.
 *
 * Backspace on an empty field asks the last token to go, through the same
 * `helix-dismiss` its own remove control fires, so a consumer who handled the
 * pointer has already handled the keyboard.
 *
 * **It can suggest what to type next, and it never learns the grammar.** Slot
 * `helix-option` elements into `suggestions` and the field shows them, moves
 * through them with the arrows, and lets Enter press one; the option fires its
 * own `helix-select` and the consumer decides what choosing meant. Deciding
 * *what* to suggest is theirs too: keys before a colon and values after it are
 * the same panel with different contents, which is all a two-level filter is,
 * and the parse that tells them apart belongs where the domain does.
 *
 * **The panel opens when there is something in it and closes when there is
 * not**, rather than on a choice. A reader who picks a key wants its values
 * next, and closing on the choice would shut the panel between two renders. Use
 * `selectionStart` and `setSelectionRange` to write a completion back and put
 * the caret after it, or the next parse reads the wrong term.
 *
 * @since 0.1.0
 * @status experimental
 * @category forms
 * @aliases SearchField, FacetInput, TokenInput
 * @documentation https://helix.fusion.dev/components/filter-input
 *
 * @slot end - After the text, for a count or a control.
 * @slot start - Before the text, for a search icon.
 * @slot suggestions - What could be typed next, as `Option`s, and `Option.Group`s of them.
 * @slot tags - What is already narrowing the results, as `Tag`s.
 *
 * @event {Event} change - Relayed from the input once the reader has finished.
 * @event {HelixBeforeChangeEvent} helix-before-change - Fired as the text changes, and cancelable.
 * @event {HelixBeforeCloseEvent} helix-before-close - Fired before the suggestions go, and cancelable.
 * @event {HelixBeforeOpenEvent} helix-before-open - Fired before the suggestions show, and cancelable.
 * @event {Event} input - Announced once the text has moved.
 * @event {Event} toggle - Says the panel moved, carrying `newState` and `oldState`.
 *
 * @csspart clear - The button that empties the field.
 * @csspart control - The input itself.
 * @csspart feedback - What is wrong with it.
 * @csspart field - The box holding everything.
 * @csspart hint - Help under the field, while nothing is wrong.
 * @csspart label - The question, over the field.
 * @csspart rest - How many tokens did not fit. A `<button>` with `expandable`, a `<span>` without it.
 * @csspart surface - The floating panel the suggestions sit in.
 * @csspart tags - The row the tokens sit in.
 */
@customElement('helix-headless-filter-input')
export class HelixHeadlessFilterInput extends MixinControllerOpen(
  MixinTokens(MixinControllerValue(MixinField(HelixFormElement))),
) {
  /* The description names ids in the consumer's tree and the control is in this
     shadow root, so it is carried down as an element. See `Input`. */
  protected readonly aria = new AriaForwardController(this, {
    target: () => this.renderRoot?.querySelector<HTMLElement>('[part="control"]') ?? null,
  })

  /** Typed, so every keystroke is announced. See `announcesInput`. */
  protected override readonly announcesInput = true

  /**
   * Whether the field offers a button that empties it.
   *
   * The text only. The tokens are the consumer's markup and this element is not
   * entitled to take them out of the document, which is the same reason
   * `hideOverflow` marks the ones over the cap `hidden` rather than removing
   * them.
   */
  @property({ type: Boolean })
  clearable = false

  /**
   * What the clear button is called, since an icon has no name of its own.
   */
  @property({ attribute: 'clear-label' })
  clearLabel = 'Clear'

  /**
   * Shown while the field is empty.
   *
   * Not a label: it goes when typing starts.
   */
  @property()
  placeholder = ''

  /** How many tokens did not fit, which is what the row's count renders. */
  @state()
  private over = 0

  /**
   * Which suggestion the keyboard is on, or `-1` for none.
   *
   * An index rather than a value, unlike Listbox's: these are the consumer's
   * own list and two of them may legitimately carry the same value, a `label`
   * and an `assignee` both called `ada`. Position is what a reader is moving
   * through and it is what stays right when they do.
   */
  @state()
  private activeAt = -1

  /**
   * Whether anything is offering itself to be suggested.
   *
   * **The ARIA follows this rather than being declared once.** A text field
   * carrying `role="combobox"` promises a popup; a filter field that no consumer
   * ever gives options to has none, and saying otherwise sends a screen reader
   * looking for a list that does not exist. So the role, `aria-expanded` and
   * `aria-controls` all arrive with the first option and leave with the last.
   */
  @state()
  private suggesting = false

  /**
   * Whether Escape has closed the panel over text that still has suggestions.
   *
   * Without it the panel is open whenever there is something to show, so Escape
   * would close it and the next render would put it straight back. Cleared by
   * the next keystroke, because that is the reader saying something new.
   */
  private dismissed = false

  /* The same arrangement Combobox uses, and the boundary is both boxes for the
     reason its own note gives: scoped to the surface alone, a press on the field
     counts as outside, so `pointerdown` closes the panel and the field reopens
     it on the `click` that follows. */
  protected readonly panel = new PopoverController(this, {
    anchor: () => this.renderRoot?.querySelector<HTMLElement>('[part="field"]'),
    boundary: (): readonly (Element | null | undefined)[] => [
      this.renderRoot?.querySelector<HTMLElement>('[part="surface"]'),
      this.renderRoot?.querySelector<HTMLElement>('[part="field"]'),
    ],
    offset: () => 4,
    onDismiss: () => this.requestOpen(false),
    placement: 'bottom-start',
    surface: () => this.renderRoot?.querySelector<HTMLElement>('[part="surface"]'),
  })

  /**
   * The caret, held across a value the consumer wrote rather than the reader.
   *
   * Set in `willUpdate` and spent in `updated`, because Lit's `.value` binding
   * lands between the two and takes the selection with it. See `holdCaret`.
   */
  private releaseCaret: (() => void) | undefined

  /** Focus is delegated to the input, so the host is never the focus target. */
  static override shadowRootOptions: ShadowRootInit = {
    ...HelixFormElement.shadowRootOptions,
    delegatesFocus: true,
  }

  private get control(): HTMLInputElement | null {
    return this.renderRoot.querySelector<HTMLInputElement>('[part="control"]')
  }

  private get tokens(): HTMLSlotElement | null {
    return this.renderRoot?.querySelector<HTMLSlotElement>('slot[name="tags"]') ?? null
  }

  /** Whether there is a clear button on screen right now. */
  private get showsClear(): boolean {
    return this.clearable && this.value !== '' && !this.isDisabled
  }

  /**
   * The suggestions, in the order a reader moves through them.
   *
   * **Groups are opened out rather than walked into.** A slot assigns the group
   * element, not the options inside it, so a panel that read only what was
   * assigned would offer nothing at all the moment a consumer reached for
   * `option-group` to say what a run of values belongs to.
   *
   * A disabled option keeps its place on screen and is skipped here, which is
   * the difference between a list that explains why something cannot be chosen
   * and one that pretends it was never there.
   */
  private get suggestions(): SuggestionOption[] {
    const slot = this.renderRoot?.querySelector<HTMLSlotElement>('slot[name="suggestions"]')
    const found: SuggestionOption[] = []
    for (const node of slot?.assignedElements({ flatten: true }) ?? []) {
      if (isOption(node)) {
        found.push(node)
        continue
      }
      for (const child of node.children) {
        if (isOption(child)) {
          found.push(child)
        }
      }
    }
    return found.filter((option) => !option.disabled)
  }

  /**
   * The caret and the selection, under the platform's own names.
   *
   * **Published for the reason `Input` publishes them, and this element needs
   * them more.** The `<input>` is inside this shadow root, so a consumer has no
   * way to ask where the caret is: `querySelector` does not cross the boundary.
   * A grammar that completes what is being typed cannot work without it, because
   * "what is being typed" is the term the caret is in, and after writing a
   * completion back the caret has to be put after it or the next parse reads the
   * wrong term.
   *
   * Zero before there is a control, which is where an empty field's caret would
   * be anyway.
   */
  get selectionDirection(): 'backward' | 'forward' | 'none' {
    return this.control?.selectionDirection ?? 'none'
  }

  /** Where the selection ends, which is the caret when nothing is selected. */
  get selectionEnd(): number {
    return this.control?.selectionEnd ?? 0
  }

  /** Where the selection starts, which is the caret when nothing is selected. */
  get selectionStart(): number {
    return this.control?.selectionStart ?? 0
  }

  /** Moves the caret, or selects a run of the text. */
  setSelectionRange(start: number, end: number, direction?: 'backward' | 'forward' | 'none'): void {
    this.control?.setSelectionRange(start, end, direction)
  }

  /**
   * Every keystroke, cancelable, and put back where it is refused.
   *
   * Stopped for the reason `Input` gives: `input` is composed, so the inner
   * control's own would arrive beside the one the mixin announces and a consumer
   * would hear one keystroke twice, once carrying the value from before it.
   */
  private readonly handleInput = (event: Event): void => {
    event.stopPropagation()
    const control = event.target as HTMLInputElement
    this.requestValue(control.value)
    restoreValue(control, this.value)
    /* Typing is the reader saying something new, so an Escape they pressed over
       the old text no longer stands. The panel comes back on the next render, by
       which time the consumer has answered with suggestions for what is there
       now. */
    this.dismissed = false
    this.settleOpen()
  }

  /** Relayed, because `change` does not cross a shadow boundary on its own. */
  private readonly handleChange = (event: Event): void => {
    event.stopPropagation()
    this.dispatchEvent(new Event('change', { bubbles: true, composed: false }))
  }

  /**
   * Empties the text and gives the caret back.
   *
   * Focus returns to the input rather than staying on a button that is about to
   * disappear, which would otherwise land on the body.
   */
  private readonly handleClear = (): void => {
    this.requestValue('')
    const control = this.control
    if (control) {
      restoreValue(control, this.value)
      control.focus()
    }
  }

  /**
   * Opens the panel when there is something in it, and closes it when there is
   * not.
   *
   * **Derived rather than commanded, which is the whole of how two levels
   * work.** A reader who picks `disposition` wants its values next, and the
   * consumer answers by rendering those values; if picking closed the panel it
   * would shut and reopen between two renders, which a reader sees as a flicker
   * and a screen reader hears as a list going away. Nothing here closes on a
   * choice: the panel goes when the consumer stops offering, which is exactly
   * when a value has been completed and there is nothing left to say.
   *
   * Through `requestOpen` for both directions, so `helix-before-open` and
   * `helix-before-close` still gate it and a consumer who refuses is obeyed.
   * **No guard of its own**, because that method already returns early when the
   * answer has not moved: this runs after every render, and a second guard here
   * would only be a copy of that one going stale.
   */
  private settleOpen(): void {
    this.requestOpen(
      this.suggesting &&
        !this.dismissed &&
        !this.isDisabled &&
        this.contains(document.activeElement),
    )
  }

  /** Moves the highlight, wrapping, and opens the panel if it was closed. */
  private move(by: number): void {
    const options = this.suggestions
    if (options.length === 0) {
      return
    }
    if (!this.open) {
      this.dismissed = false
      this.settleOpen()
    }
    const from = this.activeAt
    /* From nothing, Down lands on the first and Up on the last, which is what
       every list a reader has met does. */
    this.activeAt =
      from < 0 ? (by > 0 ? 0 : options.length - 1) : (from + by + options.length) % options.length
  }

  /* `value` rather than the control's own text, which is what the mixin's note
     about passing `typed` is for: here the two agree, and saying which one is
     meant keeps it true if that ever stops being so. */
  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (this.tokenKeydown(event, this.value)) {
      return
    }

    /* Nothing below means anything without a panel, and a field that swallowed
       these keys anyway would be one a reader cannot press Enter in. */
    if (!this.suggesting) {
      return
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        this.move(1)
        return
      case 'ArrowUp':
        event.preventDefault()
        this.move(-1)
        return
      case 'Home':
        if (this.open) {
          event.preventDefault()
          this.activeAt = 0
        }
        return
      case 'End':
        if (this.open) {
          event.preventDefault()
          this.activeAt = this.suggestions.length - 1
        }
        return
      case 'Escape':
        if (this.open) {
          /* Stopped as well as prevented: a filter field is often inside a
             dialog, and Escape that closes the panel must not also close the
             thing the panel is in. */
          event.preventDefault()
          event.stopPropagation()
          this.dismissed = true
          this.activeAt = -1
          this.requestOpen(false)
        }
        return
      case 'Enter': {
        const active = this.suggestions[this.activeAt]
        if (!this.open || !active) {
          /* No highlight means Enter is the form's, which is what a reader
             pressing it after typing a whole query means by it. */
          return
        }
        /* **The option's own `select`, not a synthetic click.** It announces
           from a handler on its inner part rather than from the host, so a click
           on the host reaches nothing; and asking an element to make its own
           choice is the API rather than an imitation of a pointer. It fires
           `helix-select`, cancelable and composed, so the consumer hears the
           same event from the keyboard as from a press and this element never
           has to say what choosing means. */
        event.preventDefault()
        active.select()
        return
      }
      default:
    }
  }

  /**
   * What is on offer, settled before the render that draws it.
   *
   * **Not left to `slotchange`, for the reason the token row is not.** That
   * event reports the assignment moving and nothing else, and it does not fire
   * at all under the harness these are tested in, so a panel that learned only
   * from it would be a panel that never opened. Reading the slot every update is
   * what makes the answer true whenever anyone asks.
   *
   * State only. Opening is an announcement and belongs after the render, which
   * is why `settleOpen` is not called from here.
   */
  private refreshSuggesting(): void {
    const options = this.suggestions
    this.suggesting = options.length > 0
    /* Clamped rather than kept: the list under the highlight has just been
       replaced, and an index into the old one points at whatever happens to sit
       there now. Reset, so a reader who has not moved since is not holding a
       highlight they never put anywhere. */
    this.activeAt = this.activeAt < options.length ? this.activeAt : -1
  }

  /** The panel again, whenever what is in it changes. */
  private readonly handleSuggestions = (): void => {
    this.refreshSuggesting()
    this.settleOpen()
  }

  /** Focus arriving in the field is a reader asking what they can type. */
  private readonly handleFocusIn = (): void => {
    this.settleOpen()
  }

  /**
   * Focus leaving the element closes it.
   *
   * `relatedTarget` and not a timer: a press inside the panel moves focus within
   * this element and must not close what is being pressed.
   */
  private readonly handleFocusOut = (event: FocusEvent): void => {
    const next = event.relatedTarget
    if (next instanceof Node && this.contains(next)) {
      return
    }
    this.activeAt = -1
    this.requestOpen(false)
  }

  /** The row again, whenever what is in it changes. */
  private readonly handleTokens = (): void => {
    this.over = this.hideOverflow(this.tokens)
  }

  /**
   * Asks the last token to go, rather than taking it.
   *
   * `dismiss()` is the tag's own, so this is the code path its remove control
   * already runs on a press: the consumer hears one `helix-dismiss`, cancels it
   * or removes the element, and never learns which of the two asked. A slotted
   * node that is not a `Tag` has no such method and is left alone, because
   * hiding a consumer's element on Backspace would be this element deciding
   * something it was never given.
   */
  protected override removeLastToken(): void {
    const last = this.tokens?.assignedElements({ flatten: true }).at(-1)
    if (asksToGo(last)) {
      last.dismiss()
    }
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    /* Never before the first update, which is the one the server does: there is
       no render root to query there. See `Input`. */
    if (!this.hasUpdated) {
      return
    }
    const control = this.control
    if (changed.has('value') && control && this.shadowRoot?.activeElement === control) {
      this.releaseCaret = holdCaret(control)
    }
    /* **The row is settled before this render, not after it.** `slotchange`
       reports the assignment moving and nothing else, so a cap that changed
       would otherwise leave the count saying what the old one allowed. Doing it
       here puts the new number in the render already under way; doing it in
       `updated` would need a second one, and a consumer who awaited
       `updateComplete` would read the count from before the change. */
    this.handleTokens()
    this.refreshSuggesting()
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    /* The first assignment, which `willUpdate` could not see: there was no
       render root to query until this render made one. */
    this.handleTokens()
    this.refreshSuggesting()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.releaseCaret?.()
    this.releaseCaret = undefined
    this.internals.setFormValue(this.value)
    this.markActive()
    /* **After the render, because opening is an announcement.** `requestOpen`
       fires `helix-before-open` and `toggle`, and an element that dispatched
       those from inside its own render would hand a consumer a half-drawn
       element to read. Idempotent, so the second pass this may schedule settles
       on the same answer and stops. */
    this.settleOpen()
  }

  /**
   * Marks the highlighted suggestion, and tells the control which one it is.
   *
   * **Two halves, and neither does the other's job.** `active` is the option's
   * own published flag and is what a stylesheet draws from. The control carries
   * `aria-activedescendant`, because focus never leaves the text: a screen
   * reader is told what is highlighted by the field the caret is in, not by the
   * list.
   *
   * Through `ariaActiveDescendantElement` rather than an id, which is what
   * `Listbox` reaches for and for the same two reasons: it crosses a shadow
   * boundary, where an `aria-activedescendant` naming an id cannot, and it needs
   * no ids invented for the consumer's own elements. Feature-tested, because
   * where it is missing the assignment is a silent no-op rather than an error,
   * and the highlight is still drawn.
   */
  private markActive(): void {
    const options = this.suggestions
    const active = this.open ? options[this.activeAt] : undefined
    for (const [at, option] of options.entries()) {
      option.active = this.open && at === this.activeAt
    }
    const control = this.control
    if (control && 'ariaActiveDescendantElement' in control) {
      ;(
        control as HTMLInputElement & { ariaActiveDescendantElement: Element | null }
      ).ariaActiveDescendantElement = active ?? null
    }
    /* Into view, since the highlight moves with a key and the panel scrolls.
       `nearest` so a list already showing it does not jump. */
    active?.scrollIntoView({ block: 'nearest' })
  }

  /** Puts the caret in the field, the way a label pointing at one would. */
  override focus(options?: FocusOptions): void {
    this.control?.focus(options)
  }

  protected override render(): TemplateResult {
    /* The row is always rendered, unlike Combobox's, because a slot that is not
       in the tree assigns nothing: guarding it on a count would mean the count
       could never leave zero. It costs no box either way, `[part="tags"]` being
       `display: contents` with an empty slot inside it. */
    return html`${this.renderLabel()}
    <div part="field" @focusin=${this.handleFocusIn} @focusout=${this.handleFocusOut}>
      <slot name="start"></slot>
      ${this.renderTokenRow(
        html`<slot name="tags" @slotchange=${this.handleTokens}></slot>`,
        this.over,
      )}
      <input
        part="control"
        id="control"
        type="text"
        .value=${this.value}
        name=${this.name || nothing}
        placeholder=${this.placeholder || nothing}
        aria-describedby=${this.describedBy ?? nothing}
        role=${this.suggesting ? 'combobox' : nothing}
        aria-autocomplete=${this.suggesting ? 'list' : nothing}
        aria-controls=${this.suggesting ? 'suggestions' : nothing}
        aria-expanded=${this.suggesting ? (this.open ? 'true' : 'false') : nothing}
        ?disabled=${this.isDisabled}
        ?required=${this.required}
        @input=${this.handleInput}
        @change=${this.handleChange}
        @keydown=${this.handleKeydown}
      />
      <slot name="end"></slot>
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
    </div>
    <!-- **Always rendered, and hidden rather than absent**, for the reason the
         token row is: a slot that is not in the tree assigns nothing, so a panel
         built only once there were options could never learn that there are
         any. A manual popover puts it in the top layer, so it is not clipped by
         a scrolling table or an overflow on an ancestor. -->
    <div part="surface" id="suggestions" role="listbox" popover="manual" ?hidden=${!this.open}>
      <slot name="suggestions" @slotchange=${this.handleSuggestions}></slot>
    </div>
    ${this.renderHint()}${this.renderFeedback()}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-filter-input': HelixHeadlessFilterInput
  }
}
