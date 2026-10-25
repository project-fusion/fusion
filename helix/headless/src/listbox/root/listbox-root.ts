import {
  AriaForwardController,
  auditChildren,
  centerInView,
  chosenValues,
  columnStep,
  countLabel,
  customElement,
  type DataOption,
  type DataOptionItem,
  DelayController,
  DisabledCascadeController,
  drawAutofill,
  endInSight,
  filterKeeps,
  formatWords,
  HelixBeforeFilterEvent,
  type HelixBeforeSelectEvent,
  HelixFilterEvent,
  HelixFormElement,
  HelixLoadMoreEvent,
  hostAria,
  inlineStep,
  MixinCollection,
  MixinControllerValue,
  MixinField,
  MixinVoice,
  markMatches,
  OptionWindowController,
  onApple,
  pageRows,
  rangeAdd,
  reportValues,
  requestChange,
  SPOKEN_RULE,
  scrollItemIntoView,
  selectsAll,
  Typeahead,
  timeConverter,
  toggleEvery,
  typesCharacter,
  UpgradeController,
  VIRTUAL_RULE,
  words,
  wordsLocale,
} from '@fusion.dev/helix-core'
import { magnifyingGlass } from '@fusion.dev/helix-icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'
import { isOption } from '../../option/among.js'
import type { HelixHeadlessOption } from '../../option/root/option-root.js'

/**
 * The keys that move the list from a text field the reader is typing in.
 *
 * Home and End are left out. In a text field they move the caret, which is
 * what a reader editing a word expects, and APG lists them among the field's
 * own editing keys for a combobox.
 */
const FIELD_MOVES = new Set(['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp'])

/** The keys that move within a list, which is every key that moves at all. */
const MOVES = new Set([...FIELD_MOVES, 'End', 'Home'])

/** How many rows a page key moves where the list has no height to measure. */
const PAGE = 10

/**
 * One option as the list reads it: an element of the consumer's, or a record
 * of `items`, which is never a link.
 */
type Entry = HelixHeadlessOption | (DataOption & { href?: undefined })

/**
 * @summary A list of options, from which you choose one or several.
 *
 * @description
 * The listbox is the control, and options are its items. A Select is a listbox
 * with a trigger in front of it, a Combobox is a listbox with a text input, and
 * a command palette is a listbox in a dialog. They differ only in what opens
 * the list and what filters it.
 *
 * With `multiple` set, `value` is a comma-separated string, like
 * `Checkbox.Group`'s, because `MixinControllerValue` holds a string. The form
 * receives one entry per selected option, as a native `<select multiple>` sends
 * it, so your server does not split on commas. An option's value may hold a
 * comma: a run of the string that is an option's value is read as that one
 * value, and the form sends it as one entry.
 *
 * Selected and active are separate. The selected option is the value. The
 * active option is where the keyboard is: the arrow keys move it, and
 * `aria-activedescendant` points to it while focus stays on the list.
 *
 * **Keyboard.** The list is one tab stop, or its filter field is where there
 * is one. In a single-choice list the highlight is the choice unless `manual`
 * is set; then Enter, Space or a click chooses.
 *
 * | Key | What it does |
 * |---|---|
 * | Down, Up | Moves the highlight to the next or the previous option, round from the last to the first. With `layout="grid"`, to the option below or above, stopping at the edge. |
 * | Right, Left | With `layout="grid"`, moves to the next or the previous option, mirrored right to left. In a filter field, moves the caret. |
 * | Home, End | Moves to the first or the last option. In a filter field, moves the caret. |
 * | Page Down, Page Up | Moves by as many options as the list shows at once. |
 * | A letter or a word | Moves to the next option whose words start with what you typed. In a filter field, types it. |
 * | Enter | Chooses the highlighted option, or follows it where it is a link. |
 * | Space | Chooses the highlighted option, or with `multiple` toggles it. In a filter field, types a space. |
 * | Shift with Down or Up | With `multiple`, adds the option the highlight moves to. In a filter field, moves the highlight and leaves the value. |
 * | Shift with Space | With `multiple`, adds every option from the one last chosen to the highlighted one. In a filter field, types a space. |
 * | Shift with Home or End | With `multiple`, adds every option from the highlight to that end. In a filter field, hold Control as well. |
 * | Control or Command with A | With `multiple`, chooses every option, or none where all are chosen. In a filter field, selects the text. |
 * | Escape | In a filter field, clears the filter. |
 * | Alt with Up or Down | In a `reorderable` list, moves the highlighted option a place. Alt with Home or End moves it to either end. |
 *
 * **ARIA.** The `items` part is the `listbox`, named by the label and
 * described by the hint and the message, with `aria-multiselectable` under
 * `multiple`, `aria-required`, `aria-invalid`, and `aria-busy` while loading.
 * Each option is an `option` with `aria-selected`. The list, or its filter
 * field, points `aria-activedescendant` at the highlighted option; the field
 * is `aria-autocomplete="list"` and controls the list.
 *
 * An option with `href` is a link: Enter or a press follows it and selects
 * nothing, and moving onto it with the arrows does not follow it.
 *
 * As a filter narrows the list, a screen reader hears how many options are
 * left, such as "3 results", from `result-label` and `results-label`. A filter
 * that leaves none says `empty-text`.
 *
 * **Moving options** is a separate import, `@fusion.dev/helix/listbox/reorder`,
 * so a list that never moves options carries none of its code. With it
 * imported, `reorderable` lets a reader move options:
 *
 * - Alt with Up or Down moves the highlighted option a place, and Alt with
 *   Home or End moves it to either end, as the APG's rearrangeable listbox
 *   does. The highlight stays on it.
 * - A pointer drags an option, with a drop indicator, and the list scrolls near
 *   an edge. A press that does not travel still chooses the option.
 * - A drop sends `helix-before-reorder`, which you can refuse, and then
 *   `helix-reorder`, whose `keys` hold every value in the new order. **You
 *   move the options**, or set `items` in the new order: the list moves no
 *   element of yours.
 * - The list says each move in its `live` region. The words are the
 *   `moved-label`, `canceled-label`, `dropped-label`, and `picked-up-label`
 *   attributes, which the import reads.
 * - An option in a group moves within its group. Options do not move while a
 *   filter narrows the list, under `layout="grid"`, or while the list is
 *   disabled.
 *
 * **The options are an import of their own.** An option you write is the Option
 * family's, which the list does not register, so a page that writes one imports
 * it beside the list:
 *
 * ```js
 * import '@fusion.dev/helix/listbox'
 * import '@fusion.dev/helix/option'
 * ```
 *
 * In development, a list holding an option nobody registered says so once the
 * page has loaded, with the line to add. The options `items` draws are this
 * Option too, and need the same import.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @aliases Options, Select list
 * @documentation https://fusion.dev/helix/components/listbox
 *
 * @slot - The options, and any groups of them.
 * @slot empty - What the list shows when it has no options to show, for content richer than `empty-text`.
 * @slot error - What the list shows while `load-error` is set, for content richer than its text.
 * @slot feedback - The message that says what is wrong, for content richer than a string. It shows while there is a message.
 * @slot filter-icon - The icon in the filter field. Defaults to a magnifying glass.
 * @slot hint - The hint, for content richer than plain text.
 * @slot label - The label, for content richer than plain text.
 * @slot loading - What the list shows while its options load, for content richer than `loading-text`.
 * @slot no-results - What the list shows when a filter hides every option, for content richer than `no-results-text`.
 *
 * @event {Event} change - Fired after the value changes.
 * @event {HelixBeforeChangeEvent} helix-before-change - Fired when the value is about to change, and cancelable.
 * @event {HelixBeforeFilterEvent} helix-before-filter - Fired before the list is filtered, and cancelable.
 * @event {HelixBeforeListenEvent} helix-before-listen - The dictation button was pressed. Cancelable: cancel it to keep the field from listening.
 * @event {HelixBeforeReorderEvent} helix-before-reorder - Fired when an option is dropped at a new place, in a `reorderable` list with `@fusion.dev/helix/listbox/reorder` imported, with every value in the new order. Cancelable: cancel it to keep the option where it is.
 * @event {HelixFilterEvent} helix-filter - Fired after the list is filtered, with the text it is filtered by, which `filter` also holds.
 * @event {HelixListenEvent} helix-listen - Dictation settled on a phrase and put it in the search field, after the field's own `input`.
 * @event {HelixLoadMoreEvent} helix-load-more - Fired once the list is scrolled within a screen of its end, once for each number of options, and not while `loading` is set. Add the next page of options and set `loading` while you fetch it.
 * @event {HelixReorderEvent} helix-reorder - Fired after `helix-before-reorder` when nobody canceled it. Move your options, or your `items`, to the order in `keys`.
 * @event {Event} input - Fired after the value changes.
 *
 * @csspart empty - The text shown when the list has no options to show, or the filter hides every one. `:state(no-results)` is set for the second.
 * @csspart error - The text shown while `load-error` is set.
 * @csspart feedback - The message that says what is wrong with the value.
 * @csspart filter-icon - The icon beside the filter field.
 * @csspart filter-mark - The default icon beside the filter field, shown when none is slotted.
 * @csspart hint - Help under the list.
 * @csspart items - The list of options.
 * @csspart label - The label above the list.
 * @csspart live - A copy of the empty and loading text, how many options a filter left, and each move in a `reorderable` list, in a region that screen readers announce when it changes. Visually hidden in the styled tier.
 * @csspart loading - The text shown while the options load.
 * @csspart search - The region that holds the filter field.
 * @csspart search-field - The filter field.
 * @csspart voice - The dictation button, under `voice` on a `filterable` list, in the search field.
 * @csspart voice-level - The meter that draws the microphone's level in place of its glyph while the field listens, where the tier defines Voice Level.
 * @csspart voice-level-canvas - The canvas the dictation meter draws on.
 * @csspart voice-listening - The dictation button while it listens. Set alongside `voice`.
 * @csspart voice-status - What a screen reader hears as dictation starts and stops, drawn for no one else.
 *
 * @cssstate empty - The list has no options to show: none were given, or the filter hid every one.
 * @cssstate error - While `load-error` is set.
 * @cssstate invalid - The control has an error to show, from the browser's validation or from your `feedback`.
 * @cssstate listening - While the field listens for dictation. The element sets `--dictation-level` on itself meanwhile, from 0 to 1, for a meter.
 * @cssstate loading - While `loading` is set.
 * @cssstate no-results - A filter hid every option of a list that has some.
 */
