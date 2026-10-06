import {
  AriaForwardController,
  afterLinkFollowed,
  countLabel,
  customElement,
  DelayController,
  drawStatus,
  fillTemplate,
  type HelixBeforeChangeEvent,
  HelixCreateEvent,
  HelixFilterEvent,
  HelixFormElement,
  MixinControllerOpen,
  MixinControllerValue,
  MixinField,
  MixinTokens,
  onApple,
  PopoverController,
  reportValues,
  StatusController,
  submitImplicitly,
} from '@fusion.dev/helix-core'
import { caretDown } from '@fusion.dev/helix-icons'
import { nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'
import { html } from 'lit/static-html.js'
import type { HelixHeadlessListbox } from '../../listbox/root/listbox-root.js'
import { optionsAmong } from '../../option/root/option-root.js'
import { HelixHeadlessTag } from '../../tag/root/tag-root.js'
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
 * @summary A text field that filters a list of options as you type.
 *
 * @description
 * The list is a `Listbox`, which handles filtering, the empty state, the
 * highlight, `aria-activedescendant`, and scrolling an option into view. This
 * element handles the field, the panel, and the communication between them.
 *
 * The typed text and the value are separate. The text is a filter: it narrows
 * the list and is then discarded. The value is the option you choose, and the
 * field then shows that option's text. The filter clears on close, so a
 * reopened combobox starts from the whole list.
 *
 * Focus stays in the text field. The arrow keys move through the list with the
 * listbox's public `navigate` method. `role="combobox"` is on the input itself.
 * ArrowDown and ArrowUp open the list on the chosen option, and Enter chooses
 * the highlighted one. As typing narrows the list, a screen reader hears how
 * many options are left, such as "3 results". Space, Home, End and letters edit the text, and Enter in
 * a closed field is left to the form. Emptying the field and leaving it clears
 * a single choice; Escape puts the chosen words back, and a second Escape on
 * the closed field clears the choice.
 *
 * On Apple devices, where VoiceOver does not read the option the field points
 * to, the field says it in a live region as the highlight moves, says how many
 * options there are as the list opens, and says a choice once it is made, as
 * React Aria's combobox does there.
 *
 * With `multiple`, each chosen option is a tag in the field with its own remove
 * control. The panel stays open and the filter clears after each choice, so the
 * next choice starts from the whole list.
 *
 * With `creatable`, the combobox offers a create row and fires `helix-create`.
 * It does not add the option. The options are your light DOM, and your
 * framework would re-render over an element the combobox inserted, so add the
 * option in your event handler.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @aliases Autocomplete, Typeahead, Search select
 * @documentation https://fusion.dev/helix/components/combobox
 *
 * @slot - The options.
 * @slot empty - What the list shows when typing hides every option, for content richer than `empty-text`.
 * @slot end - After the text, for a unit or a clear button.
 * @slot error - What the list shows while `load-error` is set, for content richer than its text.
 * @slot feedback - The message that says what is wrong, for content richer than a string. It shows while there is a message.
 * @slot hint - The hint, for content richer than plain text.
 * @slot indicator - Replaces the caret that shows the field opens a list.
 * @slot label - The label, for content richer than plain text.
 * @slot loading - What the list shows while the options load, for content richer than `loading-text`.
 * @slot no-results - What the list shows when typing hides every option, for content richer than `no-results-text`.
 * @slot start - Before the text, for an icon.
 *
 * @event {Event} change - Fired after the value changes.
 * @event {HelixBeforeChangeEvent} helix-before-change - Fired before the chosen option changes. Cancelable: cancel it to keep the current option.
 * @event {HelixBeforeCloseEvent} helix-before-close - Fired before the panel closes. Cancelable: cancel it to keep the panel open.
 * @event {HelixBeforeOpenEvent} helix-before-open - Fired before the panel opens. Cancelable: cancel it to keep the panel closed.
 * @event {HelixCreateEvent} helix-create - Fired when the user adds a value that is not in the list. Cancelable.
 * @event {HelixFilterEvent} helix-filter - Fired as the user types, with the text the list is filtered by. Cancelable: cancel it to leave the list unfiltered and do the filtering yourself.
 * @event {HelixLoadMoreEvent} helix-load-more - Fired once the list is scrolled within a screen of its end, once for each number of options, and not while `loading` is set. Add the next page and set `loading` while you fetch it.
 * @event {Event} input - Fired after the value changes.
 * @event {ToggleEvent} toggle - Fired when the panel opens or closes, with `newState` and `oldState`.
 *
 * @csspart control - The text field itself.
 * @csspart create - The row offering to add what was typed.
 * @csspart create-active - The create row while the keyboard is on it. Set alongside `create`.
 * @csspart feedback - The message that explains what is wrong with the value.
 * @csspart field - The box around the text and its marks.
 * @csspart hint - Help text under the field, shown while there is no error.
 * @csspart indicator - The caret.
 * @csspart label - The label above the field.
 * @csspart listbox - The list inside the panel.
 * @csspart listbox-empty - Shown when a filter has hidden everything.
 * @csspart listbox-error - Shown while `load-error` is set.
 * @csspart listbox-feedback - The inner list's error message.
 * @csspart listbox-filter-icon - The icon beside the list's filter field.
 * @csspart listbox-filter-mark - The glyph beside the filter field, where none is slotted.
 * @csspart listbox-hint - Help under the list.
 * @csspart listbox-items - The element that holds the options.
 * @csspart listbox-label - The label above the list.
 * @csspart listbox-live - The inner list's `live` part, the region screen readers announce its empty and loading messages, and how many options typing left, from.
 * @csspart listbox-loading - Shown while the options are loading.
 * @csspart listbox-search - The region holding the field that narrows the list.
 * @csspart listbox-search-field - The filter field inside that region.
 * @csspart live - The region VoiceOver hears the highlight, the count and a choice from on Apple devices, drawn once there is one to say. Visually hidden in the styled tier.
 * @csspart rest - The count of choices held beyond `max-tags`. A `<button>` with `expandable`, a `<span>` without it.
 * @csspart surface - The floating panel.
 * @csspart tag - One chosen option.
 * @csspart tag-cell - The tag's grid cell, which a tag draws only inside a tag group.
 * @csspart tag-dismiss - The remove button, when `dismissible`.
 * @csspart tag-dismiss-mark - The glyph on the dismiss control, where none is slotted.
 * @csspart tag-label - The label, trimmed to its capitals and baseline.
 * @csspart tag-link - The tag's link around its label, which a tag draws only with `href`.
 * @csspart tag-start - The category before the label.
 * @csspart tags - The row of chosen options, when `multiple` is set.
 *
 * @cssstate blank - While nothing is chosen.
 * @cssstate error - While `load-error` is set.
 * @cssstate invalid - The control has an error to show, from the browser's validation or from your `feedback`.
 * @cssstate loading - While `loading` is set.
 * @cssstate no-results - What was typed hid every option of a list that has some.
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

  /** The region VoiceOver hears the highlight, the count and a choice from. */
  private readonly status = new StatusController(this)

  /**
   * The option, or the create row, the region last said: `null` for none,
   * and `undefined` until it has spoken since the list opened.
   */
  private told: Element | null | undefined = undefined

  /**
   * Whether text that names no option is taken as the value, as React Aria's
   * `allowsCustomValue`.
   *
   * For a field where the list is a help and not the whole of the answer, a
   * city or a job title. What was typed becomes the value when the reader
   * leaves the field or presses Enter with nothing highlighted, and text that
   * names an option takes that option. Unlike `creatable`, no event asks
   * first and no option is expected to be added: the value is the text.
   */
  @property({ attribute: 'allows-custom-value', type: Boolean })
  allowsCustomValue = false

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
   * Whether the user can add a value that is not in the list.
   *
   * The row appears while what is typed matches no option's words exactly, so
   * it is offered next to near misses too: a reader typing "Ruby on Rails" with
   * "Ruby" in the list wants the one they are typing, not the one they are
   * halfway through. The arrow keys reach it after the last option, and Enter
   * on it adds what was typed.
   */
  @property({ type: Boolean })
  creatable = false

  /**
   * The text of the create row, shown before the typed words it adds.
   */
  @property({ attribute: 'create-label' })
  createLabel = 'Add'

  /**
   * Text shown when the filter hides every option.
   */
  @property({ attribute: 'empty-text' })
  emptyText = 'No matches'

  /**
   * How long typing rests before the list is narrowed and `helix-filter` is
   * sent, in milliseconds.
   *
   * For options filtered on a server, where `helix-filter` starts a request: a
   * delay sends one request for a word instead of one per letter. The arrow
   * keys, Enter and Escape narrow at once on what was typed. `0` narrows on
   * every keystroke. See Listbox's `filter-delay`.
   */
  @property({ attribute: 'filter-delay', type: Number })
  filterDelay = 0

  /**
   * The list's name, read by screen readers. The list has no visible name.
   */
  @property({ attribute: 'list-label' })
  listLabel = 'Options'

  /**
   * What the list says when its options could not be loaded, such as after a
   * request to a server fails. Empty is no error. Passed to the list, which
   * shows it under any options there are and tells screen readers.
   */
  @property({ attribute: 'load-error' })
  loadError = ''

  /**
   * Whether the options are still loading.
   *
   * Passed straight to the list, which is where the rows are and so where the
   * message belongs.
   */
  @property({ reflect: true, type: Boolean })
  loading = false

  /**
   * Text the list shows while the options load.
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
   * The text shown when typing hides every one of the options, where there are
   * some. Absent, `empty-text` shows. See Listbox's `no-results-text`.
   */
  @property({ attribute: 'no-results-text' })
  noResultsText?: string

  /**
   * What opens the list: `input`, typing or pressing Down; `focus`, also
   * arriving in the field, by Tab or a press; or `manual`, only Down, Alt+Down
   * or a press on the caret, so typing narrows a list the reader has asked
   * for. React Aria's `menuTrigger`.
   */
  @property({ attribute: 'open-on' })
  openOn: 'focus' | 'input' | 'manual' = 'input'

  /**
   * Text shown while nothing has been chosen.
   */
  @property()
  placeholder = ''

  /**
   * Whether the choice is locked. A read-only combobox still submits its value.
   *
   * The field can be read and focused, the list does not open, and the tags of
   * a `multiple` combobox cannot be dismissed.
   */
  @property({ attribute: 'readonly', reflect: true, type: Boolean })
  readOnly = false

  /** Requests a new value. While `readOnly` is set, nothing changes. */
  override requestValue(next: string): boolean {
    if (this.readOnly) {
      return false
    }
    return super.requestValue(next)
  }

  /** Requests the list open or closed. While `readOnly` is set, it does not open. */
  override requestOpen(next: boolean): boolean {
    if (next && this.readOnly) {
      return false
    }
    return super.requestOpen(next)
  }

  /**
   * The name of the control that removes one chosen option, with `{name}`
   * filled in.
   *
   * **The name goes in**, so a row of them is heard as which one each
   * removes rather than as "Remove" said once per chosen option.
   */
  @property({ attribute: 'remove-label' })
  removeLabel = 'Remove {name}'

  /**
   * What a screen reader hears when typing leaves one option. `{count}` is
   * the count.
   */
  @property({ attribute: 'result-label' })
  resultLabel = '{count} result'

  /**
   * What a screen reader hears when typing leaves any other number of
   * options. `{count}` is the count, and `Intl.PluralRules` picks between the
   * two.
   */
  @property({ attribute: 'results-label' })
  resultsLabel = '{count} results'

  /**
   * What VoiceOver hears for a chosen option, as the highlight reaches it and
   * once it is chosen, on Apple devices. `{name}` is the option's words.
   */
  @property({ attribute: 'selected-label' })
  selectedLabel = '{name}, selected'

  /**
   * Whether the field completes the word as the user types.
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
   * Whether the reader has typed since the list opened, which decides what the
   * field shows: their text while they type, and the chosen words otherwise.
   */
  @state()
  private editing = false

  /** Whether the keyboard is on the create row rather than on an option. */
  @state()
  private onCreate = false

  /**
   * Whether the reader emptied the field, so leaving it clears the choice.
   *
   * Escape takes it back, being a reader putting things as they were.
   */
  private emptied = false

  /** Where the highlight goes when an arrow opens the list. */
  private opening: 'first' | 'last' | 'selected' | undefined = undefined

  /** Hears an option's words change, which no slot reports. See `Select`. */
  private watcher: MutationObserver | undefined = undefined

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

  /* Through this element's own value, which the field shows and the form
     receives. Written to the listbox, the index changed and nothing else did. */
  set selectedIndex(at: number) {
    this.value = this.listbox?.options[at]?.value ?? ''
  }

  /**
   * The control type, `select-one` or `select-multiple`, as on a native
   * `<select>`.
   */
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
    onDismiss: () => {
      this.commitEmptied()
      this.close()
    },
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
   * Whether a value is declared and this render cannot say what it is.
   *
   * **A placeholder is a statement, so a render that cannot read the words does
   * not make it.** `value` is an attribute and a server has it; the words are
   * the options' and the options are light-DOM children a server has none of.
   * The field then came out empty with "Search owners" over it, which says
   * nothing is chosen where the consumer had already said what is. Blank, it
   * says nothing, keeps its box, and is filled in by the render after
   * hydration, which is the answer `Select.Root.display` reaches for in the same
   * position and for the same reason.
   *
   * The placeholder still stands where there is genuinely no value, which is
   * what it is for and the one case a server can be sure of.
   */
  private get unresolved(): boolean {
    return this.values.length > 0 && !this.childrenKnown
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
   * The list's `error` and `no-results` states on the host too, so a page
   * styles the whole control from them, as WA's combobox and its status slots
   * allow. The list keeps its own, which only a stylesheet inside this shadow
   * root could reach.
   *
   * Read once the list has drawn the filter, since `hidden` is what the
   * filter writes onto an option: a filter that hid every option of a list
   * that has some, with nothing loading.
   */
  private markStatus(): void {
    const list = this.listbox
    this.toggleState('blank', this.value === '')
    this.toggleState('loading', this.loading)
    this.toggleState('error', this.loadError !== '')
    this.toggleState(
      'no-results',
      list !== null &&
        !this.loading &&
        list.filter !== '' &&
        list.options.length > 0 &&
        !this.showing,
    )
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
    this.refocusing = true
    this.partNamed('control')?.focus()
    this.refocusing = false
  }

  /**
   * Clears a single choice whose words the reader deleted, as they leave.
   *
   * Measured before this: emptying the field and pressing Tab put the old
   * choice back, so a combobox that was not required could not be emptied
   * once answered.
   */
  private commitEmptied(): void {
    if (this.emptied && !this.multiple && this.value !== '') {
      this.requestValue('')
    }
    this.emptied = false
    this.commitTyped()
  }

  /**
   * Takes what was typed as the answer, where `allows-custom-value` asks: the
   * option its words name, or the text itself. Returns whether it took any.
   */
  private commitTyped(): boolean {
    const typed = this.typed.trim()
    if (!this.allowsCustomValue || !this.editing || typed === '') {
      return false
    }
    const named = (this.listbox?.options ?? []).find(
      (option) => option.text.trim().toLowerCase() === typed.toLowerCase(),
    )
    const answer = named?.value ?? typed
    if (this.multiple) {
      if (!this.values.includes(answer)) {
        this.requestValue([...this.values, answer].join(','))
      }
    } else if (answer !== this.value) {
      this.requestValue(answer)
    }
    this.typed = ''
    this.suggestion = ''
    this.editing = false
    this.listbox?.requestFilter('')
    return true
  }

  /** The options the arrows can reach. */
  private get reachable(): HelixHeadlessListbox['options'] {
    return (this.listbox?.options ?? []).filter((option) => !option.hidden && !option.disabled)
  }

  /**
   * Moves between the options and the create row, which sits after the last
   * option, and returns whether the key was taken.
   *
   * The row is outside the list, so the list's own keys never reach it. While
   * it is showing, a Down past the last option lands on it and an Up from the
   * first one does, and either arrow from it goes back into the list.
   */
  private moveAroundCreate(event: KeyboardEvent): boolean {
    if (this.creation === '' || (event.key !== 'ArrowDown' && event.key !== 'ArrowUp')) {
      return false
    }
    const down = event.key === 'ArrowDown'
    if (this.onCreate) {
      event.preventDefault()
      this.onCreate = false
      this.listbox?.highlight(down ? 'first' : 'last')
      return true
    }
    const reachable = this.reachable
    const at = reachable.findIndex((option) => option.active)
    const edge = down ? reachable.length - 1 : 0
    if (reachable.length === 0 || at === edge) {
      event.preventDefault()
      this.onCreate = true
      this.listbox?.highlight('none')
      return true
    }
    return false
  }

  private readonly handleInput = (event: Event): void => {
    // Stopped for the reason `Input.handleInput` gives: the inner control's own
    // `input` is composed and would reach a consumer beside this element's.
    event.stopPropagation()
    const typed = (event.target as HTMLInputElement).value
    this.typed = typed
    this.editing = true
    this.onCreate = false
    this.emptied = typed.trim() === ''
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
    const inserted = isInsertion(event)
    this.narrowing.cancel()
    if (this.filterDelay > 0) {
      this.suggestion = ''
      this.narrowing.start(this.filterDelay, () => this.narrow(typed, inserted))
    } else {
      this.narrow(typed, inserted)
    }
    if (!this.open && this.openOn !== 'manual') {
      this.requestOpen(true)
    }
  }

  /**
   * Arriving in the field opens the list where `open-on` is `focus`, unless
   * this element is handing focus back to it as the list closes.
   */
  private readonly handleFocus = (): void => {
    if (this.openOn !== 'focus' || this.open || this.refocusing) {
      return
    }
    if (this.isDisabled || this.readOnly) {
      return
    }
    this.requestOpen(true)
  }

  /** Whether `close` is putting focus back in the field, which opens nothing. */
  private refocusing = false

  /** The narrowing waiting out `filterDelay`, if any. */
  private readonly narrowing = new DelayController(this, { renders: false })

  /** Narrows the list to what was typed, and finds the completion in what is left. */
  private narrow(typed: string, inserted: boolean): void {
    this.narrowing.cancel()
    const narrowing = new HelixFilterEvent({ value: typed })
    /* The list is narrowed before the completion is looked for, because the
       completion is the first thing still showing and that is not known until
       the filter has run. */
    if (this.dispatchEvent(narrowing)) {
      this.listbox?.requestFilter(typed)
      void this.listbox?.updateComplete.then(() => {
        this.linkActive()
        this.markStatus()
      })
    }
    this.suggestion = this.suggest && inserted ? this.completionFor(typed) : ''
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
    /* A key that acts on the list acts on what was typed, so a narrowing still
       waiting out `filterDelay` happens first. */
    if (['ArrowDown', 'ArrowUp', 'Enter', 'Escape', 'PageDown', 'PageUp'].includes(event.key)) {
      this.narrowing.flush()
    }
    if (event.key === 'Escape') {
      this.emptied = false
      if (this.open) {
        event.preventDefault()
        this.close()
        return
      }
      /* A second Escape, on the closed field, clears a single choice, which is
         the optional key the APG combobox lists. Only where there is one, so
         an Escape on an empty field still reaches a dialog around it. */
      if (!this.multiple && this.value !== '' && !this.readOnly) {
        event.preventDefault()
        event.stopPropagation()
        this.requestValue('')
      }
      return
    }
    if (event.key === 'Tab') {
      this.commitEmptied()
      if (this.open) {
        this.requestOpen(false)
      } else if (this.openOn === 'manual' && this.editing) {
        /* What a close does, for a field that was typed into and never
           opened: the words go back to the choice, and the list is whole. */
        this.typed = ''
        this.suggestion = ''
        this.editing = false
        this.listbox?.requestFilter('')
        this.requestUpdate()
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
    if (event.key === 'Enter' && this.creation !== '' && (this.onCreate || !this.showing)) {
      event.preventDefault()
      this.create()
      return
    }
    /* Enter with nothing highlighted takes the typed text, where custom values
       are allowed: with a match highlighted, Enter belongs to it. */
    if (
      event.key === 'Enter' &&
      this.allowsCustomValue &&
      !this.reachable.some((option) => option.active) &&
      this.commitTyped()
    ) {
      event.preventDefault()
      if (!this.multiple) {
        this.close()
      }
      return
    }
    /* A closed field hands nothing to the list. Its highlight is whatever the
       reader left when they dismissed it, so an Enter here chose the option
       they had just rejected with Escape, and kept the form from submitting.

       Down and Up open it, on the chosen option where there is one: one
       gesture to the reader. Measured before this: Down opened the list one
       past the chosen option. */
    if (!this.open) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        const fallback = event.key === 'ArrowDown' ? 'first' : 'last'
        this.opening = this.values.length > 0 ? 'selected' : fallback
        this.requestOpen(true)
      }
      return
    }
    if (this.moveAroundCreate(event)) {
      void this.updateComplete.then(() => this.linkActive())
      return
    }
    this.listbox?.navigate(event)
    void this.listbox?.updateComplete.then(() => this.linkActive())
  }

  /**
   * Enter in a closed field submits the form, as it does in a native text
   * field.
   *
   * The field is in a shadow root and has no form owner, so the platform never
   * runs implicit submission for it. On `keypress`, which a prevented
   * `keydown` suppresses, so an Enter that chose an option or created one
   * submits nothing.
   */
  private readonly handleKeypress = (event: KeyboardEvent): void => {
    if (event.key === 'Enter' && !this.open && !event.defaultPrevented) {
      submitImplicitly(this.form)
    }
  }

  /** @internal A single line of text counts against implicit submission. */
  protected override get blocksImplicitSubmission(): boolean {
    return true
  }

  /**
   * Tells the input which option is highlighted.
   *
   * **The input is where focus stays**, so it is what a screen reader asks.
   * The listbox points its own list at the option, which is right for a
   * listbox a reader is in and says nothing here: arrowing through a combobox
   * moved the highlight in silence. The list's highlight is its own state, so
   * this runs once the list has drawn the move, after an arrow and after a
   * keystroke narrows it, as well as on every update of this element.
   *
   * Through `ariaActiveDescendantElement`, as `FilterInput` does, because the
   * option is in the light DOM and the input in this shadow root, which an id
   * cannot cross. Feature-tested, the assignment being a silent no-op where it
   * is missing.
   */
  private linkActive(): void {
    const control = this.partNamed('control')
    const active = !this.open
      ? undefined
      : this.onCreate
        ? this.partNamed('create')
        : (this.listbox?.options ?? []).find((option) => option.active && !option.hidden)
    this.tell(active)
    if (!control || !('ariaActiveDescendantElement' in control)) {
      return
    }
    ;(
      control as Element & { ariaActiveDescendantElement: Element | null }
    ).ariaActiveDescendantElement = active ?? null
  }

  /**
   * Says the highlight, and the count as the list opens, where VoiceOver
   * would not.
   *
   * **VoiceOver does not read the option `aria-activedescendant` points to**
   * while focus is in a text field, so on Apple devices the arrows moved
   * through the list in silence. React Aria says the option there, with
   * "selected" where it is chosen, and how many there are as the list opens.
   * Only when the highlight moves to another option, so an update that leaves
   * it where it was says nothing.
   */
  private tell(active: Element | null | undefined): void {
    if (!this.open) {
      this.told = undefined
      return
    }
    if ((active ?? null) === this.told || !onApple()) {
      return
    }
    if (this.told === undefined) {
      this.counted = countLabel(
        this.reachable.length,
        this.resultLabel,
        this.resultsLabel,
        this.lang,
      )
    }
    this.told = active ?? null
    const option = active as (Element & { selected?: boolean; text?: string }) | undefined
    const words =
      option?.text === undefined
        ? (active?.textContent?.trim() ?? '')
        : option.selected
          ? fillTemplate(this.selectedLabel, { name: option.text })
          : option.text
    /* The count goes with the first option said, which the highlight often
       reaches in the update after the one that opened the list. */
    this.status.say([this.counted, words].filter(Boolean).join('. '))
    if (active) {
      this.counted = ''
    }
  }

  /** How many options there are, said as the list opens, until an option is said with it. */
  private counted = ''

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
    const chosen = this.listbox?.options.find((option) => option.value === value)
    if (chosen && onApple()) {
      this.status.say(fillTemplate(this.selectedLabel, { name: chosen.text }))
    }
    // Either way the search is spent: it found what it was for.
    this.emptied = false
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
   *
   * The tag is found by identity rather than by tag name. A name matches one
   * tier's element and leaves the other's press falling through to the open,
   * and a subclass under a third name is missed by both.
   */
  private readonly handleFieldClick = (event: MouseEvent): void => {
    if (this.isDisabled) {
      return
    }
    if (event.composedPath().some((node) => node instanceof HelixHeadlessTag)) {
      return
    }
    /* With `open-on="manual"`, a press into the text is for the caret in it;
       the caret indicator still opens. */
    const onText = event.composedPath().includes(this.partNamed('control') as EventTarget)
    this.refocusing = true
    this.partNamed('control')?.focus()
    this.refocusing = false
    if (!this.open && !(this.openOn === 'manual' && onText)) {
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
    /* Several answers as several entries, the way a native `<select multiple>`
       sends them; see `reportValues`. One answer as the string it is, since
       a single option's value may hold a comma. */
    if (this.multiple) {
      reportValues(this.internals, this.name, this.value === '' ? [] : this.value.split(','))
    } else {
      this.internals.setFormValue(this.value === '' ? null : this.value)
    }
    this.reportRequired(this.value === '', 'Choose one to continue.', 'control')
  }

  /** A link option, once followed, closes the panel as a choice does. */
  private readonly handleLinkFollowed = (event: Event): void => {
    afterLinkFollowed(event, () => this.requestOpen(false))
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('helix-select', this.handleLinkFollowed)
    this.watcher = new MutationObserver(() => this.requestUpdate())
    this.watcher.observe(this, {
      attributeFilter: ['label', 'value'],
      characterData: true,
      childList: true,
      subtree: true,
    })
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('helix-select', this.handleLinkFollowed)
    this.watcher?.disconnect()
    this.watcher = undefined
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    /* `<helix-option selected>` is the default value where none is written,
       as `<option selected>` is for a native `<select>`. See `Select`. */
    if (this.childrenKnown && this.defaultValue === '' && !this.hasAttribute('default-value')) {
      const declared = optionsAmong(this.knownChildren)
        .filter((option) => option.defaultSelected)
        .map((option) => option.value)
      if (declared.length > 0) {
        this.defaultValue = this.multiple ? declared.join(',') : (declared.at(-1) ?? '')
      }
    }
    if (this.creation === '') {
      this.onCreate = false
    }
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.finishHydration()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated?.(changed)
    this.sync()
    this.linkActive()
    void (this.listbox?.updateComplete ?? Promise.resolve()).then(() => this.markStatus())
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
    const wanted = this.fieldText
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
       everything the moment it reopens.

       With `open-on="manual"` the reader types into a shut field on purpose,
       so there only the close itself clears it. */
    if (!this.open && (this.openOn !== 'manual' || changed.has('open'))) {
      this.typed = ''
      this.suggestion = ''
      this.editing = false
      this.onCreate = false
      this.listbox?.requestFilter('')
    } else if (changed.has('open')) {
      /* Opened by an arrow, the highlight goes where the arrow says. Opened
         with the chosen words in the field, they are selected, so the first
         letter typed replaces them. */
      if (this.opening !== undefined) {
        this.listbox?.highlight(this.opening)
        this.opening = undefined
        void this.listbox?.updateComplete.then(() => this.linkActive())
      }
      if (control && !this.editing && !this.multiple && control.value !== '') {
        control.select()
      }
    }
  }

  /**
   * What the field shows: the typed text while the reader types, and the
   * chosen words otherwise, open or closed.
   *
   * Measured before this: opening the list emptied the field, so a reader
   * arrowing in to check the choice lost sight of it.
   */
  private get fieldText(): string {
    /* A shut field shows what was typed only where typing does not open it,
       `open-on="manual"`, the reader having typed into it on purpose. */
    if (this.multiple || ((this.open || this.openOn === 'manual') && this.editing)) {
      return this.suggestion || this.typed
    }
    return this.word
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
      exportparts="empty: listbox-empty, error: listbox-error, feedback: listbox-feedback,
        filter-icon: listbox-filter-icon, filter-mark: listbox-filter-mark, hint: listbox-hint,
        items: listbox-items, label: listbox-label, live: listbox-live, loading: listbox-loading,
        search: listbox-search, search-field: listbox-search-field"
      aria-label=${this.listLabel}
      empty-text=${this.emptyText}
      load-error=${this.loadError}
      loading-text=${this.loadingText}
      no-results-text=${this.noResultsText ?? nothing}
      result-label=${this.resultLabel}
      results-label=${this.resultsLabel}
      ?loading=${this.loading}
      ?multiple=${this.multiple}
      .value=${this.value}
      .chosenAgain=${() => this.close()}
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
      <!-- Handed on to the list's own, with the text as this slot's fallback:
           a slot passed into another is assigned there whether or not anything
           fills it, so the list's fallback would never show. -->
      <slot name="empty" slot="empty">${this.emptyText}</slot>
      <slot name="loading" slot="loading">${this.loadingText}</slot>
      <slot name="error" slot="error">${this.loadError}</slot>
      <!-- Handed on only while something fills it: an assigned slot hides the
           list's own fallback, which is no-results-text or empty-text. -->
      <slot
        name="no-results"
        slot=${this.querySelector?.(':scope > [slot="no-results"]') ? 'no-results' : nothing}
        @slotchange=${() => this.requestUpdate()}
      ></slot>
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
      exportparts="cell: tag-cell, dismiss: tag-dismiss, dismiss-mark: tag-dismiss-mark, label: tag-label, link: tag-link, start: tag-start"
                    data-value=${option.value}
                    dismiss-label=${fillTemplate(this.removeLabel, { name: option.text })}
                    ?dismissible=${!this.isDisabled && !this.readOnly}
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

  /**
   * The row offering to add what was typed, after the list.
   *
   * Written out twice rather than bound through `part=${…}`: a part is read
   * from the template as a literal, so a bound one is a `::part(create)` the
   * checks cannot pair with its `@csspart`. The keyboard arriving swaps the
   * element, and `linkActive` runs after the render that swaps it.
   */
  private renderCreate(): TemplateResult | typeof nothing {
    if (this.creation === '') {
      return nothing
    }
    return this.onCreate
      ? html`<button part="create create-active" id="create" type="button" @click=${() => this.create()}>
          ${this.createLabel} "${this.creation}"
        </button>`
      : html`<button part="create" id="create" type="button" @click=${() => this.create()}>
          ${this.createLabel} "${this.creation}"
        </button>`
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
          id=${this.controlId}
          type="text"
          role="combobox"
          autocomplete=${this.autocomplete || nothing}
          spellcheck="false"
          aria-controls="listbox"
          aria-autocomplete=${this.suggest ? 'both' : 'list'}
          aria-expanded=${this.open ? 'true' : 'false'}
          aria-describedby=${this.describedBy ?? nothing}
          aria-invalid=${this.invalidity ?? nothing}
          placeholder=${(this.chosen.length > 0 || this.unresolved ? '' : this.placeholder) || nothing}
          ?disabled=${this.isDisabled}
          ?readonly=${this.readOnly}
          .value=${this.fieldText}
          @focus=${this.handleFocus}
          @input=${this.handleInput}
          @keydown=${this.handleKeydown}
          @keypress=${this.handleKeypress}
        />
        <slot name="end"></slot>
        ${this.renderIndicator()}
      </div>
      <div part="surface" popover="manual" ?hidden=${!this.open}>
        ${this.renderListbox()}
        ${this.renderCreate()}
      </div>
      ${this.renderHint()}${this.renderFeedback()}${drawStatus(this.status)}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-combobox': HelixHeadlessCombobox
  }
}
