import {
  AriaForwardController,
  customElement,
  drawIcon,
  type FacetDetail,
  HelixFacetEvent,
  HelixFormElement,
  holdCaret,
  MixinControllerOpen,
  MixinControllerValue,
  MixinField,
  MixinTokens,
  PopoverController,
  restoreValue,
  scrollItemIntoView,
} from '@fusion.dev/helix-core'
import { x } from '@fusion.dev/helix-icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import type { HelixHeadlessFilterField } from '../field/filter-field.js'
import { readFilterText } from '../grammar.js'
import type { HelixHeadlessFilterMenu } from '../menu/filter-menu.js'

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
 * **By shape rather than by tag name, and that is not laziness.** Each tier
 * registers its own option under its own name, and a consumer is free to
 * subclass either; a name test would answer no to two of the three. What the
 * panel needs of a suggestion is exactly what is checked here.
 */
const isOption = (node: Element): node is SuggestionOption => 'active' in node && 'value' in node

/**
 * @summary A text field for filters, with the active filters shown in it as tokens.
 *
 * @description
 * Tokens are your own elements, slotted in. A filter can be a facet with a
 * prefix, a saved query, or a range, and these belong to your model, so the
 * element does not render tokens from a list of strings. Removing a token is a
 * request the element fires, and you apply it. Combobox works the other way:
 * its tokens show a selection it owns, drawn from the options it was given.
 *
 * `value` is the typed text. Every keystroke fires `input` with the text on the
 * element, so a table can narrow as the user types. Tokens are not reported,
 * because they are markup you already hold. Backspace in an empty field fires
 * `helix-dismiss` on the last token, the same event its remove control fires,
 * so one handler covers the pointer and the keyboard.
 *
 * **Typed filters.** The field parses only the fields you declare. Write
 * `FilterField` elements, usually inside the `FilterMenu` slotted into `start`,
 * so the picker and the text share one set. On Enter, the field reads the text
 * against them. `disposition:refunded,settled` and `-disposition:refunded` fire
 * `helix-facet` exactly as ticking those values in the picker would, and the
 * parsed text is removed. Everything else stays, so `refund tuesday
 * disposition:settled` is a filter and a search at once. Helix defines the
 * punctuation and you define every word. `grammar.ts` has the full rule, so
 * read it before you rely on it. A field with no `FilterField` in it parses
 * nothing.
 *
 * A field whose values cannot be listed, such as `assignee:ada`, goes directly
 * inside this element, outside the menu. It is not assigned to a slot, so
 * nothing draws it and the menu has no page for it, and the grammar still reads
 * it.
 *
 * **Suggestions.** Slot options into `suggestions` and the field shows them,
 * moves through them with the arrow keys, and presses one on Enter. The option
 * fires its own `helix-select`, and you decide what choosing it means. Keys
 * before a colon and values after it use the same panel with different
 * contents. `readFilterText` is exported so you can narrow the panel against
 * partly typed text. The panel opens when it has options and closes when it has
 * none, and a choice does not close it, so after picking a key you see its
 * values next. Use `selectionStart` and `setSelectionRange` to write a
 * completion back and put the caret after it, or the next parse reads the wrong
 * term.
 *
 * **State.** Three things have three different owners:
 *
 * - `value` is the text. The user types, the element applies it, and `input`
 *   reports it. Setting `value` seeds or corrects the text, and the next
 *   keystroke overwrites it, even in React. To control the value, cancel
 *   `helix-before-change` and write the value you want, as with every field in
 *   this library. `default-value` seeds the field.
 * - `open` is the suggestions panel. Cancel `helix-before-open` or
 *   `helix-before-close` to control it, and use `default-open` to seed it.
 * - Tokens are your elements in a slot and hold no state. A token goes when you
 *   remove it from your markup after `helix-dismiss`. A `FilterChip` naming a
 *   declared field works differently, because the picker holds what is ticked
 *   and removing the chip alone would leave its value ticked in the hidden
 *   menu. Its dismissal is treated as the field being filtered by nothing, so
 *   it fires `helix-facet` like every other change, and the chip goes when the
 *   filter goes.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @aliases SearchField, FacetInput, TokenInput
 * @documentation https://fusion.dev/helix/components/filter-input
 *
 * @slot end - Content after the text, such as a count or a control.
 * @slot start - Content before the text, such as a search icon.
 * @slot suggestions - Suggestions for what to type next, as `Option`s and `Option.Group`s.
 * @slot tags - The active filters, as `FilterChip`s or `Tag`s.
 *
 * @event {Event} change - Fired from the input when the user finishes editing the text.
 * @event {HelixBeforeChangeEvent} helix-before-change - Fired as the text changes. Cancelable: call `preventDefault()` to keep the current text.
 * @event {HelixBeforeCloseEvent} helix-before-close - Fired before the suggestions close. Cancelable: call `preventDefault()` to keep them open.
 * @event {HelixBeforeOpenEvent} helix-before-open - Fired before the suggestions open. Cancelable: call `preventDefault()` to keep them closed.
 * @event {HelixDismissEvent} helix-dismiss - Fired when the user removes a token with its remove button or with Backspace in an empty field. A `FilterChip` that names a declared field sends `helix-facet` instead. Cancelable: call `preventDefault()` to keep the token.
 * @event {HelixFacetEvent} helix-facet - Fired when a filter changes, whether it was typed, picked, or removed. Cancelable: call `preventDefault()` to leave the text and the chip as they were.
 * @event {HelixSelectEvent} helix-select - Fired by an option in `suggestions` when it is chosen, and bubbles out of the field. Cancelable: call `preventDefault()` to stop other listeners acting on it. The field takes no action on a choice; you decide what it does.
 * @event {Event} input - Fired when the text changes.
 * @event {Event} toggle - Fired when the suggestions panel opens or closes, with `newState` and `oldState`.
 *
 * @csspart clear - The button that empties the field.
 * @csspart control - The input itself.
 * @csspart feedback - The error message under the field.
 * @csspart field - The box that holds everything.
 * @csspart hint - The help text under the field, shown while there is no error.
 * @csspart label - The label above the field.
 * @csspart lead - The box before the text that holds the `start` slot.
 * @csspart rest - The count of tokens that did not fit. It is a `<button>` with `expandable` and a `<span>` without it.
 * @csspart surface - The floating panel the suggestions sit in.
 * @csspart tags - The row the tokens sit in.
 *
 * @cssstate invalid - The field has an error to show, from the browser's validation or from your `feedback`.
 * @cssstate open - The suggestions are open.
 */
