import {
  AriaForwardController,
  countLabel,
  customElement,
  DelayController,
  DisabledCascadeController,
  endInSight,
  HelixFilterEvent,
  HelixFormElement,
  HelixLoadMoreEvent,
  type HelixSelectEvent,
  hostAria,
  MixinCollection,
  MixinControllerValue,
  MixinField,
  rangeAdd,
  reportValues,
  requestChange,
  scrollItemIntoView,
  Typeahead,
  typesCharacter,
} from '@fusion.dev/helix-core'
import { magnifyingGlass } from '@fusion.dev/helix-icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'
import { HelixHeadlessOptionGroup } from '../../option/group/option-group.js'
import { HelixHeadlessOption } from '../../option/root/option-root.js'
import { HelixHeadlessOptionSeparator } from '../../option/separator/option-separator.js'

/** The keys that move within a list, which is every key that moves at all. */
const MOVES = new Set(['ArrowDown', 'ArrowUp', 'End', 'Home', 'PageDown', 'PageUp'])

/**
 * The keys that move the list from a text field the reader is typing in.
 *
 * Home and End are left out. In a text field they move the caret, which is
 * what a reader editing a word expects, and APG lists them among the field's
 * own editing keys for a combobox.
 */
const FIELD_MOVES = new Set(['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp'])

/** How many rows a page key moves where the list has no height to measure. */
const PAGE = 10

/**
 * The ranges each filtering list has matched, so the union can be rebuilt when
 * any one of them changes.
 *
 * `CSS.highlights` is one registry for the whole document, keyed by name, so a
 * second list writing under the same name would erase the first one's marks.
 * Keyed by element and rebuilt from every entry, two filtered lists on a page
 * both stay marked. A `Map` rather than a `WeakMap` because the union has to be
 * walked and a `WeakMap` cannot be, which is why a list takes itself out on
 * disconnect.
 */
const matched = new Map<Element, Range[]>()

/** What the marks are called in `CSS.highlights`, and in `preview.css`. */
const HIGHLIGHT = 'helix-filter-match'

/*
 * Marks what the filter matched, without touching what it matched it in.
 *
 * The words are the consumer's own light DOM, slotted through as many as two
 * shadow roots, and wrapping the matched part in a `<mark>` would mean this
 * element rewriting their content: markup they wrote would come back changed.
 * The Custom Highlight API paints a range instead. Nothing is inserted and
 * nothing is removed, so an option holding a link or an icon is marked as
 * readily as one holding a bare word.
 *
 * The rule that paints it lives in `preview.css` rather than in a component's
 * styles, which is not a choice either: a highlight is styled from the tree its
 * text lives in, and that text lives in the consumer's document.
 */
/**
 * Whether this environment can paint a highlight at all.
 *
 * Asked before the ranges are built rather than after: a server, a test
 * environment and an older browser all take that path, and walking every shown
 * option's text nodes for an API that is not there is work with no output.
 */
const paintable = (): boolean =>
  typeof CSS !== 'undefined' && 'highlights' in CSS && typeof Highlight !== 'undefined'

const paintMatches = (): void => {
  if (!paintable()) {
    return
  }
  const all = [...matched.values()].flat()
  if (all.length === 0) {
    CSS.highlights.delete(HIGHLIGHT)
    return
  }
  CSS.highlights.set(HIGHLIGHT, new Highlight(...all))
}

/**
 * Where a needle sits inside an element, as a range over its text nodes.
 *
 * Walked rather than measured off `textContent`, because the words may be split
 * across several nodes and wrapped in elements of the consumer's, and a match
 * can begin in one node and end in another. The offsets are mapped back onto
 * the nodes they came from, so the range covers the real text either way.
 */
