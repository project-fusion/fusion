import {
  AriaForwardController,
  afterLinkFollowed,
  customElement,
  HelixFormElement,
  hostAria,
  MixinControllerOpen,
  MixinControllerValue,
  MixinField,
  PopoverController,
  reportValues,
  typesCharacter,
} from '@fusion.dev/helix-core'
import { caretDown } from '@fusion.dev/helix-icons'
import { nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'
import { html } from 'lit/static-html.js'
import type { HelixHeadlessListbox } from '../../listbox/root/listbox-root.js'
import { type HelixHeadlessOption, optionsAmong } from '../../option/root/option-root.js'
import '../../listbox/index.js'

/**
 * @summary A control that opens a list of options to choose from.
 *
 * @description
 * A trigger that opens a `Listbox`. The list is the same element you can use on
 * its own, with the same keyboard behavior, filtering, and multi-select rules.
 * Select adds a trigger that shows what is chosen, a floating surface, and a
 * place for focus to return to when the list closes.
 *
 * Your options stay in your light DOM and are slotted through into the listbox,
 * so the listbox looks through slots to find them.
 *
 * `Select` owns the value, passes it down to the listbox, and takes changes
 * back, so the value lives in one place.
 *
 * Set `valueContent` to draw the trigger's content from the chosen options,
 * and several chosen options are written as a list in the reader's language.
 *
 * In the open list the arrow keys, Home, End, PageUp, PageDown and typed
 * letters move the highlight, and Enter, Space or a click chooses it and
 * closes the list. Tab closes the list and moves on. On the closed trigger,
 * ArrowDown, Enter and Space open the list on the chosen option, ArrowUp opens
 * it on the chosen or last option, Home and End open it on the first or last,
 * and typed letters choose the option whose words start with them, as a native
 * `<select>` does.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @aliases Dropdown, Picker
 * @documentation https://fusion.dev/helix/components/select
 *
 * @slot - The options, and any groups of them.
 * @slot end - Content after the chosen value, such as a count, a unit, or a clear button.
 * @slot feedback - The message that says what is wrong, for content richer than a string. It shows while there is a message.
 * @slot hint - The hint, for content richer than plain text.
 * @slot indicator - The icon on the trigger that shows it opens, usually a caret.
 * @slot label - The label, for content richer than plain text.
 * @slot start - Content before the chosen value, such as an icon or a prefix.
 *
 * @event {Event} change - Fired after the value changes.
 * @event {HelixBeforeChangeEvent} helix-before-change - Relayed from the listbox when the value is about to change. Cancelable: canceling it stops the change and leaves the decision to you.
 * @event {HelixBeforeCloseEvent} helix-before-close - Fired before the list closes. Cancelable: canceling it keeps the list open and leaves the decision to you.
 * @event {HelixBeforeOpenEvent} helix-before-open - Fired before the list opens. Cancelable: canceling it keeps the list closed and leaves the decision to you.
 * @event {HelixFilterEvent} helix-filter - Fired as the user types in the filter field of a `filterable` select, with the text the list is filtered by. Cancelable: cancel it to leave the list unfiltered and filter the options yourself.
 * @event {Event} input - Fired after the value changes.
 * @event {ToggleEvent} toggle - Fired after the list opens or closes, with `newState` and `oldState`.
 *
 * @csspart feedback - The message that says what is wrong with the value.
 * @csspart hint - Help under the trigger.
 * @csspart indicator - The caret that shows the control opens. Replaced by content in the `indicator` slot.
 * @csspart label - The label above the trigger.
 * @csspart listbox - The list inside the panel.
 * @csspart listbox-empty - The text shown when the filter hides every option.
 * @csspart listbox-feedback - The inner list's message that says what is wrong with the value.
 * @csspart listbox-filter-icon - The icon beside the filter field.
 * @csspart listbox-filter-mark - The default icon beside the filter field, shown when none is slotted.
 * @csspart listbox-hint - Help under the list.
 * @csspart listbox-items - The list of options.
 * @csspart listbox-label - The label above the list.
 * @csspart listbox-live - The inner list's `live` part, the region screen readers announce its empty and loading text from.
 * @csspart listbox-loading - The text shown while the options load.
 * @csspart listbox-search - The region that holds the filter field.
 * @csspart listbox-search-field - The filter field.
 * @csspart surface - The floating panel.
 * @csspart trigger - The closed control, which shows the chosen value.
 * @csspart value - The chosen option's text inside the trigger.
 *
 * @cssstate invalid - The control has an error to show, from the browser's validation or from your `feedback`.
 * @cssstate open - While the list is open.
 */
@customElement('helix-headless-select')
export class HelixHeadlessSelect extends MixinControllerOpen(
  MixinControllerValue(MixinField(HelixFormElement)),
) {
  /* A consumer's `aria-describedby` names ids in their own tree and the control
     is in this shadow root, so the reference has to be carried down as an
     element rather than copied as an id. See `AriaForwardController`: measured
     in Chrome's own tree, the host held the description and the control the
     reader is actually on was exposed without it. */
  protected readonly aria = new AriaForwardController(this, {
    labelledByAfter: () => {
      const value = this.partNamed('value')
      return value ? [value] : []
    },
    target: () => this.partNamed('trigger'),
  })

  /**
   * The text shown when no options match the filter.
   */
  @property({ attribute: 'empty-text' })
  emptyText = 'No matches'

  /**
   * Whether the list can be narrowed by typing.
   *
   * Passed to the listbox rather than acted on here, because the listbox owns
   * the filtering, the empty state and the keyboard.
   */
  @property({ reflect: true, type: Boolean })
  filterable = false

  /**
   * Whether the options are still loading.
   *
   * Passed straight to the list, which is where the rows are and so where the
   * message belongs. Two components saying "Loading" about one request is a
   * consumer wiring the same flag twice.
   */
  @property({ reflect: true, type: Boolean })
  loading = false

  /**
   * The text shown while the options load.
   */
  @property({ attribute: 'loading-text' })
  loadingText = 'Loading'

  /**
   * Whether more than one option can be chosen.
   */
  @property({ reflect: true, type: Boolean })
  multiple = false

  /**
   * Shown on the trigger while nothing is chosen.
   */
  @property()
  placeholder = 'Choose'

  /**
   * What the trigger shows for the chosen options: a function given them, in
   * the order they appear, that returns text, an element or a Lit template.
   *
   * For a trigger that shows more than the words, an avatar beside a name or a
   * count of a long set, as React Aria's `SelectValue` takes children. The
   * trigger is named by what this draws, so keep the words in it. Nothing
   * chosen still shows `placeholder`. A property only, there being no way to
   * write a function in markup.
   */
  @property({ attribute: false })
  valueContent?: ((chosen: readonly HelixHeadlessOption[]) => unknown) | undefined

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

  /* Through this element's own value, which is the one the trigger shows and
     the form receives. Written to the listbox instead, the index changed and
     nothing else did, because the listbox tells nobody about a value it was
     given. */
  set selectedIndex(at: number) {
    this.value = this.listbox?.options[at]?.value ?? ''
  }

  /** The kind of select, as the platform names it: `select-one` or `select-multiple`. */
  get type(): string {
    return this.multiple ? 'select-multiple' : 'select-one'
  }

  /**
   * The list inside the surface, or nothing where there is no DOM to hold one.
   *
   * The optional chain is the server. `renderRoot` is a property Lit's element
   * shim does not carry, and this getter is reached from `display`, which is
   * read during `render`: without it the select throws on every server render
   * and cannot be served at all.
   *
   * The other reads of `renderRoot` here are inside callbacks the controllers
   * invoke, and a controller only runs on a connected element, so they cannot
   * be reached from the server and are left plain.
   */
  private get listbox(): HelixHeadlessListbox | null {
    return this.partNamed<HelixHeadlessListbox>('listbox')
  }

  /* The surface floats *and is in the top layer*.
   *
   * Without `showPopover` the panel is an ordinary positioned element and the
   * first ancestor with `overflow: hidden` clips it, so a select inside a
   * scrolling card is cut off where a menu in the same place is not. The two
   * are the same shape (floating panel, trigger, dismissal), which is what
   * `PopoverController` is, and having one of them is what stops the third copy
   * being subtly different.
   *
   * Held off the trigger by the controller rather than by a margin on the
   * panel. A margin is inside the box the controller measures, so it would be
   * counted once in the placement and again in the layout, and the gap would
   * change as the panel flipped above the trigger for want of room.
   *
   * Not `MixinPickerField`, which floats a picker off a text field and hands
   * the caret back to it: there is no text here, the panel hangs off the
   * trigger, and dismissal puts focus back on that. */
  protected readonly panel = new PopoverController(this, {
    anchor: () => this.partNamed('trigger'),
    /* The surface *and* the trigger.
     *
     * A control is not always one element: the button that opens this panel is
     * part of it, and a press on it is not a press outside. Scoped to the
     * surface alone, `pointerdown` on the trigger closes the panel and the
     * trigger's own `toggleOpen` reopens it on the `click` that follows, so
     * the panel can never be closed by the button that opened it.
     *
     * `DismissController` documents this exact failure and takes a list for
     * it. */
    boundary: (): readonly (Element | null | undefined)[] => [
      this.partNamed('surface'),
      this.partNamed('trigger'),
    ],
    offset: () => 4,
    onDismiss: () => this.close(),
    open: () => this.open,
    placement: 'bottom-start',
    surface: () => this.partNamed('surface'),
  })

  /**
   * What the trigger says: the chosen options' words, or the placeholder.
   *
   * Read off the options rather than stored, because the words are the
   * consumer's content and storing a copy is storing something that goes stale
   * the moment they change it.
   *
   * **Off this element's own children, not the listbox's**, which reach the
   * listbox through a slot and so only after a render has made it: read there,
   * the first render showed the placeholder over a chosen value and waited on a
   * `slotchange`, which a declarative shadow root fires before anything listens,
   * so a hydrated select kept "Choose" for good. Nothing on a server or while
   * hydrating what one sent, which drew the placeholder too.
   *
   * **And the placeholder is a statement, so a render that cannot read the
   * words does not make it.** "Choose" means nothing is chosen. `value` is an
   * attribute and a server has it, the words are the children's and a server
   * has none, so a `<helix-select default-value="two">` served "Choose" over an
   * answer the consumer had already given: false to a reader, and false to a
   * crawler, on every select in the library's own examples. Where a value is
   * declared and the word for it cannot be read, the trigger says nothing and
   * keeps its box, which is the answer this library reaches for everywhere it
   * cannot tell empty from unknown. `firstUpdated` asks for the render that
   * fills it in.
   *
   * The placeholder still stands where there is genuinely no value, which is
   * what it is for and the one case a server can be sure of.
   *
   * **`nothing` and never `''`, which is the difference between a word that
   * arrives and one that never does.** Lit's hydration primes a child part with
   * whatever the render computed, and `''` is a primitive, so `_commitText`
   * takes the branch that assumes the server left a text node to overwrite.
   * There is none, the write lands on the closing part marker's comment data,
   * and the trigger stays empty for the life of the page: measured by
   * `check:spec:dsd`, which caught all nine of these and showed a blank select
   * beside a client's "Option Two". `nothing` primes the sentinel instead, so
   * the commit creates the text node it needs.
   */
  private get display(): string | typeof nothing {
    const chosen = new Set(this.value === '' ? [] : this.value.split(','))
    const words = this.chosenOptions.map((option) => option.text)
    if (words.length > 0) {
      /* A list in the reader's language, as React Aria writes one: `unit` and
         `short` is "A, B, C" in English and each language's own separators in
         the rest. */
      return new Intl.ListFormat(this.lang || undefined, { style: 'short', type: 'unit' }).format(
        words,
      )
    }
    return chosen.size > 0 && !this.childrenKnown ? nothing : this.placeholder
  }

  /** The chosen options, in the order they appear. None on a server or while hydrating. */
  private get chosenOptions(): HelixHeadlessOption[] {
    const chosen = new Set(this.value === '' ? [] : this.value.split(','))
    return optionsAmong(this.knownChildren).filter((option) => chosen.has(option.value))
  }

  /**
   * What the trigger shows, behind a seam: what `value-content` draws for the
   * chosen options, or their words, or the placeholder.
   */
  protected renderValue(): unknown {
    const chosen = this.chosenOptions
    return this.valueContent && chosen.length > 0 ? this.valueContent(chosen) : this.display
  }

  /** Where the highlight goes when the list opens, set by the key that opened it. */
  private opening: 'first' | 'last' | 'selected' = 'selected'

  /**
   * The values of the options seen on the last update, so an option that
   * leaves can be told apart from one that has not arrived yet.
   */
  private seen = new Set<string>()

  /**
   * Hears an option's words change, which no slot reports, and the host's
   * `aria-labelledby` change, which `triggerNames` reads.
   *
   * The trigger shows the chosen option's words, read at render time. A slot
   * reports an option arriving or leaving and says nothing when the text of
   * one already there changes, so a relabeled option left the old words on the
   * trigger. `label` and `value` are attributes that change the words too.
   *
   * Made on connection, there being no `MutationObserver` on a server.
   */
  private watchers: MutationObserver[] = []

  /** A link option, once followed, closes the panel as a choice does. */
  private readonly handleLinkFollowed = (event: Event): void => {
    afterLinkFollowed(event, () => this.requestOpen(false))
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('helix-select', this.handleLinkFollowed)
    const words = new MutationObserver(() => this.requestUpdate())
    words.observe(this, {
      attributeFilter: ['label', 'value'],
      characterData: true,
      childList: true,
      subtree: true,
    })
    const naming = new MutationObserver(() => this.requestUpdate())
    naming.observe(this, { attributeFilter: ['aria-labelledby'] })
    this.watchers = [words, naming]
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('helix-select', this.handleLinkFollowed)
    for (const watcher of this.watchers) {
      watcher.disconnect()
    }
    this.watchers = []
  }

  /** Opens the list with the highlight where the opening key says. */
  private openAt(where: 'first' | 'last' | 'selected'): void {
    this.opening = where
    this.requestOpen(true)
  }

  /** Closes the list and puts focus back where it came from. */
  private close(): void {
    if (!this.open) {
      return
    }
    this.requestOpen(false)
    // Back to the trigger, because focus is inside a panel that is going away
    // and a reader who loses it lands at the top of the document.
    this.partNamed('trigger')?.focus()
  }

  private readonly handleChange = (event: Event): void => {
    /* From the event, not from the listbox.
     *
     * The event carries the value being *proposed*, and it is dispatched before
     * it is applied, which is what makes it refusable. Reading the listbox here
     * reads the value it still holds: one choice behind, and on the first
     * choice nothing at all.
     *
     * `.value` going down to the listbox does not change that. It is a seed and
     * a correction rather than a claim of ownership, and the listbox applies its
     * own changes unless somebody refuses them, so its value catches up after
     * this handler and never before it. */
    const next = (event as CustomEvent<{ value: string }>).detail.value
    /* Nothing happens on a refusal.
     *
     * Without this return the panel closes and a native `change` goes out
     * whether or not the change was taken, so a consumer calling
     * `preventDefault()` on `helix-change` keeps the old value, watches the
     * select shut as though it had been chosen, and tells the form it moved. */
    if (!this.requestValue(next)) {
      event.stopPropagation()
      return
    }
    /* Closed on a choice, unless more than one can be made: a multi-select that
       shut after each pick would be a control the reader has to reopen to use
       again. */
    if (!this.multiple) {
      this.close()
    }
    /* The listbox's request is stopped and this element's own has already gone
       out, from `requestValue` above: two elements announcing one choice is
       what a consumer would have to deduplicate.

       And no `change` is dispatched here. `requestValue` announces `input` and
       `change` through the mixin, the way every other discrete control does, so
       a second one from this line is a second `change` per choice: measured on
       the styled tier at three, one from the mixin, one from here, and one from
       the listbox before it was stopped. */
    event.stopPropagation()
  }

  /**
   * The keys of the closed trigger.
   *
   * Letters choose without opening, the way a native `<select>` and React
   * Aria's Select do, so a reader who knows the answer types it. A Space in the
   * middle of those letters is one of them. With `multiple`, a letter opens the
   * list on the match instead, because adding to a set is a choice the reader
   * makes in the list.
   */
  private readonly handleTriggerKeydown = (event: KeyboardEvent): void => {
    const listbox = this.listbox
    if (typesCharacter(event) && (event.key !== ' ' || listbox?.typing)) {
      event.preventDefault()
      const match = listbox?.typeaheadTo(event.key)
      if (match === undefined) {
        return
      }
      if (this.multiple) {
        this.opening = 'selected'
        this.requestOpen(true)
      } else {
        this.requestValue(match)
      }
      return
    }
    const opens: Record<string, 'first' | 'last' | 'selected'> = {
      ' ': 'selected',
      ArrowDown: 'selected',
      ArrowUp: 'last',
      End: 'last',
      Enter: 'selected',
      Home: 'first',
    }
    const where = opens[event.key]
    if (where !== undefined) {
      event.preventDefault()
      /* ArrowUp opens on the chosen option where there is one, and on the
         last where there is none, which is where Up from nothing goes. */
      this.openAt(
        where === 'last' && event.key === 'ArrowUp' && this.value !== '' ? 'selected' : where,
      )
    }
  }

  /**
   * Tab closes the list and lets focus move on, as a native `<select>` does.
   *
   * Measured before this: Tab moved focus to the next control and left the
   * panel open over the page, because the panel closes on a press outside or
   * on Escape and nothing closed it when focus left.
   */
  private readonly handleListKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Tab' && this.open) {
      this.requestOpen(false)
    }
  }

  /**
   * Takes `<helix-option selected>` as the default value, and an option that
   * has left out of the value.
   *
   * The first is what a native `<select>` does with `<option selected>`, and
   * what `Option.defaultSelected` says: a form reset returns to it. A
   * `default-value` on the select wins.
   *
   * The second keeps the trigger and the form in agreement. Measured before
   * this: removing the chosen option made the trigger say "Choose" while the
   * form still submitted the removed value. Only an option seen before is
   * dropped, so a value set ahead of options that load later is kept.
   */
  private reconcileOptions(): void {
    /* Off this element's own children, as `display` reads its words, so the
       two cannot disagree about which options exist. */
    const options = optionsAmong(this.knownChildren)
    if (this.defaultValue === '' && !this.hasAttribute('default-value')) {
      const declared = options
        .filter((option) => option.defaultSelected)
        .map((option) => option.value)
      if (declared.length > 0) {
        this.defaultValue = this.multiple ? declared.join(',') : (declared.at(-1) ?? '')
      }
    }
    const present = new Set(options.map((option) => option.value))
    const held = this.value === '' ? [] : this.value.split(',')
    const gone = held.filter((value) => this.seen.has(value) && !present.has(value))
    this.seen = present
    if (gone.length > 0) {
      this.value = held.filter((value) => !gone.includes(value)).join(',')
    }
  }

  /** Reports the answer and the verdict on it. */
  private sync(): void {
    /* Several answers as several entries, the way a native `<select multiple>`
       sends them; see `reportValues`. One answer as the string it is, since
       a single option's value may hold a comma. */
    if (this.multiple) {
      reportValues(this.internals, this.name, this.value === '' ? [] : this.value.split(','))
    } else {
      this.internals.setFormValue(this.value === '' ? null : this.value)
    }
    this.reportRequired(this.value === '', 'Choose one to continue.', 'trigger')
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    hostAria(this.internals, { label: this.label })
    if (this.childrenKnown) {
      this.reconcileOptions()
    }
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.finishHydration()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.sync()
    this.linkHost()
    /* The panel follows `open` through the controller, which reads it after
       every update. What is left here is what only this element knows. */
    if (this.open) {
      /* Into the list, which is where the keyboard has to be for the arrows to
         mean anything. The listbox delegates focus, so this lands on the list
         inside it rather than stopping at the listbox element, which is not
         itself focusable.
       *
       * Only on the update that opened it. `updated` runs for any change while
       * the panel is up, a filter keystroke or a value arriving, and moving
       * focus on each of those is a focus thief. */
      if (changed.has('open')) {
        /* On the chosen option, or where the opening key says, and never on a
           highlight left over from the last time the list was open. */
        this.listbox?.highlight(this.opening)
        this.opening = 'selected'
        this.listbox?.focus()
      }
    } else {
      /* The filter goes with a close. Without this a filterable select reopens
         still narrowed by the old needle, with `hidden` still written on the
         options it ruled out, so the second use of the control starts from the
         first one's leftovers. Closing is where a search ends. */
      this.listbox?.requestFilter('')
    }
  }

  /**
   * The list the trigger opens, behind a seam the styled tier can move.
   *
   * A method rather than a fragment inline, so a tier above can render its own
   * list, wrap this one, or pass it a property the base does not know about,
   * without reimplementing the whole template. The tag is interpolated rather
   * than written, so `tier` resolves it: this renders the base listbox, and a
   * styled subclass that sets `tier` renders the styled one from the same
   * template.
   */
  protected renderListbox(): TemplateResult {
    return html`<${this.tag('listbox')}
      empty-text=${this.emptyText}
      loading-text=${this.loadingText}
      ?loading=${this.loading}
      part="listbox"
      exportparts="empty: listbox-empty, feedback: listbox-feedback, filter-icon: listbox-filter-icon,
        filter-mark: listbox-filter-mark, hint: listbox-hint, items: listbox-items,
        label: listbox-label, live: listbox-live, loading: listbox-loading, search: listbox-search,
        search-field: listbox-search-field"
      .value=${this.value}
      ?multiple=${this.multiple}
      ?filterable=${this.filterable}
      manual
      aria-label=${this.label || this.getAttribute('aria-label') || nothing}
      @keydown=${this.handleListKeydown}
      @helix-before-change=${this.handleChange}
      @change=${this.stopInner}
      @input=${this.stopInner}
    >
      <!-- An option arriving or leaving changes no property, so this is what
           schedules the update that rereads the trigger's words. -->
      <slot @slotchange=${() => this.requestUpdate()}></slot>
    </${this.tag('listbox')}>`
  }

  /**
   * The caret saying the control opens, behind a seam.
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
   * What names the trigger: the label, then the choice.
   *
   * **A button is named by its label alone**, and what it shows is not read:
   * the `<label for>` wins over the button's own text. Read from Chromium's
   * tree, a Select showing "Spanish" was a button named "Language", with the
   * choice in no name or value, so a reader never heard what was chosen. A
   * native `<select>` says both, and this names the trigger by both, the label
   * and then the value, in that order.
   *
   * A consumer's own `aria-labelledby` on the host wins, and so does a
   * `<label>` that names the host where there is no `label`. Both are carried
   * to the trigger by `AriaForwardController`, which reads the value after
   * them, so nothing is written here to fight it.
   */
  private get triggerNames(): string | typeof nothing {
    const outside = (this.internals.labels?.length ?? 0) > 0 && !this.labeled
    if (this.hasAttribute('aria-labelledby') || outside) {
      return nothing
    }
    return this.labeled ? `${this.labelId} value` : 'value'
  }

  protected override render(): TemplateResult {
    return html`${this.renderLabel()}
      <button
        part="trigger"
        id=${this.controlId}
        type="button"
        aria-labelledby=${this.triggerNames}
        aria-haspopup="listbox"
        aria-expanded=${this.open ? 'true' : 'false'}
        aria-describedby=${this.describedBy ?? nothing}
        aria-invalid=${this.invalidity ?? nothing}
        ?disabled=${this.isDisabled}
        @click=${() => this.toggleOpen()}
        @keydown=${this.handleTriggerKeydown}
      >
        <slot name="start"></slot>
        <span part="value" id="value">${this.renderValue()}</span>
        ${
          /* Before the indicator, not after it. The caret is the affordance
             saying the control opens, so it stays the last thing in the trigger
             whatever else is put in front of it. */
          ''
        }
        <slot name="end"></slot>
        ${
          /* The slot has a fallback: without one a select written without a
             hand-slotted icon draws no mark at all saying it opens. A caret is
             the mark, and slotting anything replaces it, which is this
             library's rule for a content property. */
          ''
        }
        ${this.renderIndicator()}
      </button>

      <div part="surface" popover="manual" ?hidden=${!this.open}>
        ${this.renderListbox()}
      </div>
      ${this.renderHint()}${this.renderFeedback()}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-select': HelixHeadlessSelect
  }
}