@customElement('helix-headless-filter-input')
export class HelixHeadlessFilterInput extends MixinControllerOpen(
  MixinTokens(MixinControllerValue(MixinField(HelixFormElement))),
) {
  /* The description names ids in the consumer's tree and the control is in this
     shadow root, so it is carried down as an element. See `Input`. */
  protected readonly aria = new AriaForwardController(this, {
    target: () => this.partNamed('control'),
  })

  /** Typed, so every keystroke is announced. See `announcesInput`. */
  protected override readonly announcesInput = true

  /**
   * Shows a button that empties the field.
   *
   * The text only. The tokens are the consumer's markup and this element is not
   * entitled to take them out of the document, which is the same reason
   * `hideOverflow` marks the ones over the cap `hidden` rather than removing
   * them.
   */
  @property({ type: Boolean })
  clearable = false

  /**
   * The name of the clear button, read by screen readers. The button shows only
   * an icon.
   */
  @property({ attribute: 'clear-label' })
  clearLabel = 'Clear'

  /**
   * The text shown while the field is empty.
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
   * Whether anything is slotted before the text.
   *
   * The leading box is drawn only where there is something to put in it, and it
   * is a box rather than a bare slot because it carries the seam between what a
   * consumer put at the head of the field and the field itself. `Menu.Item`
   * reads its own leading slot the same way and for the same reason: the light
   * DOM answer is not reactive, so a control added after the first render would
   * never get the box.
   *
   * **Empty, the box is `hidden`, not flagged**, for `Checkbox`'s reason: this
   * tier has no sheet, and `::part(lead)` cannot be qualified by an attribute,
   * so a `data-` flag left a headless field an empty flex item it had no way to
   * remove, and the first chip sat one gap further in than the rest.
   */
  @state()
  private leading = false

  /** Whether `leading` has had its first answer from the children. */
  private leadRead = false

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
    anchor: () => this.partNamed('field'),
    boundary: (): readonly (Element | null | undefined)[] => [
      this.partNamed('surface'),
      this.partNamed('field'),
    ],
    offset: () => 4,
    onDismiss: () => this.requestOpen(false),
    open: () => this.open,
    placement: 'bottom-start',
    surface: () => this.partNamed('surface'),
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
    return this.partNamed<HTMLInputElement>('control')
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
   * The direction of the selection, named as on `<input>`.
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

  /** Where the selection ends. With nothing selected, it is the caret position. */
  get selectionEnd(): number {
    return this.control?.selectionEnd ?? 0
  }

  /** Where the selection starts. With nothing selected, it is the caret position. */
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
    this.announceChange()
  }

  /**
   * The fields the input can filter by, declared anywhere inside it.
   *
   * Descendants rather than children, because the usual place to write them is
   * inside the `FilterMenu` slotted into `start`: the picker and the text are
   * two ways at one set of declarations, and asking a consumer to write them
   * twice would be asking which of the two surfaces is the real one.
   */
  get fields(): HelixHeadlessFilterField[] {
    return [
      ...this.querySelectorAll<HelixHeadlessFilterField>(
        'helix-headless-filter-field, helix-filter-field',
      ),
    ]
  }

  /**
   * The picker holding a field, where the consumer wrote one.
   *
   * The picker keeps what is ticked, so anything that changes a filter has to
   * go through it or the two surfaces start disagreeing: a filter typed here
   * that the menu never heard about leaves the value unticked in a list the
   * reader is about to open.
   */
  private menuFor(field: string): HelixHeadlessFilterMenu | null {
    for (const menu of this.querySelectorAll<HelixHeadlessFilterMenu>(
      'helix-headless-filter-menu, helix-filter-menu',
    )) {
      if (menu.fields.some((declared) => (declared.name ?? '') === field)) {
        return menu
      }
    }
    return null
  }

  /**
   * Says a field is now filtered by these values, through the picker where
   * there is one, and reports whether it stood.
   *
   * Announced by the menu rather than relayed by this element, so the ticks and
   * the event never come from two places. A consumer who wrote `FilterField`s
   * without a picker gets it from here, which is the only case where nothing
   * else could have said it.
   */
  private announceFacet(facet: FacetDetail): boolean {
    const menu = this.menuFor(facet.field)
    return menu
      ? menu.apply(facet.field, facet.values, facet.operator)
      : this.dispatchEvent(new HelixFacetEvent(facet))
  }

  /**
   * A chip asking to go, answered as the filter going.
   *
   * **Taken rather than passed on, and only for a chip naming a declared
   * field.** Left alone, a dismissed chip removed itself and told the picker
   * nothing, so the menu went on showing the value ticked and the reader's next
   * press on it read as *unticking*: they pressed `Refunded` and nothing came
   * back. Turning the request into `apply(field, [])` puts it down the one road
   * every other filter takes, so the chip goes because the filter went. A
   * consumer refusing that `helix-facet` keeps both, which is the answer a
   * refusal should give.
   *
   * Everything else in the row is untouched: a plain `Tag`, or a chip for
   * something no `FilterField` declares, is the consumer's to answer.
   */
  private readonly handleDismiss = (event: Event): void => {
    const chip = event.composedPath()[0]
    if (!(chip instanceof HTMLElement) || chip.slot !== 'tags') {
      return
    }
    const field = chip.getAttribute('name') ?? ''
    const menu = field === '' ? null : this.menuFor(field)
    if (!menu) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    menu.apply(field, [])
  }

  /**
   * Reads what has been typed, announces whatever of it was a filter, and takes
   * that much of the text away.
   *
   * **Nothing at all without declarations**, which is what keeps this from
   * changing under a consumer who never asked for it: a field with no
   * `FilterField` in it has no vocabulary to read against, so Enter stays the
   * form's and every keystroke is still just text.
   *
   * Refusing a `helix-facet` leaves that term's text where the reader wrote it,
   * so a consumer who declines one is not left with a box that has silently
   * emptied itself of a filter they did not take.
   */
  private readFilters(): number {
    const fields = this.fields
    if (fields.length === 0) {
      return 0
    }
    const reading = readFilterText(
      this.value,
      fields.map((field) => field.vocabulary),
    )
    if (reading.terms.length === 0) {
      return 0
    }

    let taken = 0
    const refused: string[] = []
    for (const term of reading.terms) {
      if (this.announceFacet(term.facet)) {
        taken += 1
      } else {
        refused.push(...term.written)
      }
    }
    if (taken === 0) {
      return 0
    }

    this.requestValue([...refused, reading.text].filter(Boolean).join(' '))
    const control = this.control
    if (control) {
      restoreValue(control, this.value)
    }
    this.dismissed = false
    this.settleOpen()
    return taken
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
    /* **`:focus-within` and not `document.activeElement`.** That property is
       retargeted to the outermost host, so it names this element only while this
       element is in the document tree: put the field inside anybody else's
       shadow root (a sandbox, a preview frame, a consumer's own component) and
       it names *their* host instead, `contains` answers false, and the panel
       never opens anywhere it is nested. The selector is evaluated on this
       element, so it is true whenever focus is inside it and stays true however
       deeply the element itself is buried.

       Both, because neither is available everywhere: the selector is what a
       browser answers and happy-dom does not implement it, `activeElement` is
       what the harness answers and is wrong under nesting. Either being true
       means the same thing, and a light-DOM child holding focus (a token's own
       remove control) is inside this element on both readings. */
    const focused = this.matches(':focus-within') || this.contains(document.activeElement)
    this.requestOpen(this.suggesting && !this.dismissed && !this.isDisabled && focused)
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

    /* Enter over a highlighted suggestion is that suggestion's, and falls
       through to the case below. Anywhere else it is the reader saying they have
       finished writing, which is when what they wrote gets read: a filter
       becomes a chip, and text that was not one stays text and reaches the form
       as it always did. */
    if (event.key === 'Enter' && !(this.open && this.suggestions[this.activeAt])) {
      if (this.readFilters() > 0) {
        event.preventDefault()
      }
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

  /** The leading box again, whenever what is in front of the text changes. */
  private readonly handleLeading = (event: Event): void => {
    this.leading = (event.target as HTMLSlotElement).assignedNodes({ flatten: true }).length > 0
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

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('helix-dismiss', this.handleDismiss)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('helix-dismiss', this.handleDismiss)
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    /* The leading box's first answer, from the children and before the render
       that draws it. `slotchange` alone left a hydrated field without its box:
       a declarative shadow root reports its slots as it is parsed, before any
       listener is there to hear it. `slotchange` keeps it in step after. */
    if (!this.leadRead && this.childrenKnown) {
      this.leadRead = true
      this.leading = this.knownChildren.some((child) => child.slot === 'start')
    }
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
    this.finishHydration()
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
    /* The control's own validity, anchored on it, the way `Input` takes it.
       The control is in this shadow root and takes no part in the form, so
       `required` on it alone let an empty filter submit. */
    const control = this.control
    if (control) {
      this.copyValidity(control)
      this.refreshFeedback()
    }
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
       Inside the panel only: `Element.scrollIntoView` scrolls every ancestor
       as well, so a key pressed in the field moved the page under it. */
    if (active) {
      scrollItemIntoView(active)
    }
  }

  /** Puts the caret in the text field. */
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
      <div part="lead" ?hidden=${!this.leading}>
        <slot name="start" @slotchange=${this.handleLeading}></slot>
      </div>
      ${this.renderTokenRow(
        html`<slot name="tags" @slotchange=${this.handleTokens}></slot>`,
        this.over,
      )}
      <input
        part="control"
        id=${this.controlId}
        type="text"
        .value=${this.value}
        name=${this.name || nothing}
        placeholder=${this.placeholder || nothing}
        aria-describedby=${this.describedBy ?? nothing}
        aria-invalid=${this.invalidity ?? nothing}
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
