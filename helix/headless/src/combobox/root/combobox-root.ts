import {
  AriaForwardController,
  customElement,
  type HelixBeforeChangeEvent,
  HelixCreateEvent,
  HelixFilterEvent,
  HelixFormElement,
  MixinControllerOpen,
  MixinControllerValue,
  MixinField,
  MixinTokens,
  PopoverController,
} from '@fusion.dev/helix-core'
import { caretDown } from '@fusion.dev/helix-icons'
import { nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'
import { html } from 'lit/static-html.js'
import type { HelixHeadlessListbox } from '../../listbox/root/listbox-root.js'
import { optionsAmong } from '../../option/root/option-root.js'
/* Relative, so this registers the base listbox and the styled file's identical
   import registers the styled one. `tier` picks which the template asks for. */
import '../../listbox/index.js'
/* And the tags, for the same reason: `multiple` renders one per chosen option
   and a custom element registers on import. */
import '../../tag/index.js'

/**
 * Whether an edit added characters rather than taking them away.
 *
 * `beforeinput` and `input` both carry `inputType`, and it is the platform's
 * own answer to what the reader just did: `insertText` for typing,
 * `insertFromPaste` for a paste, and one of several `delete*` for the ways of
 * removing. Anything without one is treated as an insertion, because the only
 * events with no `inputType` here are the ones a script dispatches, and a test
 * or a consumer setting the value means it to behave like typing.
 */
const isInsertion = (event: Event): boolean =>
  !(event as InputEvent).inputType?.startsWith('delete')

/**
 * @summary A field that filters a list as it is typed into.
 *
 * @description
 * **The list is `helix-listbox`, and the filtering is its own.** It owns
 * narrowing, the empty state, the highlight, `aria-activedescendant` and
 * scrolling an option into view. What is left for this element is the field,
 * the panel and the traffic between them.
 *
 * **The text and the value are two things.** What a reader types is a filter:
 * it narrows the list and is thrown away. The value is whichever option they
 * then choose, and the field is rewritten to that option's words once they
 * have. The filter is cleared on close, so a reopened control does not start
 * from the last visit's leftovers.
 *
 * **Focus stays in the field, which is the whole of what a combobox is.** The
 * arrows move the list without leaving the text, through the listbox's public
 * `navigate`. `role="combobox"` is on the input rather than on a wrapper,
 * because the thing the pattern describes is the text field.
 *
 * **With `multiple`, the chosen options are tags in the field**, one object per
 * answer, each with its own remove control. The panel stays open while more
 * than one can be chosen and the filter clears on each choice, so the next pick
 * starts from the whole list.
 *
 * **`creatable` announces, and does not write.** The options are the consumer's
 * light DOM and nothing here puts an element into it: a component that grew the
 * consumer's markup would be one their framework re-renders over. It offers the
 * row and fires the event; adding the option is the consumer's.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @aliases Autocomplete, Typeahead, Search select
 * @documentation https://fusion.dev/helix/components/combobox
 *
 * @slot - The options, which are `helix-option` elements.
 * @slot end - After it, for a unit or a clear button.
 * @slot indicator - Replaces the caret saying the field opens.
 * @slot start - Before the text, for an icon.
 *
 * @event {Event} change - Announced once the value has moved.
 * @event {HelixBeforeChangeEvent} helix-before-change - Fired before the chosen option changes. Cancelable: refusing it takes the decision and nothing moves.
 * @event {HelixBeforeCloseEvent} helix-before-close - Fired before it closes. Cancelable: refusing it takes the decision and nothing moves.
 * @event {HelixBeforeOpenEvent} helix-before-open - Fired before the panel opens. Cancelable: refusing it takes the decision and nothing moves.
 * @event {HelixCreateEvent} helix-create - Fired when the reader asks for something the list does not hold, and cancelable.
 * @event {HelixFilterEvent} helix-filter - Fired as the reader types, carrying the text the list is being narrowed to. Cancelable: refusing it leaves the list whole, and is how a consumer takes the filtering for themselves.
 * @event {Event} input - Announced once the value has moved.
 * @event {Event} toggle - Says the state moved, carrying `newState` and `oldState`.
 *
 * @csspart control - The text field itself.
 * @csspart create - The row offering to add what was typed.
 * @csspart feedback - What is wrong with it.
 * @csspart field - The box around the text and its marks.
 * @csspart hint - Help under the field, while nothing is wrong.
 * @csspart indicator - The caret.
 * @csspart label - The question, over the field.
 * @csspart listbox - The list inside it.
 * @csspart listbox-empty - Shown when a filter has hidden everything.
 * @csspart listbox-feedback - What is wrong with it.
 * @csspart listbox-filter-icon - The mark beside that field.
 * @csspart listbox-filter-mark - The glyph beside the filter field, where none is slotted.
 * @csspart listbox-hint - Help under the list.
 * @csspart listbox-items - The list itself.
 * @csspart listbox-label - The question, over the list.
 * @csspart listbox-loading - Shown while the options are still on their way.
 * @csspart listbox-search - The region holding the field that narrows the list.
 * @csspart listbox-search-field - The field itself.
 * @csspart rest - The count of choices held beyond `max-tags`. A `<button>` with `expandable`, a `<span>` without it.
 * @csspart surface - The floating panel.
 * @csspart tag - One chosen option.
 * @csspart tag-dismiss - The remove button, when `dismissible`.
 * @csspart tag-dismiss-mark - The glyph on the dismiss control, where none is slotted.
 * @csspart tag-prefix - The category before the label.
 * @csspart tags - The row of chosen options, when `multiple` is set.
 *
 * @cssstate invalid - While there is feedback to show: the platform's verdict, or the consumer's `feedback`.
 * @cssstate open - While the list is open.
 */
@customElement('helix-headless-combobox')
export class HelixHeadlessCombobox extends MixinControllerOpen(
  MixinTokens(MixinControllerValue(MixinField(HelixFormElement))),
) {
  /* A consumer's `aria-describedby` names ids in their own tree and the control
     is in this shadow root, so the reference has to be carried down as an
     element rather than copied as an id. See `AriaForwardController`: measured
     in Chrome's own tree, the host held the description and the control the
     reader is actually on was exposed without it. */
  protected readonly aria = new AriaForwardController(this, {
    target: () => this.partNamed('control'),
  })

  /**
   * What the browser may autofill in the text field, as a platform token.
   *
   * **Defaults to `off`, which is not the platform's default and is the
   * point.** The field filters a list rather than collecting a value, so a
   * browser offering to fill it with a saved address is competing for the same
   * keystrokes as the listbox. A consumer who wants autofill can still ask.
   */
  @property()
  autocomplete = 'off'

  /**
   * Whether the reader may answer with something the list does not hold.
   *
   * The row appears while what is typed matches no option's words exactly, so
   * it is offered next to near misses too: a reader typing "Ruby on Rails" with
   * "Ruby" in the list wants the one they are typing, not the one they are
   * halfway through.
   */
  @property({ type: Boolean })
  creatable = false

  /**
   * What the create row says, before the words it would add.
   */
  @property({ attribute: 'create-label' })
  createLabel = 'Add'

  /**
   * Words shown where the filter has hidden everything.
   */
  @property({ attribute: 'empty-text' })
  emptyText = 'No matches'

  /**
   * Accessible name for the list, which has no visible one of its own.
   */
  @property({ attribute: 'list-label' })
  listLabel = 'Options'

  /**
   * Whether the options are still on their way.
   *
   * Passed straight to the list, which is where the rows are and so where the
   * message belongs.
   */
  @property({ reflect: true, type: Boolean })
  loading = false

  /**
   * What the list says while they are on their way.
   */
  @property({ attribute: 'loading-text' })
  loadingText = 'Loading'

  /**
   * Whether more than one option can be chosen.
   *
   * The list already does the work: `value` comes apart on commas, a press
   * toggles rather than replaces, and the arrows move without choosing. What
   * this adds is the tags, and keeping the panel open between picks.
   *
   * A comma is therefore not available inside an option's value, which is the
   * listbox's contract and not this element's to change.
   *
   * **The list is told, and the field is not.** `aria-multiselectable` belongs
   * to `listbox`, `grid`, `tree` and `tablist`, and `combobox` dropped it in
   * ARIA 1.2; the list sets it on itself through `ElementInternals`, where a
   * reader on the field hears it through `aria-controls`. This element wrote it
   * onto its own `role="combobox"` input as well, which an audit reports as a
   * property the role does not support and no spec here ever asserted: the one
   * that covers this says in as many words that telling the list is what this
   * element is responsible for.
   */
  @property({ type: Boolean })
  multiple = false

  /**
   * Text shown while nothing has been chosen.
   */
  @property()
  placeholder = ''

  /**
   * What a tag's remove control is called, since the mark has no name.
   */
  @property({ attribute: 'remove-label' })
  removeLabel = 'Remove'

  /**
   * Whether the field finishes the word as it is typed.
   *
   * `suggest` rather than `autocomplete`, which is a real HTML attribute this
   * element already sets on the input it renders, and two things of one name
   * meaning different things on the same control is a question a consumer
   * should not have to ask.
   */
  @property({ type: Boolean })
  suggest = false

  /**
   * What the reader has typed, which narrows the list and is not the value.
   *
   * State rather than a property, because it is a keystroke rather than API: a
   * consumer sets `value` to say what is chosen, and nothing outside needs to
   * say what is half-typed.
   */
  @state()
  private typed = ''

  /**
   * The completed words, where the field is finishing one, and empty otherwise.
   *
   * Held apart from `typed` rather than replacing it, because they are needed
   * for different things at the same moment: this one is what the input shows,
   * `typed` is what the list is filtered by, and the selection between them is
   * what the reader is offered.
   */
  @state()
  private suggestion = ''

  /**
   * Which option is chosen, as an index, or `-1` where none is.
   *
   * Read off the listbox this renders, which owns the options and is where the
   * same two properties are implemented. Delegating rather than recomputing is
   * what keeps a composed control and the control inside it from answering
   * differently: they are one chooser to a consumer.
   */
  get selectedIndex(): number {
    return this.listbox?.selectedIndex ?? -1
  }

  set selectedIndex(at: number) {
    const listbox = this.listbox
    if (listbox) {
      listbox.selectedIndex = at
    }
  }

  /** Which kind of chooser this is, in the platform's two words. */
  get type(): string {
    return this.multiple ? 'select-multiple' : 'select-one'
  }

  private get listbox(): HelixHeadlessListbox | null {
    return this.partNamed<HelixHeadlessListbox>('listbox')
  }

  /* Not `MixinPickerField`, though this is a text field with a panel over it.
     The agreement differs at every point the mixin fixes: the whole field is
     inside for a press, the gap is four rather than eight, Escape closes
     through `close()` with no `returning` flag because nothing here opens on
     arrival, and `updated` reconciles the control against a completion rather
     than restoring it to a value. */
  protected readonly panel = new PopoverController(this, {
    anchor: () => this.partNamed('field'),
    /* The surface *and* the field. Scoped to the surface alone, a press on the
       field counts as outside, so `pointerdown` closes the panel and the
       field's own handler reopens it on the `click` that follows. */
    boundary: (): readonly (Element | null | undefined)[] => [
      this.partNamed('surface'),
      this.partNamed('field'),
    ],
    offset: () => 4,
    onDismiss: () => this.close(),
    open: () => this.open,
    placement: 'bottom-start',
    surface: () => this.partNamed('surface'),
  })

  /** The values chosen, in the order they were chosen. */
  private get values(): string[] {
    return this.value === '' ? [] : this.value.split(',')
  }

  /**
   * The chosen options themselves, for their words.
   *
   * Read off the options rather than stored, because the words are the
   * consumer's content and a copy of them goes stale the moment they change it.
   * Select records the same.
   *
   * In the value's own order, which is the order they were chosen. It has to
   * be: a created answer is not in the list at all, so there is no position in
   * the list to give it. Neither order ever reshuffles what is already there,
   * so a tag does not move out from under the pointer about to remove it.
   */
  private get chosen(): { text: string; value: string }[] {
    /* Off this element's own children, not the listbox's: see `optionsAmong`.
       None on a server or while hydrating what one sent. */
    const options = optionsAmong(this.knownChildren)
    /* Nothing at all is not the same as nothing matching.
     *
     * On the server there are no options to look in, because they are light DOM
     * children the server cannot see, nor while hydrating what it sent. Falling
     * back there would put the raw value on screen for one
     * paint and then swap it for the option's words, which reads as the field
     * correcting a mistake. With options present, a value none of them carries
     * is a created one, and showing it is the only way to show it at all. */
    const known = options.length > 0
    const words = new Map(options.map((option) => [option.value, option.text]))
    return this.values
      .filter((value) => known || words.has(value))
      .map((value) => ({ text: words.get(value) ?? value, value }))
  }

  /**
   * Whether the filter has left anything to choose.
   *
   * Read off the options rather than asked of the listbox, which keeps its own
   * answer to this private. Both come from the same place: `hidden` is what the
   * filter writes onto an option, and it is public because hiding one by hand
   * is a thing a consumer may do.
   */
  private get showing(): boolean {
    return (this.listbox?.options ?? []).some((option) => !option.hidden)
  }

  /**
   * What the create row would add, or nothing where there is nothing to add.
   *
   * Empty where the words already name an option exactly, case aside: offering
   * to add "Rust" under a list showing "Rust" is offering the reader a second
   * copy of what they are looking at.
   */
  private get creation(): string {
    const typed = this.typed.trim()
    if (!this.creatable || typed === '') {
      return ''
    }
    const exists = (this.listbox?.options ?? []).some(
      (option) => option.text.trim().toLowerCase() === typed.toLowerCase(),
    )
    return exists ? '' : typed
  }

  /**
   * Takes what the reader typed as an answer, once anyone listening allows it.
   *
   * Added to the set with `multiple` and replacing it without, which is the
   * same rule choosing an option follows: what differs about a created answer
   * is where it came from, not how many the field holds.
   */
  private create(): void {
    const wanted = this.creation
    if (wanted === '') {
      return
    }
    if (!this.dispatchEvent(new HelixCreateEvent({ value: wanted }))) {
      return
    }
    const next = this.multiple ? [...this.values, wanted].join(',') : wanted
    if (!this.requestValue(next)) {
      return
    }
    this.typed = ''
    this.suggestion = ''
    this.listbox?.requestFilter('')
    if (!this.multiple) {
      this.close()
    }
  }

  /** The choices that get a tag, which is all of them until `maxTags` says not. */
  private get shown(): { text: string; value: string }[] {
    const held = this.chosen
    /* `shownLimit` and not `maxTags`, which is the difference expanding makes:
       the property is what the consumer asked for and the limit is what is in
       force, and reading the first here would slice away the tags the reader
       just pressed the count to see. */
    const limit = this.shownLimit
    return limit > 0 ? held.slice(0, limit) : held
  }

  /** How many are held beyond the ones shown. */
  private get restCount(): number {
    return Math.max(0, this.chosen.length - this.shown.length)
  }

  /** What a single-choice field shows at rest, which the tags replace. */
  private get word(): string {
    return this.chosen[0]?.text ?? ''
  }

  /**
   * Takes one value out of the set, which is what a tag's remove control does.
   *
   * `drop` rather than `remove`, which every element already has: `Element`
   * defines `remove()` and a method of that name here would be overriding it,
   * so `combobox.remove()` would stop taking the combobox out of the document.
   */
  private drop(value: string): void {
    this.requestValue(this.values.filter((one) => one !== value).join(','))
  }

  private close(): void {
    if (!this.open) {
      return
    }
    this.requestOpen(false)
    this.partNamed('control')?.focus()
  }

  private readonly handleInput = (event: Event): void => {
    // Stopped for the reason `Input.handleInput` gives: the inner control's own
    // `input` is composed and would reach a consumer beside this element's.
    event.stopPropagation()
    const typed = (event.target as HTMLInputElement).value
    this.typed = typed
    /* **Announced from here rather than left to escape from the listbox
       inside.** The narrowing was always reaching consumers, because
       `requestFilter` dispatches a composed `helix-filter` and nothing stopped
       it at this boundary the way `change` and `input` are stopped. It worked,
       and it was wrong in the two ways an accident is: the element that fired
       it was an implementation detail rather than the one the consumer holds,
       and nothing on this element's page said the event existed, so a refactor
       could have taken it away without anyone noticing it was load-bearing.

       Cancelable, and the refusal is honored the same way it already was: a
       consumer that refuses it leaves the list unnarrowed. Everything after
       this runs either way, because refusing a narrowing is not refusing to
       open, and that is the behavior refusing the listbox's own event had. */
    const narrowing = new HelixFilterEvent({ value: typed })
    /* The list is narrowed before the completion is looked for, because the
       completion is the first thing still showing and that is not known until
       the filter has run. */
    if (this.dispatchEvent(narrowing)) {
      this.listbox?.requestFilter(typed)
    }
    this.suggestion = this.suggest && isInsertion(event) ? this.completionFor(typed) : ''
    if (!this.open) {
      this.requestOpen(true)
    }
  }

  /**
   * The words of the first option the typing begins, or nothing.
   *
   * Case-insensitively matched and returned in the option's own case, so a
   * reader typing "ru" is offered "Rust" rather than "rust": the completion is
   * a name from the list, and correcting the reader's capitals to match it is
   * the whole point of showing it.
   */
  private completionFor(typed: string): string {
    if (typed === '') {
      return ''
    }
    const needle = typed.toLowerCase()
    const match = (this.listbox?.options ?? []).find(
      (option) =>
        !option.hidden && !option.disabled && option.text.toLowerCase().startsWith(needle),
    )
    return match && match.text.length > typed.length ? match.text : ''
  }

  /**
   * The keys the field answers, and the ones it hands on.
   *
   * Everything that moves within the list goes to the list, which is what
   * `navigate` is for. Escape and Tab are the field's, because they are about
   * the panel rather than about the options in it.
   */
  private readonly handleKeydown = (event: KeyboardEvent): void => {
    /* The input carries `disabled` too, so a reader never gets this far: the
       platform suppresses the event before any listener sees it. Said here
       anyway, because then the element's own state is what refuses rather than
       a detail of the node it happens to render, and a consumer dispatching a
       key at it gets the same answer a reader would. */
    if (this.isDisabled) {
      return
    }
    if (event.key === 'Escape') {
      if (this.open) {
        event.preventDefault()
        this.close()
      }
      return
    }
    if (event.key === 'Tab') {
      if (this.open) {
        this.requestOpen(false)
      }
      return
    }
    /* Backspace on an empty field takes the last tag off, which is the
       keyboard's version of pressing a tag's remove control. The policy lives in
       `MixinTokens` because a filter field wants the same one; what happens to
       the token is this element's, through `removeLastToken` below. */
    if (this.multiple && this.tokenKeydown(event, this.typed)) {
      return
    }
    /* Enter with nothing left in the list creates, where there is anything to
       create. Only then: with matches showing, Enter belongs to whichever one
       the arrows are on, and a reader pressing it over a highlighted "Rust"
       meant Rust. The row is still there to be pressed for the other case. */
    if (event.key === 'Enter' && this.creation !== '' && !this.showing) {
      event.preventDefault()
      this.create()
      return
    }
    /* Opening on the first arrow, before the list is asked to move: a closed
       combobox pressed Down should show its options and land on the first,
       which is one gesture to the reader and two steps here. */
    if (!this.open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      this.requestOpen(true)
    }
    this.listbox?.navigate(event)
  }

  /**
   * Takes what the list announced and stops it there.
   *
   * The listbox says `helix-before-change` under its own name, and a consumer
   * listening on this element would otherwise hear two changes for one choice,
   * one of them naming a control they did not put on the page.
   */
  private readonly handleChange = (event: Event): void => {
    event.stopPropagation()
    /* From the event rather than from the listbox, which is one choice behind:
       it carries what is being *proposed*, dispatched before it is applied,
       which is what makes it refusable. The listbox never applies it anyway,
       since this element passes `.value` down and that is a consumer declaring
       ownership. */
    const { value } = (event as HelixBeforeChangeEvent).detail
    /* And nothing happens on a refusal. Refusing a change should leave the
       control where it was, not clear the filter and shut the panel as though
       it had been taken. */
    if (!this.requestValue(value)) {
      return
    }
    // Either way the search is spent: it found what it was for.
    this.typed = ''
    this.suggestion = ''
    this.listbox?.requestFilter('')
    if (!this.multiple) {
      this.close()
    }
  }

  /**
   * Anywhere in the field opens the list, and puts the caret where typing goes.
   *
   * On the field rather than on the `<input>`. The caret is a sibling of the
   * input and so is the tag strip, so a handler on the input alone leaves the
   * one part of the control that visibly says "this opens" doing nothing.
   * Anything drawn inside the field is the field.
   *
   * A tag is the exception, because a tag is its own control: its dismiss
   * removes a choice, and opening the list on the way past would leave the
   * reader looking at a panel they did not ask for. Read from the composed
   * path, since the press lands on a button inside the tag's shadow root and
   * the event has retargeted by the time it arrives here.
   *
   * It only ever opens. Closing is Escape, a choice, or leaving, which is what
   * the input already did and what a text field wants: a control that closed
   * when you clicked into the middle of your own typing would be unusable.
   */
  private readonly handleFieldClick = (event: MouseEvent): void => {
    if (this.isDisabled) {
      return
    }
    if (
      event
        .composedPath()
        .some((node) => node instanceof HTMLElement && node.localName === 'helix-tag')
    ) {
      return
    }
    this.partNamed('control')?.focus()
    if (!this.open) {
      this.requestOpen(true)
    }
  }

  /**
   * The last chosen one goes, which is what Backspace on an empty field means.
   *
   * `MixinTokens` owns when this is asked for and this owns what it does: a
   * token here is a chosen option, so it leaves by the same door a dismissed
   * tag does.
   */
  protected override removeLastToken(): void {
    const last = this.values.at(-1)
    if (last !== undefined) {
      this.drop(last)
    }
  }

  /** One tag asking to be taken out of the set. */
  private readonly handleDismiss = (event: Event): void => {
    event.stopPropagation()
    const tag = event.currentTarget as HTMLElement
    this.drop(tag.dataset.value ?? '')
  }

  /**
   * Reports the answer and the verdict on it.
   *
   * The value rather than the typed text, which is the whole point of the
   * component: a form that received "jav" got the filter, not an option.
   */
  private sync(): void {
    this.internals.setFormValue(this.value === '' ? null : this.value)
    this.reportRequired(this.value === '', 'Choose one to continue.', 'control')
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.finishHydration()
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    this.internals.ariaExpanded = this.open ? 'true' : 'false'
  }

  protected override updated(changed: PropertyValues): void {
    super.updated?.(changed)
    this.sync()
    /* After the render, not during it: the input's value is a binding, so
       selecting a range of it before Lit has written it selects a range of the
       previous value.
     
       **And written here rather than left to the binding, because the binding
       stops writing.** Lit dirty-checks a property binding against the value it
       last wrote, not against the DOM, and typing changes the DOM underneath
       it. Type `r` into a list holding Ruby and the completion is `Ruby`, so
       the field is written `Ruby` with `uby` selected. Type `u` and the field
       is already `Ru` because the browser replaced the selection, and the
       completion is *still* `Ruby`: unchanged, so Lit writes nothing and
       `changed.has('suggestion')` is false, so nothing is selected either. The
       completion then appears on the first character and never again.
     
       Reconciled against what the input actually holds, which is the only thing
       that knows. */
    const control = this.partNamed<HTMLInputElement>('control')
    /* The same expression the template binds, because this has to agree with it
       in both directions. Writing only when there is a completion puts the
       field right while one is showing and leaves it stale afterwards: this
       reconcile writes behind Lit's back, so Lit's own dirty-check then
       believes the DOM already holds whatever it last wrote and declines to
       correct it. */
    const wanted = this.multiple || this.open ? this.suggestion || this.typed : this.word
    if (control && control.value !== wanted) {
      control.value = wanted
    }
    if (control && this.suggestion !== '') {
      control.setSelectionRange(this.typed.length, this.suggestion.length)
    }
    /* The panel follows `open` through the controller. The filter goes with a
       close, for the reason the class note records: a control reopened still
       narrowed is one whose second use starts from the first one's leftovers.

       All three, not the listbox's copy alone. A surviving `typed` is
       invisible on close, because a closed single-choice field shows the
       chosen words instead, and comes back with the list behind it showing
       everything the moment it reopens. */
    if (!this.open) {
      this.typed = ''
      this.suggestion = ''
      this.listbox?.requestFilter('')
    }
  }

  /**
   * The list the field filters, behind a seam the styled tier can move.
   *
   * A method rather than a fragment inline, so a tier above can replace, wrap
   * or omit it without reimplementing the whole template. The tag is
   * interpolated rather than written, so `tier` resolves it: this renders the
   * headless element, and a styled subclass that sets `tier` renders the styled
   * one from the same template.
   */
  protected renderListbox(): TemplateResult {
    return html`<${this.tag('listbox')}
      part="listbox"
      id="listbox"
      exportparts="empty: listbox-empty, feedback: listbox-feedback, filter-icon: listbox-filter-icon,
        filter-mark: listbox-filter-mark, hint: listbox-hint, items: listbox-items,
        label: listbox-label, loading: listbox-loading, search: listbox-search,
        search-field: listbox-search-field"
      aria-label=${this.listLabel}
      empty-text=${this.emptyText}
      loading-text=${this.loadingText}
      ?loading=${this.loading}
      ?multiple=${this.multiple}
      .value=${this.value}
      @helix-before-change=${this.handleChange}
      @change=${this.stopInner}
      @helix-filter=${this.stopInner}
      @input=${this.stopInner}
    >
      <!-- The field's words are read off the options, and on the first
           render there are none: the slot has not been assigned yet, so a
           combobox with a value comes up empty. Assignment changes no
           property, so nothing else would schedule the update that fixes
           it. -->
      <slot @slotchange=${() => this.requestUpdate()}></slot>
    </${this.tag('listbox')}>`
  }

  /**
   * One chosen option, as a tag, behind a seam the styled tier can move.
   *
   * A method rather than a fragment inline, so a tier above can replace, wrap
   * or omit it without reimplementing the whole template. The tag is
   * interpolated rather than written, so `tier` resolves it: this renders the
   * headless element, and a styled subclass that sets `tier` renders the styled
   * one from the same template.
   */
  protected renderTag(option: { text: string; value: string }): TemplateResult {
    return html`<${this.tag('tag')}
                    part="tag"
      exportparts="dismiss: tag-dismiss, dismiss-mark: tag-dismiss-mark, prefix: tag-prefix"
                    data-value=${option.value}
                    dismiss-label=${this.removeLabel}
                    ?dismissible=${!this.isDisabled}
                    @helix-dismiss=${this.handleDismiss}
                    >${option.text}</${this.tag('tag')}
                  >`
  }

  /**
   * The caret saying the field opens, behind a seam.
   *
   * Slot fallback, so a consumer replaces it by slotting; and a method, so the
   * tier above replaces it by overriding. Those answer different people: the
   * slot is for the page and the method is for whoever is building the styled
   * layer, and a fallback with only the first is one a tier can restyle and
   * cannot change.
   */
  protected renderIndicator(): TemplateResult {
    return html`<slot name="indicator">
      <svg part="indicator" fill="currentColor" viewBox=${caretDown.viewBox} aria-hidden="true">
        ${unsafeSVG(caretDown.content)}
      </svg>
    </slot>`
  }

  protected override render(): TemplateResult {
    return html`${this.renderLabel()}
      <div part="field" @click=${this.handleFieldClick}>
        <slot name="start"></slot>
        ${
          this.multiple && this.chosen.length > 0
            ? this.renderTokenRow(
                this.shown.map((option) => this.renderTag(option)),
                this.restCount,
              )
            : nothing
        }
        <input
          part="control"
          id="control"
          type="text"
          role="combobox"
          autocomplete=${this.autocomplete || nothing}
          spellcheck="false"
          aria-controls="listbox"
          aria-autocomplete=${this.suggest ? 'both' : 'list'}
          aria-expanded=${this.open ? 'true' : 'false'}
          aria-describedby=${this.describedBy ?? nothing}
          placeholder=${(this.chosen.length > 0 ? '' : this.placeholder) || nothing}
          ?disabled=${this.isDisabled}
          .value=${this.multiple || this.open ? this.suggestion || this.typed : this.word}
          @input=${this.handleInput}
          @keydown=${this.handleKeydown}
        />
        <slot name="end"></slot>
        ${this.renderIndicator()}
      </div>
      <div part="surface" popover="manual" ?hidden=${!this.open}>
        ${this.renderListbox()}
        ${
          this.creation === ''
            ? nothing
            : html`<button part="create" type="button" @click=${() => this.create()}>
                ${this.createLabel} "${this.creation}"
              </button>`
        }
      </div>
      ${this.renderHint()}${this.renderFeedback()}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-combobox': HelixHeadlessCombobox
  }
}