@customElement('helix-headless-listbox')
export class HelixHeadlessListbox extends MixinVoice(
  MixinCollection(MixinControllerValue(MixinField(HelixFormElement))),
) {
  protected static override markRules = [VIRTUAL_RULE, SPOKEN_RULE]

  /**
   * The key this family's words are registered under, its styled tag:
   * `registerWords('de', { 'helix-listbox': { filterLabel: 'Filtern' } })`.
   */
  static words = 'helix-listbox'

  /* A consumer's `aria-describedby` names ids in their own tree and the control
     is in this shadow root, so the reference has to be carried down as an
     element rather than copied as an id. See `AriaForwardController`: measured
     in Chrome's own tree, the host held the description and the control the
     reader is actually on was exposed without it. */
  protected readonly aria = new AriaForwardController(this, {
    target: () => this.partNamed('items'),
  })

  /**
   * What a browser's autofill may choose, as a platform token such as
   * `country` or `cc-exp-month`, as a native `<select>` takes it.
   *
   * Set, the list draws a hidden native `<select>` with the same options for
   * the browser to fill, as React Aria's `HiddenSelect` does, and a fill
   * chooses the option. `off`, the default, draws none.
   *
   * **The filter field is never filled.** It narrows the list rather than
   * collecting a value, so a browser offering it a saved address competes
   * with the reader for the same keystrokes: it is always `off`.
   */
  @property()
  autocomplete = 'off'

  /**
   * The filter text the list starts with, when `filter` is not set.
   */
  @property({ attribute: 'default-filter' })
  defaultFilter = ''

  /**
   * The text shown when the filter hides every option.
   *
   * From `MixinCollection`, which every collection in the library now shares,
   * and re-declared here only to keep this list's own wording: "No matches" is
   * about a filter, and the mixin's "Nothing to show" is about a list that was
   * never given anything.
   */
  @words
  @property({ attribute: 'empty-text' })
  override emptyText = 'No matches'

  /** What the list is narrowed to, whoever set it. */
  private filterState: string | undefined = undefined

  /**
   * @internal Set by `Command` under `home-end="list"`: whether Home and End
   * in the filter field move the highlight, without Shift, rather than the
   * caret. A property, as coordination between elements.
   */
  @property({ attribute: false })
  fieldHomeEnd = false

  /**
   * The text the list is filtered by, if any.
   *
   * Filtering hides rather than removes, so nothing about the value changes and
   * the list is still the consumer's own elements in their own order. Reading
   * gives what is being filtered on; writing declares it theirs, and
   * `default-filter` seeds one the list owns.
   */
  @property()
  get filter(): string {
    return this.filterState ?? this.defaultFilter
  }

  set filter(next: string) {
    const previous = this.filter
    this.filterState = next
    this.requestUpdate('filter', previous)
  }

  /**
   * Whether the list shows a field for filtering it.
   *
   * The field lives here rather than in whatever frames the list, because the
   * filtering already does: `filter`, the empty state and the keyboard are all
   * this component's. A select, a combobox and a command palette drawing their
   * own search boxes would be three copies of one field.
   */
  @property({ attribute: 'filterable', reflect: true, type: Boolean })
  filterable = false

  /**
   * How long typing in the filter field rests before the list is filtered, in
   * milliseconds. `0` filters on every keystroke. The attribute also takes a
   * CSS time, such as `300ms`.
   *
   * For a list filtered on a server, where `helix-before-filter` starts a request: a
   * reader typing a word sends one request for the word, not one for each
   * letter. Enter and the arrow keys filter at once on what is typed, so they
   * act on the list the reader expects.
   */
  @property({ attribute: 'filter-delay', converter: timeConverter('filter-delay', 0) })
  filterDelay = 0

  /**
   * Placeholder text for the filter field.
   */
  @words
  @property({ attribute: 'filter-label' })
  filterLabel = 'Filter'

  /**
   * Whether an option is kept by the filter: a function given the option's
   * words and the filter, trimmed, that returns `true` to keep it showing, as
   * React Aria's `Autocomplete` takes `filter`. For matching that ignores
   * accents, matches the start of each word, or matches out of order.
   *
   * Absent, an option is kept where its words hold the filter, in any case. A
   * property only, there being no way to write a function in markup.
   */
  @property({ attribute: false })
  filterMatch?: ((text: string, filter: string) => boolean) | undefined

  /**
   * The options as data, for a list too long to draw whole: each a value,
   * which is also its words, or a record with a `value`, a `label` and
   * `disabled`. Set, the list draws only the options in sight, and the ones
   * you write as children are not read.
   *
   * **Every option is still reachable.** The keyboard, the typeahead, the
   * filter and the value work over the whole set, and the option the keyboard
   * is on is drawn wherever it is, so a screen reader is told about it. Each
   * drawn option says its place in the set (`aria-posinset`, `aria-setsize`).
   * React Aria virtualizes a `ListBox` with its `Virtualizer`; this is core's
   * `VirtualizeController`.
   *
   * **The list needs a height to scroll in**: the styled tier's
   * `--listbox-max-block-size`, or a `max-block-size` on `::part(items)` in the
   * headless tier. The options drawn are this tier's Option, which the page
   * imports, as it imports the options it writes.
   * A server sends the list empty, and the options are drawn once it hydrates.
   */
  @property({ attribute: false })
  items: readonly DataOptionItem[] | undefined = undefined

  /**
   * How the options are laid out, which the arrow keys follow: `stack`, one
   * under another, or `grid`, in rows and columns, as React Aria's `ListBox`
   * lays out cards or photos. With `grid`, Up and Down move within a column,
   * and Left and Right along the list, mirrored right to left.
   *
   * The columns are the stylesheet's: the styled tier draws them at
   * `--listbox-column-min-inline-size` or wider, and a headless list lays out
   * `::part(items)` as it likes, since the keys read where each option is
   * drawn. A list of `items` stays a stack. Left out, the list is a stack,
   * and the host carries no attribute for it.
   */
  @property({ reflect: true })
  layout?: 'grid' | 'stack'

  /** Draws `items` a window at a time. See core's `OptionWindowController`. */
  private readonly data = new OptionWindowController(this, {
    current: () => this.currentValue,
    items: () => this.items,
  })

  /**
   * What the list says when its options could not be loaded, such as after a
   * request to a server fails. Empty, null or no attribute is no error, so
   * removing the attribute clears it.
   *
   * Set, it shows under any options there are, in place of `empty-text` and
   * `loading-text`, and a screen reader hears it. Clear it when you ask again.
   */
  @property({ attribute: 'load-error' })
  loadError: string | null = ''

  /**
   * Stops the arrow keys from choosing each option they move to. Enter, Space
   * or a click chooses the highlighted option.
   *
   * By default a single-choice list chooses as the arrows move, as a radio
   * group does. Select and Time Input set this on the list in their panel, so
   * a reader can move through the options before closing the panel on one.
   */
  @property({ type: Boolean })
  manual = false

  /**
   * Whether more than one option can be chosen.
   *
   * A press then toggles the option pressed, and Shift with a press adds every
   * option from the one last chosen to it, as React Aria's list does.
   */
  @property({ reflect: true, type: Boolean })
  multiple = false

  /**
   * The text shown when a filter hides every option of a list that has some.
   *
   * Absent, the list says `empty-text` in both cases. Set it to tell "nothing
   * matches what you typed" from "there is nothing here".
   */
  @property({ attribute: 'no-results-text' })
  noResultsText?: string

  /**
   * Lets a reader move options, once `@fusion.dev/helix/listbox/reorder` (or
   * `@fusion.dev/helix-headless/listbox/reorder`) is imported: Alt with an
   * arrow moves the highlighted option, and a pointer drags one. The list
   * moves no option itself: you move your options, or your `items`, on
   * `helix-reorder`. Without that import it does nothing, so a list that never
   * moves options carries none of the code.
   */
  @property({ type: Boolean })
  reorderable = false

  /**
   * What a screen reader hears when a filter leaves one option, where
   * `results-label` should not say it. `{count}` is the count.
   *
   * @deprecated Write every form in `results-label`, as `{count, plural, one
   * {# result} other {# results}}`. Removed in the next major version.
   */
  @property({ attribute: 'result-label' })
  resultLabel?: string

  /**
   * What a screen reader hears when a filter narrows the list. `{count}` is
   * how many options are left, written in the locale, and each language
   * writes the forms it has: `{count, plural, one {# wynik} few {# wyniki}
   * many {# wyników} other {# wyniku}}`.
   */
  @words
  @property({ attribute: 'results-label' })
  resultsLabel = '{count, plural, one {# result} other {# results}}'

  /**
   * What VoiceOver hears as the highlight reaches a chosen option from the
   * filter field, on Apple devices. `{name}` is the option's words.
   */
  @words
  @property({ attribute: 'selected-label' })
  selectedLabel = '{name}, selected'

  /**
   * The message reported when the field is required and no option is chosen.
   * Absent, or empty, is this sentence, or the words registered for the page's
   * locale.
   */
  @words
  @property({ attribute: 'value-missing-message' })
  override valueMissingMessage = 'Choose one to continue.'

  /**
   * Which option the keyboard is on, which is not what is chosen.
   */
  @state()
  private activeValue = ''

  /**
   * Whether the highlight was cleared on purpose, so the filter does not put
   * it back on the first match.
   */
  private parked = false

  /**
   * Whether the reader moved the highlight since the filter last changed, by
   * an arrow key, Home or End, a press, or the control that owns this list.
   * Until they do, the highlight follows the first option a filter leaves.
   */
  private steered = false

  /**
   * Watches the options' containers while a filter is set, so options a
   * framework reorders or replaces after a keystroke are counted again.
   */
  private sources: MutationObserver | undefined = undefined

  /**
   * The option last chosen, which Shift with Space or with a press extends
   * from.
   */
  private anchor = ''

  /**
   * Whether Shift was held for the press being handled, read off the click on
   * its way down to the option, which is where React Aria extends a range.
   */
  private shifted = false

  /** The letters typed at the list, which move the highlight to a match. */
  private readonly typeahead = new Typeahead()

  /**
   * The values of the options seen on the last pass, so an option that leaves
   * can be told apart from one that has not arrived yet.
   */
  private seen = new Set<string>()

  /**
   * Whether the key being handled was forwarded rather than typed into this.
   *
   * Plain state rather than reactive: it is set and cleared inside one
   * synchronous call, so nothing renders while it is true and nothing outside
   * can observe it.
   */
  private forwarded = false

  /**
   * Whether anything survived the filter, kept as state rather than counted at
   * render time.
   *
   * The options are the consumer's elements rather than this component's
   * markup, so the hiding is done to them in `willUpdate` and the render reads
   * the answer it left here. Counted during render instead, a filter matching
   * nothing left an empty box with no message in it.
   *
   * Plain rather than reactive: `place` writes it inside an update, which
   * draws it, and a slot change asks for that update.
   */
  private hasMatches = true

  /**
   * Whether the options have been looked at yet.
   *
   * Emptiness is a fact about light DOM children, and the server has none to
   * count: without this the list shipped "Nothing to show" over markup that was
   * about to have options in it, which is the one thing an empty state must
   * never do. `place` does not run on the server, so this is false exactly
   * when the answer is unknown. Plain, for the reason `hasMatches` is.
   */
  private counted = false

  /* Stated once, and the group never thinks about it again. See the
     controller: cascading by hand from each method that changes the set
     leaves the paths that reached it differing by component. */
  protected readonly cascade = new DisabledCascadeController(this, {
    items: () => this.options,
  })

  /**
   * Which option is chosen, as an index, or `-1` where none is.
   *
   * `<select>`'s own pair, and this control is what stands in for one. The
   * options are the consumer's own light-DOM children, so an index is a
   * position among the elements they wrote rather than into anything this
   * renders, which is what makes it the same number `<select>` would give.
   *
   * With `multiple` it is the first chosen one, which is also what the platform
   * answers: a single index cannot describe a set, and `value` is the property
   * that can.
   */
  get selectedIndex(): number {
    return this.entries.findIndex((option) => option.selected)
  }

  set selectedIndex(at: number) {
    const option = this.entries[at]
    this.value = option?.value ?? ''
  }

  /**
   * @internal Moves the highlight without choosing, for the control that owns
   * this list: to the first or last option a reader can reach, to the chosen
   * one (or the first where none is), or nowhere.
   *
   * Select opens its panel on the chosen option, or on the last one for
   * ArrowUp, and Combobox moves the highlight off the list onto its create row.
   */
  highlight(where: 'first' | 'last' | 'none' | 'selected'): void {
    const shown = this.shown.filter((option) => !option.disabled)
    this.typeahead.reset()
    this.parked = where === 'none'
    this.steered = true
    const values = where === 'selected' ? new Set(this.values) : undefined
    const chosen = values && shown.find((option) => values.has(option.value))
    this.activeValue =
      where === 'none'
        ? ''
        : ((where === 'last' ? shown.at(-1) : (chosen ?? shown[0]))?.value ?? '')
    if (this.childrenKnown) {
      this.place()
    }
  }

  /**
   * Says how many options a filter left, in the live region.
   *
   * **A reader typing into a filter cannot see the list narrow**, and React
   * Aria and Web Awesome both say the count as it changes. Only "No matches"
   * was said here, so a query that left forty options and one that left one
   * sounded the same. Said when the filter changes and the count with it, so
   * a keystroke that leaves the same options says nothing new. An empty filter
   * says nothing, being the list as it was given; no matches is `empty-text`,
   * which the region says in place of this. A load that ends says the count
   * too, whatever the filter.
   */
  private tell(changed: PropertyValues): void {
    if (!this.hasUpdated) {
      return
    }
    /* **A load that ends says what it brought.** A combobox filtering on a
       server cancels `helix-before-filter`, sets `loading` and replaces the options,
       so the filter here never moves: the region said "Loading" and then
       nothing, and the new count was never heard. */
    const loaded = changed.get('loading') === true && !this.loading
    if (!changed.has('filter') && !loaded) {
      this.tellActive(changed)
      return
    }
    const count = this.shown.length
    this.announced =
      (this.filter.trim() || loaded) && count
        ? this.resultLabel
          ? countLabel(count, this.resultLabel, this.resultsLabel, wordsLocale(this))
          : formatWords(this, 'resultsLabel', { count })
        : ''
  }

  /**
   * Says the option the arrows reached from the filter field, on Apple devices.
   *
   * **VoiceOver does not read the option `aria-activedescendant` points to**
   * while focus is in a text field, so a filterable list moved its highlight
   * in silence there. React Aria's combobox says the option on Apple devices,
   * with "selected" where it is chosen; the field here is the same pattern.
   * Only while the field has focus, so a highlight placed as the list opens
   * or seeded from the value says nothing until the reader moves it.
   */
  private tellActive(changed: PropertyValues): void {
    if (
      !changed.has('activeValue') ||
      !this.filterable ||
      !onApple() ||
      (this.renderRoot as ShadowRoot).activeElement?.getAttribute('part') !== 'search-field'
    ) {
      return
    }
    const active = this.entries.find((option) => option.value === this.activeValue)
    if (active) {
      this.announced = active.selected
        ? formatWords(this, 'selectedLabel', { name: active.text })
        : active.text
    }
  }

  /**
   * @internal Moves the highlight to the option whose words start with the
   * letters typed, and returns its value, or nothing where none matches.
   *
   * For a control that takes the letters while this list is not where focus
   * is: Select's closed trigger chooses the option this returns, as a native
   * `<select>` does.
   */
  typeaheadTo(key: string): string | undefined {
    const shown = this.shown.filter((option) => !option.disabled)
    const current = this.currentValue
    const from = shown.findIndex((option) => option.value === current)
    const at = this.typeahead.match(
      key,
      shown.map((option) => option.text),
      from,
    )
    const target = shown[at]
    if (!target) {
      return undefined
    }
    this.parked = false
    this.activeValue = target.value
    return target.value
  }

  /**
   * @internal Called when the option already chosen is chosen again, which
   * changes nothing here and answers the question for the control that opened
   * the list. Select and Combobox close their panel on it, as a native
   * `<select>` closes when its own answer is pressed.
   */
  chosenAgain: (() => void) | undefined = undefined

  /** @internal Whether letters typed in the last moment are still one search. */
  get typing(): boolean {
    return this.typeahead.typing()
  }

  /**
   * The kind of list, as the platform names it: `select-one` or
   * `select-multiple`.
   *
   * Derived rather than declared, because `multiple` already decides it and a
   * second property could disagree.
   */
  get type(): string {
    return this.multiple ? 'select-multiple' : 'select-one'
  }

  /**
   * Every option, in the order they appear.
   *
   * Descendants rather than children, because a group puts a level between the
   * list and its options and the keyboard has to move through a grouped list
   * exactly as it moves through a flat one.
   */
  get options(): HelixHeadlessOption[] {
    return this.among(isOption, this.children)
  }

  /* An option that upgrades after it arrived is read again, so `default-value`
     selects it. Through a group too, which puts a level between them. */
  protected readonly upgradeWatch = new UpgradeController(this, undefined, { subtree: true })

  /**
   * The elements of one kind in the list: its options, its groups or its
   * rules. Walks the tree, and walks *through* a slot when it meets one.
   *
   * Through a slot because that is how this gets composed. `Select` renders a
   * listbox in its own shadow root with a slot inside it, so the options are
   * the *select's* light DOM and the listbox's only child is the slot: a plain
   * `querySelectorAll` finds the slot and no options at all, and the whole
   * component comes up empty.
   */
  private among<T extends Element>(is: (node: Element) => boolean, nodes: Iterable<Element>): T[] {
    const found: T[] = []
    for (const node of nodes) {
      if (is(node)) {
        found.push(node as T)
      } else {
        found.push(
          ...this.among<T>(
            is,
            node instanceof HTMLSlotElement
              ? node.assignedElements({ flatten: true })
              : node.children,
          ),
        )
      }
    }
    return found
  }

  /**
   * The groups, found the same way and for the same reason, and by their
   * name rather than their class, as the rules are: a list that holds no group
   * does not carry the group's code, and either tier's tag ends the same way.
   */
  private get groups(): HTMLElement[] {
    return this.among((node) => node.localName.endsWith('-option-group'), this.children)
  }

  /** Every option the list reads: the records of `items`, or the elements. */
  private get entries(): Entry[] {
    return this.data.records ?? this.options
  }

  /** The option elements on the page: the ones drawn for `items`, or the children. */
  private get elements(): HelixHeadlessOption[] {
    return this.data.records ? (this.data.drawn as HelixHeadlessOption[]) : this.options
  }

  /** The options a filter has left showing. */
  private get shown(): Entry[] {
    return this.entries.filter((option) => !option.hidden)
  }

  /**
   * The chosen values, as an array whether or not `multiple` is set.
   *
   * Read against the options' values, so an option whose value holds a comma
   * is one value. See `chosenValues`.
   */
  get values(): string[] {
    return chosenValues(
      this.value,
      new Set(this.entries.map((option) => option.value)),
      this.multiple,
    )
  }

  /**
   * Applies a choice, announcing first so a listener can refuse it.
   *
   * With `multiple` a choice is a toggle, because the same press has to be able
   * to take an answer back; without it a choice replaces whatever was there.
   */
  private choose(value: string): void {
    const chosen = this.values
    if (!chosen.includes(value)) {
      this.anchor = value
    }
    const next = this.multiple
      ? chosen.includes(value)
        ? chosen.filter((each) => each !== value)
        : [...chosen, value]
      : [value]
    const joined = next.join(',')
    if (joined === this.value) {
      this.chosenAgain?.()
      return
    }
    /* Through the mixin rather than hand-rolled: writing `value` is how a
       consumer says it is theirs, so a listbox writing its own would take
       ownership away from them on every change. */
    this.requestValue(joined)
  }

  /* **And only if the option's own choice stood.** `helix-before-select` is cancelable
     and `Option` documents it as refusable; this element is the only thing that
     acts on it, so a refusal nothing read was a veto that did nothing. The
     event is still stopped either way, the list being the single voice for the
     set, and a consumer on this element refuses with `helix-before-change`,
     which `choose` dispatches through the mixin. */
  private readonly handleSelection = (event: HelixBeforeSelectEvent): void => {
    /* A link is followed, not chosen: its event goes on to the page, which may
       cancel it and route there itself, and the selection stays as it was. */
    if (event.detail.href !== undefined) {
      return
    }
    event.stopPropagation()
    if (event.defaultPrevented) {
      return
    }
    const { value } = event.detail
    this.steered = true
    this.activeValue = value
    if (this.multiple && this.shifted) {
      this.extend(value)
    } else {
      this.choose(value)
    }
    this.shifted = false
  }

  /**
   * Adds every option a reader can reach from the one last chosen to `to`,
   * APG's Shift with Space and React Aria's Shift with a press. With none
   * chosen yet, it adds `to` alone and the next range starts there.
   */
  private extend(to: string): void {
    const reach = this.shown.filter((option) => !option.disabled).map((option) => option.value)
    const from = reach.indexOf(this.anchor)
    if (from < 0 && reach.includes(to)) {
      this.anchor = to
    }
    const taken = rangeAdd(this.values, reach, from, reach.indexOf(to))
    if (taken) {
      this.requestValue(taken.join(','))
    }
  }

  /**
   * Moves the keyboard, and chooses with it only where that is the pattern.
   *
   * Space and Enter are how a multi-select list chooses, and they are also how
   * a single-select one confirms what the arrows already did, so they act
   * either way rather than being guarded on `multiple`.
   *
   * **A reader in a text field is typing.** That is a filter field of this
   * list's own, or a combobox's field that forwards its keys through
   * `navigate`. There a Space is a character, Home and End move the caret, and
   * a letter is a letter. Measured before this: a Space typed into a filter,
   * a combobox or a command palette chose the highlighted option and closed the
   * panel, so a query of two words could not be typed.
   */
  private readonly handleClick = (event: MouseEvent): void => {
    this.shifted = event.shiftKey
  }

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    const shown = this.shown.filter((option) => !option.disabled)
    if (shown.length === 0) {
      return
    }
    const typing = this.forwarded || event.composedPath()[0] === this.partNamed('search-field')
    if (this.multiple && event.key === ' ' && event.shiftKey && !typing) {
      event.preventDefault()
      this.extend(this.activeValue)
      return
    }
    if (event.key === 'Enter' || (event.key === ' ' && !typing && !this.typeahead.typing())) {
      /* Only where there is something to choose, so an Enter over a list with
         no highlight is left to the page, which may submit a form with it. */
      const link = shown.find((option) => option.value === this.activeValue && Boolean(option.href))
      if (link !== undefined) {
        /* Enter follows a link, as Enter on an anchor does, and Space does
           nothing to one, as Space on an anchor does nothing. */
        event.preventDefault()
        if (event.key === 'Enter') {
          ;(link as HelixHeadlessOption).select(event)
        }
      } else if (this.activeValue !== '') {
        event.preventDefault()
        this.choose(this.activeValue)
      } else if (event.key === ' ') {
        /* Space with nothing highlighted chooses where the reader is: the
           chosen option, or the first one a reader can reach, which is where
           APG's listbox puts focus as it arrives. Measured before this: the
           first Space in a range Time Picker chose nothing. */
        event.preventDefault()
        const at = this.currentValue || shown.find((option) => !option.disabled)?.value
        if (at) {
          this.activeValue = at
          this.choose(at)
        }
      }
      return
    }
    /* Control+A, or Command+A, chooses every option a reader can reach, and
       takes them all back where all are chosen already, which is APG's
       multiple-selection listbox. Not in a field, where it selects the text. */
    if (this.multiple && !typing && selectsAll(event)) {
      event.preventDefault()
      this.requestValue(
        toggleEvery(
          this.values,
          shown.map((option) => option.value),
        ).join(','),
      )
      return
    }
    if (!typing && typesCharacter(event)) {
      event.preventDefault()
      const value = this.typeaheadTo(event.key)
      if (value !== undefined) {
        this.arrive(value)
      }
      return
    }
    /* In a filterable list the field keeps Home and End, with Shift or
       without, for its caret and its text. Control with Shift and either is
       the list's: in a one-line field it selects what Shift alone does, so the
       field loses nothing, and the range APG's multiple-selection listbox
       takes from those keys is reachable from the field too. */
    const fieldRange =
      typing &&
      this.multiple &&
      event.shiftKey &&
      (event.ctrlKey || event.metaKey) &&
      (event.key === 'Home' || event.key === 'End')
    const grid = this.layout === 'grid' && !this.data.records
    const along = grid && !typing ? inlineStep(this, event.key) : 0
    const fieldMoves = this.fieldHomeEnd && !event.shiftKey ? MOVES : FIELD_MOVES
    if (!fieldRange && !along && !(typing ? fieldMoves : MOVES).has(event.key)) {
      return
    }
    event.preventDefault()
    this.typeahead.reset()

    const from = this.currentValue
    const at = shown.findIndex((option) => option.value === from)
    const last = shown.length - 1
    let next = at
    if (along) {
      next = Math.min(Math.max(at + along, 0), last)
    } else if (grid && at >= 0 && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      next = columnStep(
        shown.map((option) => (option as HelixHeadlessOption).getBoundingClientRect().left),
        at,
        event.key === 'ArrowDown' ? 1 : -1,
      )
    } else if (event.key === 'ArrowDown') {
      next = at < 0 ? 0 : (at + 1) % shown.length
    } else if (event.key === 'ArrowUp') {
      next = at < 0 ? last : (at - 1 + shown.length) % shown.length
    } else if (event.key === 'Home') {
      next = 0
    } else if (event.key === 'End') {
      next = last
    } else if (event.key === 'PageDown') {
      next = at < 0 ? 0 : Math.min(at + this.pageSize(), last)
    } else {
      next = at < 0 ? last : Math.max(at - this.pageSize(), 0)
    }

    const target = shown[next]
    if (target) {
      this.arrive(target.value)
      /* Shift with Home or End, with or without Control, takes in every option
         from the highlight to that end, which is APG's multiple-selection
         listbox. */
      const ranged = event.key === 'Home' || event.key === 'End'
      if (this.multiple && (!typing || fieldRange) && event.shiftKey && ranged) {
        const taken = rangeAdd(
          this.values,
          shown.map((option) => option.value),
          at,
          next,
        )
        if (taken) {
          this.requestValue(taken.join(','))
        }
        return
      }
      /* Shift with an arrow adds the option arrived at, which is how APG's
         multiple-selection listbox extends a selection from the keyboard. */
      if (this.multiple && !typing && event.shiftKey && !this.values.includes(target.value)) {
        this.choose(target.value)
      }
    }
  }

  /**
   * Puts the highlight on an option, and chooses it where moving is choosing.
   *
   * Chosen on the way past only where moving is choosing. With `multiple` a
   * reader passing over four options on the way to the fifth did not mean to
   * pick all five, and with `manual` the owner has asked for the same.
   *
   * Nor where the keys were forwarded. A list with the focus on it selects as
   * it moves, which is the pattern for a listbox; a combobox's arrows move the
   * highlight and Enter takes it, which is the pattern for a combobox, and the
   * two differ by exactly which element the reader is in. Measured before
   * this: the first Down in a combobox committed the second option and shut the
   * panel, one keystroke into the interaction.
   */
  private arrive(value: string): void {
    this.parked = false
    this.steered = true
    this.activeValue = value
    /* Nor a link, which is followed by Enter or a press and never on the way
       past: moving onto a link must not leave the page. */
    const link = this.entries.some((option) => option.value === value && Boolean(option.href))
    if (!this.multiple && !this.manual && !this.forwarded && !link) {
      this.choose(value)
    }
  }

  /**
   * How many rows PageUp and PageDown move: as many as the list shows at once.
   *
   * Measured off the rendered list and its first shown row. Where there is no
   * layout to measure, as on a server or in a test double, it is ten.
   */
  private pageSize(): number {
    const items = this.partNamed('items')
    const row = this.elements.find((option) => !option.hidden)?.getBoundingClientRect().height ?? 0
    const height = items?.clientHeight ?? 0
    return row > 0 && height > 0 ? pageRows(height, row) : PAGE
  }

  /**
   * Runs the list's own key handling for a caller whose focus is elsewhere.
   *
   * A combobox keeps focus in its text field, because that is the whole of what
   * a combobox is, and still has to move this list with the arrows. Without
   * this it would reimplement the moving, the wrapping, the skipping of
   * disabled options and the seeding from the current value.
   *
   * Public and taking the event rather than a direction, so a caller forwards
   * what it received and this decides what the key means. `preventDefault` is
   * called in here on the keys it acts on, so a caller can hand over every
   * keydown and let the list ignore the ones that are not its business.
   *
   * The entry point is also what says whether moving chooses, which is why the
   * flag is set here rather than exposed as a property. The difference between
   * a listbox and a combobox is not a mode a consumer picks: it is which
   * element the reader's focus is in, and that is exactly what calling this
   * rather than being typed into means. Enter still chooses, because that is
   * the caller asking for the answer rather than for a move. Space, Home, End
   * and letters are left to the caller's field, where they are typing.
   */
  navigate(event: KeyboardEvent): void {
    this.forwarded = true
    try {
      this.handleKeydown(event)
    } finally {
      this.forwarded = false
    }
  }

  /**
   * Scrolls the chosen option to the middle of the list, or the highlighted one
   * where nothing is chosen.
   *
   * A method rather than something this does on its own, because a listbox
   * opening on its answer usually wants it merely *visible* and the browser
   * already manages that: centering is what a caller wants when the list is being
   * read as a dial rather than scanned as a list, which is what Time Picker's
   * wheels do with three of these.
   *
   * Measured by core's `centerInView`, or, for a list of `items`, by the
   * arithmetic, since the chosen option may not be drawn.
   */
  reveal(): void {
    if (this.data.records) {
      this.data.center(this.values[0] ?? '')
      return
    }
    const items = this.partNamed('items')
    /* The highlight where nothing is chosen, which `highlightValue` put on the
       time nearest one between two steps. */
    const chosen =
      this.options.find((option) => option.selected && !option.hidden) ??
      this.options.find((option) => option.value === this.activeValue && !option.hidden)
    if (items && chosen) {
      centerInView(items, chosen)
    }
  }

  /**
   * Puts the highlight on the option holding `value`, without choosing it, so
   * the arrow keys move from there. Nothing changes where no option a reader
   * can reach holds `value`.
   *
   * Time Picker calls it for a time between two of its steps, which no option
   * holds: without it the first arrow moved from the top of the list, so Down
   * from 14:07 went to midnight.
   */
  highlightValue(value: string): void {
    if (!this.shown.some((option) => !option.disabled && option.value === value)) {
      return
    }
    this.typeahead.reset()
    this.parked = false
    this.steered = true
    this.activeValue = value
    if (this.childrenKnown) {
      this.place()
    }
  }

  /** Hides what the filter excludes, and writes the rest onto the options. */
  private place(): void {
    this.forgetRemoved()
    const typed = this.filter.trim()
    const needle = typed.toLowerCase()
    const chosen = new Set(this.values)
    for (const option of this.entries) {
      option.hidden = !filterKeeps(option.text, typed, this.filterMatch)
      option.selected = chosen.has(option.value)
    }

    /* A group whose options the filter has all hidden goes with them. CSS
       cannot do this: a heading and its options are siblings under the group,
       so the rule would be `:host(:has(...))`, which is dropped at parse time.
       The listbox can, because it is the thing that did the hiding and already
       knows which. Left showing, the picture was a heading over nothing, which
       reads as a group whose contents failed to render. */
    for (const group of this.groups) {
      const inside = this.among<HelixHeadlessOption>(isOption, group.children)
      group.hidden = inside.length > 0 && inside.every((option) => option.hidden)
    }
    /* And a rule while anything is filtered: between two runs of which only
       some options are left, it separates nothing. Found by its name rather
       than its class, so a list that holds no rule does not carry the rule's
       code: either tier's tag ends the same way. */
    for (const rule of this.among<HTMLElement>(
      (node) => node.localName.endsWith('-option-separator'),
      this.children,
    )) {
      rule.hidden = needle !== ''
    }

    /* The keyboard cannot sit on something the filter has hidden, so it moves
       to the first thing still showing rather than nowhere: a list whose active
       option has just been filtered away is a list the next arrow press would
       start from the top of anyway.

       But only where there is a filter to have hidden it, or a highlight worth
       rescuing. Clearing one must not *invent* a highlight out of nothing:
       measured, a combobox clears its filter as it closes, and that alone
       parked the highlight on the first option while the panel was shut, so
       the reader's first Down arrived at the second. */
    const shown = this.shown
    const first = shown.find((option) => !option.disabled)?.value ?? ''
    const rescue = !this.parked && (needle !== '' || this.activeValue !== '')
    /* **While a filter is typed, the highlight follows the first option it
       leaves**, until the reader moves it, so Enter takes the best result as
       cmdk and Raycast do. Asked on every count, so options a framework
       sorts or replaces a tick after the keystroke move it too. Before this
       it moved only off an option the filter hid: typing "usage" after "u"
       kept the highlight on an entry that was still showing, second. */
    if (needle !== '' && !this.parked && !this.steered) {
      this.activeValue = first
    } else if (rescue && !shown.some((option) => option.value === this.activeValue)) {
      this.activeValue = first
    }
    for (const option of this.entries) {
      option.active = option.value === this.activeValue
    }

    this.hasMatches = shown.length > 0
    this.counted = true
    this.watchSources(needle !== '')
  }

  /**
   * Counts the options again when an element that holds them gains or loses
   * a child, while `on`: the list itself, and each element a slot in it
   * brings in, such as a group of Command's commands.
   *
   * **A slot does not say when its elements' own children move**, so a
   * framework sorting the options inside a group, after the filter that
   * found them, left the highlight on the option that had been first.
   */
  private watchSources(on: boolean): void {
    if (typeof MutationObserver === 'undefined') {
      return
    }
    this.sources?.disconnect()
    if (!on) {
      return
    }
    this.sources ??= new MutationObserver(() => this.requestUpdate())
    const watching = { childList: true, subtree: true }
    this.sources.observe(this, watching)
    for (const slot of this.among<HTMLSlotElement>(
      (node) => node instanceof HTMLSlotElement,
      this.children,
    )) {
      for (const element of slot.assignedElements({ flatten: true })) {
        this.sources.observe(element, watching)
      }
    }
  }

  /**
   * Whether another Helix component renders this list and binds its value
   * down, as Select, Combobox, Command and Time Picker do. That component seeds
   * and corrects the value, so this list leaves both to it.
   *
   * By the tag rather than by `instanceof`, for the reason `optionsAmong`
   * gives: a second copy of the library on a page is a second class.
   */
  private get owned(): boolean {
    const root = this.getRootNode()
    return root instanceof ShadowRoot && root.host.localName.startsWith('helix-')
  }

  /**
   * Takes an option that has left the list out of the value.
   *
   * Only one that was here before: a value set ahead of its options, which a
   * list loading them from a server does, is kept until they arrive. Measured
   * before this: removing the chosen option left the list showing nothing
   * chosen while its form still submitted the removed value. A native
   * `<select>` drops it too, and sends no event for it.
   */
  private forgetRemoved(): void {
    /* Not inside another component, which owns the value and binds it down:
       Select drops a removed option from its own value, and a list that
       dropped it here as well would hold a value its owner never set, which a
       binding that has not changed would never put back. */
    if (this.owned) {
      return
    }
    const present = new Set(this.entries.map((option) => option.value))
    /* Read against the options that were there as well, so a removed option
       whose value holds a comma is still read as one value. */
    const held = chosenValues(this.value, new Set([...present, ...this.seen]), this.multiple)
    const gone = held.filter((value) => this.seen.has(value) && !present.has(value))
    this.seen = present
    if (gone.length > 0) {
      this.value = held.filter((value) => !gone.includes(value)).join(',')
    }
  }

  /** Scrolls the active option into view, which needs the rendered list to scroll. */
  private followActive(changed: PropertyValues): void {
    /* A list of `items` scrolls to the highlight when it or the filter moved,
       and once the window holds it, the drawn option is scrolled to as a child
       is. See `OptionWindowController.follow`. */
    if (
      this.data.records &&
      !this.data.follow(changed.has('activeValue') || changed.has('filter'))
    ) {
      return
    }
    const active = this.elements.find(
      (option) => !option.hidden && option.value === this.activeValue,
    )
    if (active) {
      const items = this.partNamed('items')
      scrollItemIntoView(active, { padding: 4, ...(items ? { scroller: items } : {}) })
    }
  }

  /** Reports the answer and the verdict on it. */
  private sync(): void {
    /* Several answers as several entries, the way a native `<select multiple>`
       sends them; see `reportValues`. One answer as the string it is, since
       a single option's value may hold a comma. */
    if (this.multiple) {
      reportValues(this.internals, this.name, this.values)
    } else {
      this.internals.setFormValue(this.value === '' ? null : this.value)
    }
    this.reportRequired(this.value === '', this.valueMissingMessage, 'items')
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('helix-before-select', this.handleSelection as EventListener)
    this.addEventListener('keydown', this.handleKeydown)
    this.addEventListener('click', this.handleClick, true)
    auditChildren(this, 'option', 'option', 'the list offers no choices')
    /* Watched again where a filtered list is moved, since leaving stopped
       its observer. */
    if (this.hasUpdated) {
      this.watchSources(this.filter.trim() !== '')
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('helix-before-select', this.handleSelection as EventListener)
    this.removeEventListener('keydown', this.handleKeydown)
    this.removeEventListener('click', this.handleClick, true)
    this.sources?.disconnect()
    /* Its marks go with it. The registry is the document's and outlives this
       element, so a list removed while filtered would leave ranges over text
       that is no longer on the page. */
    markMatches(this, [], '')
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    /* **The list is the listbox, and the host is only what holds it.** The
       role, the name and `aria-multiselectable` were the host's, and the host
       holds the label, the filter, the hint and the feedback, none of which a
       listbox may contain, while the element that took focus and held the
       active descendant had no role at all. They are `[part="items"]`'s now. */
    hostAria(this.internals, { role: '' })
    /* A value moved from outside, by a script or by the field a list sits
       under, takes the highlight with it. Left where it was, the first arrow
       moved from the option picked before, and in a list that chooses as it
       moves that chose a neighbor of the old answer. */
    if (
      changed.has('value') &&
      !this.multiple &&
      this.activeValue !== '' &&
      !this.values.includes(this.activeValue)
    ) {
      this.activeValue = ''
      this.typeahead.reset()
    }
    if (this.childrenKnown) {
      this.seedDeclared()
    }
    /* The options `items` draws are the Option family's, the page's import as
       the options it writes are: registering them here would register them in
       every Select, Combobox and Command, which each draw a list. */
    if (changed.has('items') && this.items) {
      auditChildren(this, 'option', 'option', 'the items draw no choices', true)
    }
    /* A keystroke hands the highlight back to the filter's first match. */
    if (changed.has('filter')) {
      this.steered = false
    }
    /* Before the render, so the empty state and the matches it draws are this
       update's rather than the last one's. Not on the server, whose element
       shim has no `children`, nor while hydrating what one sent. */
    if (this.childrenKnown) {
      this.place()
      this.tell(changed)
    }
    /* The two states a stylesheet reads off the host, so a list can draw its
       own empty look or dim while it loads. Read from the same answer the
       empty line is drawn from. */
    this.toggleState('empty', !this.showsOptions)
    this.toggleState('loading', this.loading)
    this.toggleState('error', this.failed)
    this.toggleState('no-results', this.noResults)
  }

  /**
   * Takes `<helix-option selected>` as the list's default value, as a native
   * `<select>` takes `<option selected>`.
   *
   * Only where the list declares no `default-value` of its own, which wins. A
   * form reset returns to it, which is what `Option.defaultSelected` says.
   * Read from the options once they are known, so a list served by a server
   * shows the choice from hydration on.
   */
  private seedDeclared(): void {
    if (this.owned || this.defaultValue !== '' || this.hasAttribute('default-value')) {
      return
    }
    const declared = this.options
      .filter((option) => option.defaultSelected)
      .map((option) => option.value)
    if (declared.length > 0) {
      this.defaultValue = this.multiple ? declared.join(',') : (declared.at(-1) ?? '')
    }
  }

  /**
   * Where the reader is, and failing that where the answer is.
   *
   * `activeValue` starts empty, so the first arrow press in a list that already
   * has a chosen option started from nowhere: Down went to the first option,
   * which is a move backwards from anything below it, and Up went to the last.
   * Seeding from the value means the first press moves from what the reader can
   * see is selected.
   *
   * Read by `linkActive` as well as by the keys, so the option announced and
   * the option the arrows move from cannot disagree: asking for `activeValue`
   * alone points `aria-activedescendant` at nothing until a key has moved it.
   *
   * **Read once before a pass over the options, and never inside it.** It
   * reads `values`, which walks every option. `highlight` read `values` per
   * option and `linkActive` read this per option, and a Select of ten thousand
   * `items` took three seconds to open (measured October 8, 2026).
   */
  private get currentValue(): string {
    return this.activeValue || (this.values[0] ?? '')
  }

  /*
   * Points the focused list at the option the keyboard is on.
   *
   * **An element reference and not an id, because an IDREF cannot do this.**
   * The options are the consumer's light DOM and the element that takes focus
   * is in this shadow root, so `aria-activedescendant="whatever"` resolves
   * against the shadow tree, finds nothing, and is dropped in silence. Element
   * references resolve outward: a shadow-tree element may point at a light-DOM
   * one, which is the direction this needs.
   *
   * Feature-tested rather than assumed, for the reason `hostAria` gives:
   * assigning to a property an engine does not implement is a no-op rather than
   * an error. Where it is missing the list still works and still announces its
   * selection; what is lost is the running commentary as the keys move.
   */
  private linkActive(): void {
    /* Whichever element the reader is actually in. `aria-activedescendant` is
       read from the focused element, so pointing the list at the active option
       says nothing while focus is in the filter, which is where it now stays.
       A filterable list announces from its field and a plain one from its
       items, for the same reason the arrows are forwarded in one and not the
       other. */
    const list = this.renderRoot.querySelector(
      this.filterable ? '[part="search-field"]' : '[part="items"]',
    )
    if (!list || !('ariaActiveDescendantElement' in list)) {
      return
    }
    const current = this.currentValue
    const active = this.elements.find((option) => option.value === current)
    ;(
      list as Element & { ariaActiveDescendantElement: Element | null }
    ).ariaActiveDescendantElement = active ?? null
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.followActive(changed)
    this.sync()
    this.linkActive()
    /* And the marks, from the same needle that did the hiding, on the options
       it left showing: the two answers have to come from one place or a list
       can show a match it does not mark. See core's `markMatches`. */
    markMatches(
      this,
      this.elements.filter((option) => !option.hidden),
      this.filter.trim(),
    )
  }

  /**
   * Narrows the list as the reader types, announcing it first.
   *
   * `helix-before-filter` and not `helix-change`, because nothing about the value
   * changes: the options are hidden rather than removed, and telling a consumer
   * their answer moved when it did not is worse than telling them nothing.
   */
  private readonly handleFilter = (event: Event): void => {
    // Stopped for the reason `Input.handleInput` gives: the inner control's own
    // `input` is composed and would reach a consumer beside this element's.
    event.stopPropagation()
    const control = event.target as HTMLInputElement
    this.filtering.cancel()
    if (this.filterDelay > 0) {
      this.filtering.start(this.filterDelay, () => this.takeFilter(control))
      return
    }
    this.takeFilter(control)
  }

  /** The filter waiting out `filterDelay`, if any. */
  private readonly filtering = new DelayController(this, { renders: false })

  /** Filters on what the field holds, and puts the field back where that was refused. */
  private takeFilter(control: HTMLInputElement): void {
    this.filtering.cancel()
    this.requestFilter(control.value)
    if (control.value !== this.filter) {
      control.value = this.filter
    }
  }

  /** Filters at once on a filter still waiting out `filterDelay`. */
  private flushFilter(): void {
    this.filtering.flush()
  }

  /** The number of options the list last asked for more at. */
  private askedAt = -1

  /**
   * Asks for more once the reader is within a screen of the end, React Aria's
   * `onLoadMore`, by core's `endInSight`, the rule Virtual List asks too: once
   * for each number of options, so a scroll that goes on asks again only after
   * the next page arrived, and never while loading.
   */
  private readonly handleScroll = (event: Event): void => {
    const items = event.currentTarget as HTMLElement
    const count = this.entries.length
    if (
      this.loading ||
      !endInSight({
        askedAt: this.askedAt,
        count,
        remaining: items.scrollHeight - items.scrollTop - items.clientHeight,
        screen: items.clientHeight,
      })
    ) {
      return
    }
    this.askedAt = count
    this.dispatchEvent(new HelixLoadMoreEvent())
  }

  /** Requests a new filter, and returns whether the request went through. */
  requestFilter(next: string): boolean {
    if (next === this.filter) {
      return true
    }
    return requestChange({
      apply: (value) => {
        const previous = this.filter
        this.filterState = value
        this.parked = false
        this.requestUpdate('filter', previous)
        this.dispatchEvent(new HelixFilterEvent({ value }))
      },
      event: (value) => new HelixBeforeFilterEvent({ value }),
      host: this,
      next,
    })
  }

  /**
   * Sends the keys that belong to the list to the list.
   *
   * A reader filtering is still choosing: they type two letters and press Down
   * to reach what is left, and the field would otherwise swallow it because the
   * arrows move a caret. Typing keys stay with the field, which is what makes
   * this different from forwarding everything.
   *
   * Escape clears rather than closing. What frames the list may close on Escape
   * too, so this stops the event when there is something to clear: one press
   * empties the filter, a second reaches whatever is above and closes it. A
   * filter that closed the panel would lose the reader's place for a keystroke
   * they meant as an undo.
   */
  private readonly handleFilterKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Enter' || FIELD_MOVES.has(event.key)) {
      this.flushFilter()
    }
    if (event.key === 'Escape' && (this.filter !== '' || this.filtering.pending)) {
      /* Stopped and prevented whether or not the clearing stands. The reader
         pressed Escape at a filtered list, so the key was for this list either
         way, and letting it through to close the surface around it would be a
         second thing happening from one press. Text still waiting out
         `filterDelay` is a filter too, and goes with it. */
      event.stopPropagation()
      event.preventDefault()
      this.filtering.cancel()
      this.requestFilter('')
      const control = this.partNamed<HTMLInputElement>('search-field')
      if (control && control.value !== this.filter) {
        control.value = this.filter
      }
      return
    }
    if (!FIELD_MOVES.has(event.key)) {
      return
    }
    /* **Forwarded, because the reader is in the field.** `navigate` says the
       rule this has to follow: a listbox and a combobox differ by which element
       the focus is in, not by a mode, and a reader typing into a filter is in
       the second case whether or not the field belongs to this element. So the
       arrows move the highlight and Enter takes it, which is what Enter already
       does by bubbling to the host handler.

       **Never move focus to `[part="items"]` and re-dispatch the key instead.**
       Both halves fail: focus on the list means moving chooses, so a single
       press commits a value the reader was arrowing past, and the original
       press goes on bubbling to the same host handler the re-dispatch already
       reached. Measured on a bare `<helix-headless-listbox filterable>`, one Down
       produced two `helix-change` events and a highlight two rows down.

       `stopPropagation` is what closes the second half: the field handled the
       key, so it must not arrive at the host as well. The move keys are the
       only ones taken, so Enter, Tab and every character still pass, and the
       host handler leaves the characters to the field. */
    event.stopPropagation()
    this.navigate(event)
  }

  /**
   * Focusing the host focuses the list inside it.
   *
   * The focusable node is `[part="items"]`, a div in this shadow root, and a
   * caller outside has no way to reach it: `select` opened its panel and called
   * `.focus()` on this element, which is not focusable, so focus stayed on the
   * trigger and the arrow keys never reached the options at all. Delegation is
   * the platform answering that, and it keeps `document.activeElement` on the
   * host, which is what a caller reasons about.
   */
  static override shadowRootOptions: ShadowRootInit = {
    ...HelixFormElement.shadowRootOptions,
    delegatesFocus: true,
  }

  /**
   * The mark in the filter's field, behind a seam.
   *
   * Slot fallback, so a consumer replaces it by slotting; and a method, so the
   * tier above replaces it by overriding. Those answer different people: the
   * slot is for the page and the method is for whoever is building the styled
   * layer, and a fallback with only the first is one a tier can restyle and
   * cannot change.
   */
  protected renderFilterIcon(): TemplateResult {
    return html`<slot name="filter-icon">
      <svg part="filter-mark" fill="currentColor" viewBox=${magnifyingGlass.viewBox}>
        ${unsafeSVG(magnifyingGlass.content)}
      </svg>
    </slot>`
  }

  /**
   * Whether there is anything to show.
   *
   * Showing nothing is not the same as empty. A filter that hides every option
   * is empty, and one with no filter and no options is empty too, but a list
   * still waiting on its options is neither.
   */
  private get showsOptions(): boolean {
    return this.counted && !this.loading
      ? this.filter === ''
        ? this.entries.length > 0
        : this.hasMatches
      : true
  }

  /**
   * The empty or loading line, with a slot for each so either can be richer
   * than its text.
   *
   * **The text is the slot's fallback**, which is this library's rule for a
   * content property, so `empty-text` still shows where nothing is slotted and
   * the live region still says it.
   */
  protected override renderStatus(hasContent: boolean): TemplateResult | typeof nothing {
    if (this.failed) {
      return html`<p part="error"><slot name="error">${this.loadError}</slot></p>`
    }
    if (!this.loading && hasContent) {
      return nothing
    }
    if (this.loading) {
      return html`<p part="loading"><slot name="loading">${this.loadingText}</slot></p>`
    }
    /* The line a list that sets neither `no-results-text` nor the slot has
       always drawn, and the same line holding the `no-results` slot where it
       does, with the text as the slot's fallback. The part stays `empty`, so
       every rule written for that line holds; `:state(no-results)` tells the
       two apart. */
    const given =
      this.noResultsText !== undefined ||
      this.querySelector?.(':scope > [slot="no-results"]') != null
    return this.noResults && given
      ? html`<p part="empty"><slot name="no-results">${this.noResultsText ?? this.emptyText}</slot></p>`
      : html`<p part="empty"><slot name="empty">${this.emptyText}</slot></p>`
  }

  /**
   * Whether a filter hid every option of a list that has some, which is a
   * different thing to say from a list that has none.
   */
  private get noResults(): boolean {
    return (
      this.counted &&
      !this.loading &&
      this.filter !== '' &&
      this.entries.length > 0 &&
      !this.hasMatches
    )
  }

  /** Whether `load-error` holds words, which a removed attribute does not. */
  private get failed(): boolean {
    return Boolean(this.loadError)
  }

  /** The error, or what a filter that hid everything says, before the shared words. */
  protected override renderLive(hasContent: boolean): TemplateResult {
    const words = this.loadError || (this.noResults ? this.noResultsText : undefined)
    return words === undefined
      ? super.renderLive(hasContent)
      : html`<span part="live" role="status">${words}</span>`
  }

  /* The list's `tabindex` takes `isDisabled`, matching the filter input
     above it: on `disabled` alone, a listbox in a disabled fieldset keeps its
     tab stop and takes arrow keys while its own filter is correctly out.

     No tab stop at all with a filter, whose field is the one stop: the field
     announces the highlight and forwards the arrows. A second stop on the
     list was one where the arrows chose as they moved, so in a command palette
     a Tab and an arrow ran a command. */
  protected override voiceField(): HTMLInputElement | null {
    return this.filterable ? this.partNamed<HTMLInputElement>('search-field') : null
  }

  protected override render(): TemplateResult {
    const shown = this.showsOptions
    /* One tab stop for the whole list, which is what a listbox is in the tab
       order: the arrows move within it. `tabindex` on the wrapper rather than
       the host so the host stays as the consumer wrote it. */
    return html`${this.renderGroupLabel()}
      ${
        this.filterable
          ? html`<div part="search">
              <span part="filter-icon" aria-hidden="true">
                ${this.renderFilterIcon()}
              </span>
              <input
                part="search-field"
                type="text"
                autocomplete="off"
                spellcheck="false"
                .value=${this.filter}
                placeholder=${this.filterLabel}
                aria-label=${this.filterLabel}
                aria-autocomplete="list"
                aria-controls="items"
                ?disabled=${this.isDisabled}
                @input=${this.handleFilter}
                @keydown=${this.handleFilterKeydown}
              />${this.renderVoice()}
            </div>`
          : ''
      }
      <div
        part="items"
        id="items"
        role="listbox"
        aria-busy=${this.loading ? 'true' : nothing}
        aria-describedby=${this.describedBy ?? nothing}
        aria-invalid=${this.invalidity ?? nothing}
        aria-labelledby=${this.labeled ? this.labelId : nothing}
        aria-multiselectable=${this.multiple ? 'true' : nothing}
        aria-required=${this.required ? 'true' : nothing}
        tabindex=${this.filterable ? nothing : this.isDisabled ? -1 : 0}
        @scroll=${this.handleScroll}
      >
        ${
          /* A list of `items` draws a window of them, and otherwise the
             children. */
          this.data.render() ?? html`<slot @slotchange=${() => this.requestUpdate()}></slot>`
        }
        ${
          /* Loading and empty come from the shared mixin; what is local is what
             counts as content. A list with a filter that matched nothing is
             empty, and one with no filter and no options is empty too, but a
             list still waiting on its options is neither. */
          this.renderStatus(shown)
        }
      </div>
      ${this.renderLive(shown)}${this.renderHint()}${this.renderFeedback()}${
        /* The options as far as they are known: none on a server or while
           hydrating, as Select's hidden select holds them. */
        this.autocomplete === 'off'
          ? nothing
          : drawAutofill({
              autocomplete: this.autocomplete,
              disabled: this.isDisabled,
              multiple: this.multiple,
              onFill: (value) => this.requestValue(value),
              options: this.childrenKnown ? this.entries : [],
              value: this.value,
            })
      }`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-listbox': HelixHeadlessListbox
  }
}