const rangeFor = (root: Element, needle: string): Range[] => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  let whole = ''
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    nodes.push(node as Text)
    whole += node.nodeValue ?? ''
  }
  const at = whole.toLowerCase().indexOf(needle)
  if (at < 0) {
    return []
  }
  const range = document.createRange()
  let seen = 0
  let started = false
  for (const node of nodes) {
    const length = node.nodeValue?.length ?? 0
    if (!started && at < seen + length) {
      range.setStart(node, at - seen)
      started = true
    }
    if (started && at + needle.length <= seen + length) {
      range.setEnd(node, at + needle.length - seen)
      return [range]
    }
    seen += length
  }
  return []
}

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
 * it, so your server does not split on commas.
 *
 * Selected and active are separate. The selected option is the value. The
 * active option is where the keyboard is: the arrow keys move it, and
 * `aria-activedescendant` points to it while focus stays on the list.
 *
 * The arrow keys, Home, End, PageUp and PageDown move the highlight, and typed
 * letters move it to the next option whose words start with them. In a
 * single-choice list the highlight is the choice unless `manual` is set; then
 * Enter, Space or a click chooses. With `multiple`, Space toggles the
 * highlighted option, Shift with an arrow adds the option it moves to, Shift
 * with Home or End adds every option from the highlight to that end, and
 * Control+A or Command+A chooses every option, or none where all are chosen.
 * In a filter field, Space, Home, End and letters edit the text, and with
 * `multiple`, Control with Shift and Home or End adds every option from the
 * highlight to that end.
 *
 * An option with `href` is a link: Enter or a press follows it and selects
 * nothing, and moving onto it with the arrows does not follow it.
 *
 * As a filter narrows the list, a screen reader hears how many options are
 * left, such as "3 results", from `result-label` and `results-label`. A filter
 * that leaves none says `empty-text`.
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
 * @event {HelixFilterEvent} helix-filter - Fired before the list is filtered, and cancelable.
 * @event {HelixLoadMoreEvent} helix-load-more - Fired once the list is scrolled within a screen of its end, once for each number of options, and not while `loading` is set. Add the next page of options and set `loading` while you fetch it.
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
 * @csspart live - A copy of the empty and loading text, and how many options a filter left, in a region that screen readers announce when it changes. Visually hidden in the styled tier.
 * @csspart loading - The text shown while the options load.
 * @csspart search - The region that holds the filter field.
 * @csspart search-field - The filter field.
 *
 * @cssstate empty - The list has no options to show: none were given, or the filter hid every one.
 * @cssstate error - While `load-error` is set.
 * @cssstate invalid - The control has an error to show, from the browser's validation or from your `feedback`.
 * @cssstate loading - While `loading` is set.
 * @cssstate no-results - A filter hid every option of a list that has some.
 */
@customElement('helix-headless-listbox')
export class HelixHeadlessListbox extends MixinCollection(
  MixinControllerValue(MixinField(HelixFormElement)),
) {
  /* A consumer's `aria-describedby` names ids in their own tree and the control
     is in this shadow root, so the reference has to be carried down as an
     element rather than copied as an id. See `AriaForwardController`: measured
     in Chrome's own tree, the host held the description and the control the
     reader is actually on was exposed without it. */
  protected readonly aria = new AriaForwardController(this, {
    target: () => this.partNamed('items'),
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
  @property({ attribute: 'empty-text' })
  override emptyText = 'No matches'

  /** What the list is narrowed to, whoever set it. */
  private filterState: string | undefined = undefined

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
   * milliseconds. `0` filters on every keystroke.
   *
   * For a list filtered on a server, where `helix-filter` starts a request: a
   * reader typing a word sends one request for the word, not one for each
   * letter. Enter and the arrow keys filter at once on what is typed, so they
   * act on the list the reader expects.
   */
  @property({ attribute: 'filter-delay', type: Number })
  filterDelay = 0

  /**
   * Placeholder text for the filter field.
   */
  @property({ attribute: 'filter-label' })
  filterLabel = 'Filter'

  /**
   * What the list says when its options could not be loaded, such as after a
   * request to a server fails. Empty is no error.
   *
   * Set, it shows under any options there are, in place of `empty-text` and
   * `loading-text`, and a screen reader hears it. Clear it when you ask again.
   */
  @property({ attribute: 'load-error' })
  loadError = ''

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
   * What a screen reader hears when a filter leaves one option. `{count}` is
   * the count.
   */
  @property({ attribute: 'result-label' })
  resultLabel = '{count} result'

  /**
   * What a screen reader hears when a filter leaves any other number of
   * options. `{count}` is the count.
   *
   * **Two sentences, chosen by `Intl.PluralRules`**, which is Data Table's
   * pair: a language with more forms than two picks the one for its `one` and
   * writes the rest here.
   */
  @property({ attribute: 'results-label' })
  resultsLabel = '{count} results'

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
   */
  @state()
  private hasMatches = true

  /**
   * Whether the options have been looked at yet.
   *
   * Emptiness is a fact about light DOM children, and the server has none to
   * count: without this the list shipped "Nothing to show" over markup that was
   * about to have options in it, which is the one thing an empty state must
   * never do. `place` does not run on the server, so this is false exactly
   * when the answer is unknown.
   */
  @state()
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
    return this.options.findIndex((option) => option.selected)
  }

  set selectedIndex(at: number) {
    const option = this.options[at]
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
    if (where === 'none') {
      this.activeValue = ''
    } else if (where === 'first') {
      this.activeValue = shown[0]?.value ?? ''
    } else if (where === 'last') {
      this.activeValue = shown.at(-1)?.value ?? ''
    } else {
      const chosen = shown.find((option) => this.values.includes(option.value))
      this.activeValue = (chosen ?? shown[0])?.value ?? ''
    }
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
   * which the region says in place of this.
   */
  private tell(changed: PropertyValues): void {
    if (!changed.has('filter') || !this.hasUpdated) {
      return
    }
    const count = this.shown.length
    if (this.filter.trim() === '' || count === 0) {
      this.announced = ''
      return
    }
    this.announced = countLabel(count, this.resultLabel, this.resultsLabel, this.lang)
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
    const from = shown.findIndex((option) => option.value === this.currentValue)
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
    return this.collect(this.children)
  }

  /**
   * Walks the tree, and walks *through* a slot when it meets one.
   *
   * Through a slot because that is how this gets composed. `Select` renders a
   * listbox in its own shadow root with a slot inside it, so the options are
   * the *select's* light DOM and the listbox's only child is the slot: a plain
   * `querySelectorAll` finds the slot and no options at all, and the whole
   * component comes up empty.
   */
  private collect(nodes: Iterable<Element>): HelixHeadlessOption[] {
    const found: HelixHeadlessOption[] = []
    for (const node of nodes) {
      if (node instanceof HelixHeadlessOption) {
        found.push(node)
      } else if (node instanceof HTMLSlotElement) {
        found.push(...this.collect(node.assignedElements({ flatten: true })))
      } else {
        found.push(...this.collect(node.children))
      }
    }
    return found
  }

  /** The groups, found the same way and for the same reason. */
  private get groups(): HelixHeadlessOptionGroup[] {
    return this.among(HelixHeadlessOptionGroup)
  }

  /** The elements of one kind in the list, looking through slots. */
  private among<T extends Element>(kind: abstract new (...args: never[]) => T): T[] {
    const found: T[] = []
    const walk = (nodes: Iterable<Element>): void => {
      for (const node of nodes) {
        if (node instanceof kind) {
          found.push(node)
        }
        if (node instanceof HTMLSlotElement) {
          walk(node.assignedElements({ flatten: true }))
        } else {
          walk(node.children)
        }
      }
    }
    walk(this.children)
    return found
  }

  /** The options a filter has left showing. */
  private get shown(): HelixHeadlessOption[] {
    return this.options.filter((option) => !option.hidden)
  }

  /** The chosen values, as an array whether or not `multiple` is set. */
  get values(): string[] {
    return this.value === '' ? [] : this.value.split(',')
  }

  /**
   * Applies a choice, announcing first so a listener can refuse it.
   *
   * With `multiple` a choice is a toggle, because the same press has to be able
   * to take an answer back; without it a choice replaces whatever was there.
   */
  private choose(value: string): void {
    const chosen = this.values
    const next = this.multiple
      ? chosen.includes(value)
        ? chosen.filter((each) => each !== value)
        : [...chosen, value]
      : [value]
    const joined = next.join(',')
    if (joined === this.value) {
      return
    }
    /* Through the mixin rather than hand-rolled: writing `value` is how a
       consumer says it is theirs, so a listbox writing its own would take
       ownership away from them on every change. */
    this.requestValue(joined)
  }

  /* **And only if the option's own choice stood.** `helix-select` is cancelable
     and `Option` documents it as refusable; this element is the only thing that
     acts on it, so a refusal nothing read was a veto that did nothing. The
     event is still stopped either way, the list being the single voice for the
     set, and a consumer on this element refuses with `helix-before-change`,
     which `choose` dispatches through the mixin. */
  private readonly handleSelection = (event: HelixSelectEvent): void => {
    /* A link is followed, not chosen: its event goes on to the page, which may
       cancel it and route there itself, and the selection stays as it was. */
    if (event.detail.href !== undefined) {
      return
    }
    event.stopPropagation()
    if (event.defaultPrevented) {
      return
    }
    this.activeValue = event.detail.value
    this.choose(event.detail.value)
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
  private readonly handleKeydown = (event: KeyboardEvent): void => {
    const shown = this.shown.filter((option) => !option.disabled)
    if (shown.length === 0) {
      return
    }
    const typing = this.forwarded || event.composedPath()[0] === this.partNamed('search-field')
    if (event.key === 'Enter' || (event.key === ' ' && !typing && !this.typeahead.typing())) {
      /* Only where there is something to choose, so an Enter over a list with
         no highlight is left to the page, which may submit a form with it. */
      const link = shown.find((option) => option.value === this.activeValue && Boolean(option.href))
      if (link !== undefined) {
        /* Enter follows a link, as Enter on an anchor does, and Space does
           nothing to one, as Space on an anchor does nothing. */
        event.preventDefault()
        if (event.key === 'Enter') {
          link.select(event)
        }
      } else if (this.activeValue !== '') {
        event.preventDefault()
        this.choose(this.activeValue)
      } else if (event.key === ' ') {
        event.preventDefault()
      }
      return
    }
    /* Control+A, or Command+A, chooses every option a reader can reach, and
       takes them all back where all are chosen already, which is APG's
       multiple-selection listbox. Not in a field, where it selects the text. */
    if (
      this.multiple &&
      !typing &&
      event.key.toLowerCase() === 'a' &&
      (event.ctrlKey || event.metaKey) &&
      !event.altKey
    ) {
      event.preventDefault()
      const reachable = shown.map((option) => option.value)
      const all = reachable.every((value) => this.values.includes(value))
      const kept = this.values.filter((value) => !reachable.includes(value))
      this.requestValue((all ? kept : [...kept, ...reachable]).join(','))
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
    if (!fieldRange && !(typing ? FIELD_MOVES : MOVES).has(event.key)) {
      return
    }
    event.preventDefault()
    this.typeahead.reset()

    const from = this.currentValue
    const at = shown.findIndex((option) => option.value === from)
    const last = shown.length - 1
    let next = at
    if (event.key === 'ArrowDown') {
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
    this.activeValue = value
    /* Nor a link, which is followed by Enter or a press and never on the way
       past: moving onto a link must not leave the page. */
    const link = this.options.some((option) => option.value === value && Boolean(option.href))
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
    const row = this.shown[0]?.getBoundingClientRect().height ?? 0
    const height = items?.clientHeight ?? 0
    return row > 0 && height > 0 ? Math.max(1, Math.floor(height / row) - 1) : PAGE
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
   * Scrolls the chosen option to the middle of the list.
   *
   * A method rather than something this does on its own, because a listbox
   * opening on its answer usually wants it merely *visible* and the browser
   * already manages that: centering is what a caller wants when the list is being
   * read as a dial rather than scanned as a list, which is what Time Picker's
   * wheels do with three of these.
   *
   * A delta from the two boxes rather than `offsetTop`. An option is a slotted
   * light DOM child, so its `offsetParent` is whatever is positioned above it,
   * which is not this list and is not guaranteed to be anything: measuring both
   * rects and moving by the difference needs no such assumption.
   */
  reveal(): void {
    const items = this.partNamed('items')
    const chosen = this.options.find((option) => option.selected && !option.hidden)
    if (!items || !chosen) {
      return
    }
    /* Twice, and the second pass is not superstition. The first delta is
       computed against whatever layout is current when this is called, and
       inside a panel that has just been revealed it is a frame behind: measured,
       one call landed a whole row short, 672 where 704 was wanted, and calling
       it again from a settled layout put it exactly on center. Reading a rect
       forces layout, so the second pass sees the result of the first and
       corrects the remainder. It stops as soon as there is nothing left to
       correct, so the usual case is one pass and a cheap check. */
    for (let pass = 0; pass < 2; pass += 1) {
      const box = items.getBoundingClientRect()
      const row = chosen.getBoundingClientRect()
      if (box.height === 0 || row.height === 0) {
        return
      }
      const off = row.top + row.height / 2 - (box.top + box.height / 2)
      if (Math.abs(off) < 1) {
        return
      }
      items.scrollTop += off
    }
  }

  /** Hides what the filter excludes, and writes the rest onto the options. */
  private place(): void {
    this.forgetRemoved()
    const needle = this.filter.trim().toLowerCase()
    const chosen = new Set(this.values)
    for (const option of this.options) {
      option.hidden = needle !== '' && !option.text.toLowerCase().includes(needle)
      option.selected = chosen.has(option.value)
    }

    /* A group whose options the filter has all hidden goes with them. CSS
       cannot do this: a heading and its options are siblings under the group,
       so the rule would be `:host(:has(...))`, which is dropped at parse time.
       The listbox can, because it is the thing that did the hiding and already
       knows which. Left showing, the picture was a heading over nothing, which
       reads as a group whose contents failed to render. */
    for (const group of this.groups) {
      const inside = this.collect(group.children)
      group.hidden = inside.length > 0 && inside.every((option) => option.hidden)
    }
    /* And a rule while anything is filtered: between two runs of which only
       some options are left, it separates nothing. */
    for (const rule of this.among(HelixHeadlessOptionSeparator)) {
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
    const rescue = !this.parked && (needle !== '' || this.activeValue !== '')
    if (rescue && !shown.some((option) => option.value === this.activeValue)) {
      this.activeValue = shown.find((option) => !option.disabled)?.value ?? ''
    }
    for (const option of this.options) {
      option.active = option.value === this.activeValue
    }

    /* And the marks, from the same needle that did the hiding: the two answers
       have to come from one place or a list can show a match it does not mark. */
    if (needle === '' || !paintable()) {
      matched.delete(this)
    } else {
      matched.set(
        this,
        shown.flatMap((option) => rangeFor(option, needle)),
      )
    }
    paintMatches()

    const anyShown = shown.length > 0
    if (anyShown !== this.hasMatches) {
      this.hasMatches = anyShown
    }
    this.counted = true
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
    const present = new Set(this.options.map((option) => option.value))
    const gone = this.values.filter((value) => this.seen.has(value) && !present.has(value))
    this.seen = present
    if (gone.length > 0) {
      this.value = this.values.filter((value) => !gone.includes(value)).join(',')
    }
  }

  /** Scrolls the active option into view, which needs the rendered list to scroll. */
  private followActive(): void {
    const active = this.shown.find((option) => option.value === this.activeValue)
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
      reportValues(this.internals, this.name, this.value === '' ? [] : this.value.split(','))
    } else {
      this.internals.setFormValue(this.value === '' ? null : this.value)
    }
    this.reportRequired(this.value === '', 'Choose one to continue.', 'items')
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('helix-select', this.handleSelection as EventListener)
    this.addEventListener('keydown', this.handleKeydown)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('helix-select', this.handleSelection as EventListener)
    this.removeEventListener('keydown', this.handleKeydown)
    /* Its marks go with it. The registry is the document's and outlives this
       element, so a list removed while filtered would leave ranges over text
       that is no longer on the page. */
    matched.delete(this)
    paintMatches()
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
    this.toggleState('error', this.loadError !== '')
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
   */
  private get currentValue(): string {
    return this.activeValue || (this.value.split(',')[0] ?? '')
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
    const active = this.options.find((option) => option.value === this.currentValue)
    ;(
      list as Element & { ariaActiveDescendantElement: Element | null }
    ).ariaActiveDescendantElement = active ?? null
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.followActive()
    this.sync()
    this.linkActive()
  }

  /**
   * Narrows the list as the reader types, announcing it first.
   *
   * `helix-filter` and not `helix-change`, because nothing about the value
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
    const count = this.options.length
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
      },
      event: (value) => new HelixFilterEvent({ value }),
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
        ? this.options.length > 0
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
    if (this.loadError !== '') {
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
      this.options.length > 0 &&
      !this.hasMatches
    )
  }

  /** The error, or what a filter that hid everything says, before the shared words. */
  protected override renderLive(hasContent: boolean): TemplateResult {
    if (this.loadError !== '') {
      return html`<span part="live" role="status">${this.loadError}</span>`
    }
    if (this.noResults && this.noResultsText !== undefined) {
      return html`<span part="live" role="status">${this.noResultsText}</span>`
    }
    return super.renderLive(hasContent)
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
                autocomplete=${this.autocomplete || nothing}
                spellcheck="false"
                .value=${this.filter}
                placeholder=${this.filterLabel}
                aria-label=${this.filterLabel}
                aria-autocomplete="list"
                aria-controls="items"
                ?disabled=${this.isDisabled}
                @input=${this.handleFilter}
                @keydown=${this.handleFilterKeydown}
              />
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
        ${
          /* `isDisabled`, matching the filter input above it: on `disabled`
             alone, a listbox in a disabled fieldset keeps its tab stop and
             takes arrow keys while its own filter is correctly out.

             No tab stop at all with a filter, whose field is the one stop: the
             field announces the highlight and forwards the arrows. A second
             stop on the list was one where the arrows chose as they moved, so
             in a command palette a Tab and an arrow ran a command. */
          ''
        }
        tabindex=${this.filterable ? nothing : this.isDisabled ? -1 : 0}
        @scroll=${this.handleScroll}
      >
        <slot @slotchange=${() => this.place()}></slot>
        ${
          /* Loading and empty come from the shared mixin; what is local is what
             counts as content. A list with a filter that matched nothing is
             empty, and one with no filter and no options is empty too, but a
             list still waiting on its options is neither. */
          this.renderStatus(shown)
        }
      </div>
      ${this.renderLive(shown)}${this.renderHint()}${this.renderFeedback()}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-listbox': HelixHeadlessListbox
  }
}
