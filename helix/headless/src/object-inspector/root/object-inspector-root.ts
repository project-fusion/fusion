import {
  AriaForwardController,
  CopyController,
  countLabel,
  customElement,
  drawStatus,
  elementById,
  formatWords,
  HelixActivateEvent,
  HelixBeforeActivateEvent,
  HelixBeforeCloseEvent,
  HelixBeforeOpenEvent,
  HelixElement,
  HelixFilterEvent,
  HelixFilteredEvent,
  inlineStep,
  MIRROR_RULE,
  numberConverter,
  pageRows,
  requestChange,
  SCROLLER_RULE,
  StatusController,
  scrollItemIntoView,
  scrollRoom,
  searchableById,
  Typeahead,
  treeArrow,
  VIRTUAL_RULE,
  VirtualizeController,
  words,
  wordsLocale,
} from '@fusion.dev/helix-core'
import { caretDown, caretRight } from '@fusion.dev/helix-icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { repeat } from 'lit/directives/repeat.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'
import { html as staticHtml } from 'lit/static-html.js'
import '../../copy-button/index.js'
import {
  cursorFor,
  entries,
  flatten,
  type Row,
  search,
  seed,
  siblingBranches,
  withAncestors,
} from '../rows.js'

/** What a `renderValue` function is told about the entry it draws. */
export interface ObjectInspectorEntry {
  /** How deep the entry is, from 0 at the root. */
  depth: number
  /** The property name or array index the value is under, absent for the root. */
  key: string | undefined
  /** The entry's path, as `active` writes it: `/meta/tags/0`. */
  path: string
  /** What kind of value it is, as JSON names it: `array`, `boolean`, `null`, `number`, `object` or `string`. Anything else is `other`. */
  type: 'array' | 'boolean' | 'null' | 'number' | 'object' | 'other' | 'string'
}

/**
 * Draws one entry's value, for an inspector given `renderValue`.
 *
 * Returns anything Lit renders, such as a template from `html`, a string, or a
 * DOM node, or `undefined` to draw the value as the inspector does.
 */
export type ObjectInspectorRenderer = (value: unknown, entry: ObjectInspectorEntry) => unknown

/** The kind of value an entry holds, as `ObjectInspectorEntry.type` names it. */
const kindOf = (value: unknown): ObjectInspectorEntry['type'] => {
  if (value === null) {
    return 'null'
  }
  if (Array.isArray(value)) {
    return 'array'
  }
  const type = typeof value
  return type === 'boolean' || type === 'number' || type === 'object' || type === 'string'
    ? type
    : 'other'
}

/**
 * @summary A structured value shown as a tree, where you can close branches,
 * see how many entries each holds, and copy any part.
 *
 * @description
 * Object Inspector shows a structured value, such as an API response, a config,
 * or a raw record, as a read-only tree with each entry's type visible.
 *
 * Pass the object to `value`, or name a `<script type="application/json">` by
 * id with `for`, the same source `VirtualList` and the charts read. JSON text
 * works with server rendering and with React hydration, which skips object
 * properties. `value` wins when both are set.
 *
 * **Keyboard.** The tree is one tab stop, and focus moves from row to row.
 *
 * | Key | What it does |
 * |---|---|
 * | Down, Up | Moves to the next or the previous row. |
 * | Right | Opens a closed branch, or moves into an open one. Left on a right-to-left page. |
 * | Left | Closes an open branch, or moves to the parent. Right on a right-to-left page. |
 * | Home, End | Moves to the first or the last row. |
 * | Page Down, Page Up | Moves a box's height of rows, so the row at one edge lands at the other. |
 * | Enter, Space | Opens or closes a branch. |
 * | `*` | Opens every branch beside the active row. |
 * | A letter or a word | Moves to the next row whose key starts with what you typed. |
 * | Command+C, Control+C | Copies the active row, where no text is selected. |
 *
 * The tree is a `treegrid`, as React Aria's Tree is: each entry is a `row` with
 * one cell, and carries its real level, position, and set size, including in a
 * windowed tree. Nothing in it is chosen, so no row carries `aria-selected`,
 * and a focused row is not announced as selected.
 *
 * A reader opening or closing a branch sends `helix-before-open` or
 * `helix-before-close`, which you can cancel, and then `toggle` with
 * `newState` and `oldState`, as `<details>` does. The branch is the active
 * row, and `expanded` holds every open branch. `*` asks once for all the
 * branches it opens. A script writing `expanded` or `active` sends nothing.
 *
 * `active` is the active row's path, written the way a JSON Pointer writes it:
 * the empty string for the root and `/meta/tags/0` for an entry under it.
 * Moving to another row sends `helix-before-activate`, which you can cancel,
 * and then `helix-activate`, both with the path. Writing `active` moves there
 * and opens the branches around it, and sends nothing. `expanded` holds the
 * open branches by path, and writing it opens those and closes the rest. A row
 * that closes around the active one hands it to the nearest open branch.
 *
 * `filter` narrows the tree to the entries whose key or value holds the text,
 * ignoring case, and the branches that lead to them, which it opens. A matched
 * branch keeps everything under it. Each matched row carries `row-match`, and
 * a screen reader hears how many entries matched from `results-label`.
 * `filterable` adds a field that sets it: typing sends
 * `helix-filter`, which you can cancel, and then `helix-filtered`, and Down
 * moves from the field to the tree.
 *
 * A new `value` keeps the branches a reader opened or closed, and the active
 * row, where the new value still has them. A branch the old value did not have
 * opens to `default-depth`.
 *
 * The copy button copies the active row, a branch as JSON and a string as its
 * text. So do Command+C and Control+C while the tree has focus and no text is
 * selected. The button sits beside the tree, because assistive technology
 * cannot reliably reach a button inside a tree item.
 *
 * **Your own drawing of a value.** `renderValue` is a function from a value and
 * its entry, its path, key, depth and type, to what Lit renders, such as a
 * link for a URL or a swatch for a color. Return `undefined` to draw the value
 * as the inspector does. What you draw sits in the `value` part, after the
 * key. Filtering and copying still read the value itself.
 *
 * `windowed` draws only the rows in view, for values with thousands of entries.
 * The box needs a height for windowing to work. The styled tier sets one, and
 * in the headless tier you set it yourself.
 *
 * @since 0.1.0
 * @status stable
 * @category data
 * @aliases JSON viewer, Object viewer, Inspector, Data explorer
 * @documentation https://fusion.dev/helix/components/object-inspector
 *
 * @slot empty - Shown in the tree while it has no entries to show. Defaults to `empty-label`, or `no-matches-label` while a filter matched none.
 *
 * @event {HelixActivateEvent} helix-activate - The active row moved, by a key or a click. The detail's `value` is its path.
 * @event {HelixBeforeActivateEvent} helix-before-activate - The active row is about to move, with its new path. Cancelable: cancel it to keep the row where it is.
 * @event {HelixBeforeCloseEvent} helix-before-close - A reader is about to close the active branch. Cancelable: cancel it to keep the branch open.
 * @event {HelixBeforeOpenEvent} helix-before-open - A reader is about to open the active branch, or `*` the branches beside it. Cancelable: cancel it to keep them closed.
 * @event {HelixCopyEvent} helix-copy - A value was put on the clipboard, from the copy button or the keyboard.
 * @event {HelixFilterEvent} helix-filter - Text was typed in the filter field, with what it now holds. Cancelable: cancel it to keep the filter as it was.
 * @event {HelixFilteredEvent} helix-filtered - The filter field changed `filter`, which now holds the text.
 * @event {ToggleEvent} toggle - A reader opened or closed a branch, with `newState` and `oldState`. `expanded` holds every open branch.
 *
 * @csspart after - The space the rows below the drawn rows would take, when `windowed` is set.
 * @csspart before - The space the rows above the drawn rows would take, when `windowed` is set.
 * @csspart boolean - A `true` or `false`.
 * @csspart copy - The copy button, which copies the active row.
 * @csspart copy-button - The button inside the copy control.
 * @csspart copy-live - The live region inside the copy button, which says its `pending-label` when the copy becomes pending under focus.
 * @csspart copy-mark - The clipboard icon, and the confirmation icon that replaces it.
 * @csspart copy-spinner - The ring the copy button turns while it is pending.
 * @csspart copy-text - The words on that button, trimmed to their capitals and baseline.
 * @csspart copy-tooltip - The tooltip, forwarded from the copy button's tooltip.
 * @csspart copy-tooltip-arrow - The tooltip's arrow, pointing at the copy button.
 * @csspart copy-tooltip-arrow-bottom - The arrow while the tooltip is below the copy button, on the tooltip's top edge. Set alongside `copy-tooltip-arrow`.
 * @csspart copy-tooltip-arrow-left - The arrow while the tooltip is left of the copy button, on the tooltip's right edge. Set alongside `copy-tooltip-arrow`.
 * @csspart copy-tooltip-arrow-right - The arrow while the tooltip is right of the copy button, on the tooltip's left edge. Set alongside `copy-tooltip-arrow`.
 * @csspart copy-tooltip-arrow-top - The arrow while the tooltip is above the copy button, on the tooltip's bottom edge. Set alongside `copy-tooltip-arrow`.
 * @csspart copy-tooltip-bottom - The tooltip while it is below the copy button. Set alongside `copy-tooltip`.
 * @csspart copy-tooltip-left - The tooltip while it is left of the copy button. Set alongside `copy-tooltip`.
 * @csspart copy-tooltip-right - The tooltip while it is right of the copy button. Set alongside `copy-tooltip`.
 * @csspart copy-tooltip-top - The tooltip while it is above the copy button. Set alongside `copy-tooltip`.
 * @csspart count - The number of entries a branch holds.
 * @csspart empty - The row shown in the tree while it has no entries to show: no value, or a filter that matched none. It holds the `empty` slot.
 * @csspart frame - The tree and the copy button beside it.
 * @csspart header - The bar that holds the label, when there is one.
 * @csspart key - A property name or an array index.
 * @csspart label - The label.
 * @csspart live - How many entries a filter matched, in a region that screen readers announce when it changes. Drawn from the first filter on. Visually hidden in the styled tier.
 * @csspart null - A `null`.
 * @csspart number - A number.
 * @csspart row - One entry, as a row of the tree grid, which takes focus.
 * @csspart row-active - The entry the keyboard is on, which holds the tab stop. Set alongside `row`.
 * @csspart row-match - An entry whose key or value holds the filter. Set alongside `row`.
 * @csspart search-field - The field that sets `filter`, with `filterable`.
 * @csspart string - A string, in quotes.
 * @csspart summary - The brackets that stand for a branch's contents.
 * @csspart toggle - The caret on a branch. It points down when the branch is open and sideways when it is closed.
 * @csspart tree - The tree grid that holds the rows.
 * @csspart value - What `renderValue` drew for an entry, in place of its own drawing.
 *
 * @cssproperty --object-inspector-level - How deep a row is, from 0 at the root, for indenting it.
 *
 * @cssstate empty - While the tree has no entries to show: no value, or a filter that matched none.
 * @cssstate filtered - While `filter` holds text.
 * @cssstate matched - While `filter` holds text and matched at least one entry.
 */
@customElement('helix-headless-object-inspector')
export class HelixHeadlessObjectInspector extends HelixElement {
  protected static override markRules = [SCROLLER_RULE, VIRTUAL_RULE, MIRROR_RULE]

  /**
   * The key this family's words are registered under, its styled tag:
   * `registerWords('de', { 'helix-object-inspector': { copyValueLabel: 'Wert kopieren' } })`.
   */
  static words = 'helix-object-inspector'

  /**
   * The active row's path, such as `/meta/tags/0`, and the empty string for the
   * root.
   *
   * Reading gives the row the keys are on. Writing moves there, opening the
   * branches around it, and sends no event, the way a script's write to any
   * current value sends none. A path the value does not hold moves to the
   * nearest branch above it that it does.
   */
  @property()
  get active(): string {
    return this.wanted ?? this.rows[this.cursor]?.path ?? ''
  }

  set active(path: string) {
    const previous = this.active
    this.wanted = path
    this.requestUpdate('active', previous)
  }

  /**
   * The copy button's accessible name on a row with a key, with the key filled
   * in as `{name}`.
   *
   * **Every word the inspector speaks is a property**, so a page in another
   * language hears its own rather than English around its own keys.
   */
  @words
  @property({ attribute: 'copy-label' })
  copyLabel = 'Copy {name}'

  /** The copy button's accessible name on a row without a key, such as the root. */
  @words
  @property({ attribute: 'copy-value-label' })
  copyValueLabel = 'Copy value'

  /**
   * How many levels start open.
   *
   * One by default: the root is open and everything under it closed, so a
   * reader sees the shape of the value before its contents. `0` starts with the
   * root closed; a large number opens everything, which on a big value is the
   * wall of text this exists to avoid.
   */
  @property({ attribute: 'default-depth', converter: numberConverter('default-depth', 1) })
  defaultDepth = 1

  /**
   * What the tree says while there is no value to show, such as before a
   * fetch answers. The `empty` slot replaces it.
   */
  @words
  @property({ attribute: 'empty-label' })
  emptyLabel = 'Nothing to show'

  /**
   * The open branches, by path, in no set order.
   *
   * Writing opens exactly these and closes every other, keeping the active row
   * where it stays visible. A property, never an attribute.
   */
  @property({ attribute: false })
  get expanded(): string[] {
    return [...this.opened]
  }

  set expanded(paths: string[]) {
    const previous = this.expanded
    this.declared = new Set(paths)
    this.opened = this.declared
    this.requestUpdate('expanded', previous)
  }

  /**
   * Text the tree is narrowed to: the entries whose key or value holds it,
   * ignoring case, and the branches that lead to them. Empty shows everything.
   */
  @property()
  filter = ''

  /** Whether to show a field that sets `filter`. */
  @property({ type: Boolean })
  filterable = false

  /** The filter field's placeholder and accessible name. */
  @words
  @property({ attribute: 'filter-label' })
  filterLabel = 'Filter'

  /**
   * The id of a `<script type="application/json">` holding the value.
   *
   * Read once the document exists, and again whenever this changes. Text that
   * does not parse leaves the inspector empty rather than throwing, since a
   * page's markup should not take the page down over a comma.
   */
  @property()
  for = ''

  /**
   * How an array of one entry counts it, where `items-label` should not say
   * it. `{count}` is the count.
   *
   * @deprecated Write every form in `items-label`, as `{count, plural, one
   * {# item} other {# items}}`. Removed in the next major version.
   */
  @property({ attribute: 'item-label' })
  itemLabel?: string

  /**
   * How an array counts its entries. `{count}` is the count, written in the
   * locale, and each language writes the forms it has: `{count, plural, one
   * {# element} few {# elementy} many {# elementów} other {# elementu}}`.
   */
  @words
  @property({ attribute: 'items-label' })
  itemsLabel = '{count, plural, one {# item} other {# items}}'

  /**
   * How an object of one key counts it, where `keys-label` should not say it.
   * `{count}` is the count.
   *
   * @deprecated Write every form in `keys-label`, as `{count, plural, one
   * {# key} other {# keys}}`. Removed in the next major version.
   */
  @property({ attribute: 'key-label' })
  keyLabel?: string

  /**
   * How an object counts its keys. `{count}` is the count, written in the
   * locale, and each language writes the forms it has: `{count, plural, one
   * {# klucz} few {# klucze} many {# kluczy} other {# klucza}}`.
   */
  @words
  @property({ attribute: 'keys-label' })
  keysLabel = '{count, plural, one {# key} other {# keys}}'

  /**
   * Accessible name for the tree, and the text of the header where there is one.
   */
  @property()
  label = ''

  /**
   * Hides the copy button.
   *
   * Negative for the reason Code Block's is: a boolean attribute defaulting to
   * true could never be turned off from markup.
   *
   * **It does not reflect, where Code Block's does**, and the difference is what
   * the two sheets need. Code Block reserves the button's width with
   * `:host(:not([no-copy]))`, so the attribute has to be there for a consumer
   * who set the property. This button is positioned out of the flow and takes no
   * room, so nothing selects on it, and reflection exists so that a selector can
   * reach a value.
   */
  @property({ attribute: 'no-copy', type: Boolean })
  noCopy = false

  /**
   * What the tree says while a filter matched no entry. The `empty` slot
   * replaces it.
   */
  @words
  @property({ attribute: 'no-matches-label' })
  noMatchesLabel = 'No matches'

  /**
   * Draws an entry's value your way, given the value and its entry. Set it as
   * a property.
   *
   * It returns what Lit renders: a template from `html`, a string, or a DOM
   * node. `undefined` draws the value as the inspector does, so a function can
   * draw some entries and leave the rest, such as only the strings under
   * `/links`.
   */
  @property({ attribute: false })
  renderValue: ObjectInspectorRenderer | undefined

  /**
   * What a screen reader hears when a filter matches one entry, where
   * `results-label` should not say it. `{count}` is the count.
   *
   * @deprecated Write every form in `results-label`, as `{count, plural, one
   * {# result} other {# results}}`. Removed in the next major version.
   */
  @property({ attribute: 'result-label' })
  resultLabel?: string

  /**
   * What a screen reader hears when a filter matches entries. `{count}` is
   * how many, written in the locale, and each language writes the forms it
   * has: `{count, plural, one {# wynik} few {# wyniki} many {# wyników}
   * other {# wyniku}}`.
   */
  @words
  @property({ attribute: 'results-label' })
  resultsLabel = '{count, plural, one {# result} other {# results}}'

  /**
   * The tree's accessible name when `label` is empty and the host names it
   * with neither `aria-label` nor `aria-labelledby`.
   */
  @words
  @property({ attribute: 'tree-label' })
  treeLabel = 'Value'

  /**
   * The value to show, when your code already holds it as an object.
   *
   * Takes precedence over `for`. Anything JSON can say is drawn; anything else
   * is shown as its string.
   */
  @property({ attribute: false })
  value: unknown = undefined

  /**
   * Whether to draw only the rows in view.
   *
   * For a value of thousands of entries. Reflected, because the box it scrolls
   * needs a height, which is a stylesheet rule reading this attribute.
   */
  @property({ reflect: true, type: Boolean })
  windowed = false

  /** The value read from `for`, when there is no `value`. */
  @state()
  private read: unknown = undefined

  /** The `for` that `read` came from, so it is read again only when that changes. */
  private loadedFor: string | undefined

  /** Which branches are open, by path. */
  @state()
  private opened = new Set<string>()

  /** The row the arrow keys are on, by its place among the visible rows. */
  @state()
  private cursor = 0

  /** A path written to `active` and not yet found among the rows. */
  private wanted: string | undefined

  /**
   * The branches written to `expanded`, until the next update applies them.
   *
   * Its own field, because a property declared with an accessor is in the
   * first update's changes whether or not anybody wrote it.
   */
  private declared: Set<string> | undefined

  /** The paths the filter matched, or nothing while there is no filter. */
  private found: Set<string> | undefined

  /** Set by a keyboard move, so the next render brings the active row into view. */
  private revealing = false

  /** Set by a reader's move, so the next render moves focus to the active row. */
  private focusing = false

  /** Whether a row held focus as this update began, so a row the render moved gets it back. */
  private hadFocus = false

  /** What has been typed toward a key, and when the last letter came. */
  private readonly typed = new Typeahead()

  /** The branches of the last value seen, by path, so a new value can tell old ones from new. */
  private branches = new Set<string>()

  /** Carries a host `aria-label` and `aria-labelledby` to the tree, which is what takes focus. */
  protected readonly aria = new AriaForwardController(this, {
    label: true,
    target: () => this.partNamed('tree'),
  })

  /** Says how many entries a filter matched. */
  private readonly status = new StatusController(this)

  /**
   * How tall a row is taken to be before it has been drawn, in pixels.
   *
   * A constant rather than the property `VirtualList` and `DataTable` carry:
   * every row here is one line of the same text at this family's own leading,
   * so there is nothing for a consumer to tell it. `reveal` falls back to this
   * when a drawn row measures zero, and the two have to be the same number or a
   * keyboard move scrolls by a different row than the window counted with.
   */
  static readonly ESTIMATE = 24

  private readonly virtualize = new VirtualizeController(this, {
    container: () => (this.windowed ? this.partNamed('tree') : null),
    count: () => this.rows.length,
    estimate: () => HelixHeadlessObjectInspector.ESTIMATE,
    measured: () => this.windowed,
    rows: () =>
      [...(this.renderRoot?.querySelectorAll<HTMLElement>('[part~="row"]') ?? [])].map(
        (element) => ({ element, index: Number(element.dataset.index) }),
      ),
  })

  private get root(): unknown {
    return this.value === undefined ? this.read : this.value
  }

  /** Every visible row, in order, worked out once per change rather than per read. */
  private rows: Row[] = []

  private readonly copier = new CopyController(this)

  /**
   * Opens every branch shallower than `defaultDepth`.
   *
   * `keep` is for a new value: a branch the last value also had keeps whether
   * a reader opened or closed it, and only a new one takes the default.
   * **Assigning a value used to close everything**, so an inspector showing
   * live data, a polled response or a debug panel, threw away the reader's
   * place on every update.
   */
  private seed(keep: boolean): void {
    const { branches, opened } = seed(
      this.root,
      this.defaultDepth,
      keep ? this.branches : undefined,
      this.opened,
    )
    this.branches = branches
    this.opened = opened
    if (!keep) {
      this.cursor = 0
    }
  }

  /** Opens the branches around each path, where the value has them. */
  private openAround(paths: Iterable<string>): void {
    this.opened = withAncestors(this.opened, this.branches, paths)
  }

  /**
   * Whether the tree has no entries to show. Not while a value named by `for`
   * is still to be read, as on a server and while hydrating what one sent,
   * where it says nothing yet about the value.
   */
  private get blank(): boolean {
    return this.rows.length === 0 && (this.for === '' || this.loadedFor === this.for)
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    this.hadFocus = this.hasFocusedRow()
    /* First, so a value read from `for` is in the rows this update works out,
       and so in the first render. Resolved through `getRootNode()`, so an
       inspector inside another component's shadow root names a script in that
       root rather than in the page. Not on the server, whose shim has
       attributes and no tree to look an id up in, nor while hydrating what one
       sent. */
    if (this.loadedFor !== this.for && searchableById(this) && !this.hydrating) {
      this.loadedFor = this.for
      this.load()
    }
    /* The path the active row is on, so it stays there when the rows move. */
    const was = this.rows[this.cursor]?.path
    const written = this.declared
    this.declared = undefined
    const fresh = changed.has('value') || changed.has('read')
    if (fresh || changed.has('defaultDepth')) {
      this.seed(!changed.has('defaultDepth'))
    }
    /* A consumer's `expanded` is exactly what opens, a new value or not. */
    if (written) {
      this.opened = written
    }
    if (fresh || changed.has('filter')) {
      this.found = this.filter.trim() === '' ? undefined : search(this.root, this.filter)
      this.openAround(this.found ?? [])
    }
    const wanted = this.root === undefined ? undefined : this.wanted
    if (wanted !== undefined) {
      this.wanted = undefined
      this.openAround([wanted])
    }
    if (
      fresh ||
      wanted !== undefined ||
      ['active', 'defaultDepth', 'expanded', 'filter', 'opened'].some((name) => changed.has(name))
    ) {
      this.rows = flatten(this.root, this.opened, this.found)
      this.cursor = cursorFor(this.rows, wanted ?? was, this.cursor, changed.has('filter'))
    }
    if (changed.has('filter') && this.hasUpdated) {
      this.tell()
    }
    this.toggleState('empty', this.blank)
    this.toggleState('filtered', this.found !== undefined)
    this.toggleState('matched', (this.found?.size ?? 0) > 0)
  }

  /**
   * A count in its plural message, `items-label`, `keys-label` or
   * `results-label`, or in the deprecated sentence for one where a page still
   * sets it.
   */
  private counted(which: 'item' | 'key' | 'result', count: number): string {
    const one = this[`${which}Label`]
    return one
      ? countLabel(count, one, this[`${which}sLabel`], wordsLocale(this))
      : formatWords(this, `${which}sLabel`, { count })
  }

  /** Says how many entries the filter matched, and nothing for an empty one. */
  private tell(): void {
    if (this.found) {
      this.status.say(this.counted('result', this.found.size))
    }
  }

  /**
   * Moves focus to the row the keys move from, or to the tree while that row
   * is scrolled out of the window, as Tab reaches them.
   */
  override focus(options?: FocusOptions): void {
    this.renderRoot
      ?.querySelector<HTMLElement>('#tree[tabindex="0"], #tree [tabindex="0"]')
      ?.focus(options)
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.finishHydration()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated?.(changed)
    /* The controller measures once rows it drew report their heights, and a
       window that has drawn nothing yet has none to report, so it is asked here
       as `VirtualList` asks it. */
    if (this.windowed) {
      this.virtualize.measure()
    }
    if (this.revealing) {
      this.revealing = false
      this.reveal()
    }
    /* **A focused row the render moved has lost focus**, because moving a
       node takes focus from it: a window that jumps past the focused row can
       put it before rows it followed. Given back, where nothing else took it. */
    const lost =
      this.hadFocus &&
      !this.hasFocusedRow() &&
      this.ownerDocument.activeElement === this.ownerDocument.body
    if (this.focusing || lost) {
      this.focusing = false
      this.focusActive()
    }
  }

  /**
   * Moves focus to the active row, once it is drawn.
   *
   * After a reader's move only, so a script writing `active` does not take
   * focus from wherever the reader is.
   */
  private focusActive(): void {
    const row = this.partNamed('tree')?.querySelector<HTMLElement>(`[data-index="${this.cursor}"]`)
    if (row && this.shadowRoot?.activeElement !== row) {
      row.focus({ preventScroll: true })
    }
  }

  private load(): void {
    const text = this.for === '' ? '' : (elementById(this, this.for)?.textContent ?? '')
    try {
      this.read = text.trim() === '' ? undefined : (JSON.parse(text) as unknown)
    } catch {
      this.read = undefined
    }
  }

  /**
   * Brings the active row into the box.
   *
   * **A windowed tree may not have drawn it, and a jump straight to where it
   * should be does not land.** The controller places rows it has not measured at
   * its estimate, so an offset computed from a real row's height points at a
   * different row, and asking again from there asks the same wrong question: the
   * first version of this looped until the page stopped. So each attempt steps
   * from the rows that *are* drawn toward the one wanted, by how many rows lie
   * between, which closes the gap every time whatever the estimate is, and gives
   * up after a few rather than trusting that it always will.
   */
  private reveal(attempts = 8): void {
    const tree = this.partNamed('tree')
    const row = tree?.querySelector<HTMLElement>(`[data-index="${this.cursor}"]`)
    if (row) {
      // Inside the tree only: `Element.scrollIntoView` takes the page with it.
      scrollItemIntoView(row)
      return
    }
    const drawn = [...(tree?.querySelectorAll<HTMLElement>('[part~="row"]') ?? [])]
    const first = drawn[0]
    const last = drawn.at(-1)
    if (!tree || !this.windowed || !first || !last || attempts === 0) {
      return
    }
    const height = first.offsetHeight || HelixHeadlessObjectInspector.ESTIMATE
    const from = Number(
      this.cursor > Number(last.dataset.index) ? last.dataset.index : first.dataset.index,
    )
    tree.scrollTop += (this.cursor - from) * height
    this.virtualize.measure()
    void this.updateComplete.then(() => {
      this.reveal(attempts - 1)
      this.focusActive()
    })
  }

  /** What copying takes: a branch as indented JSON, a string as itself. */
  private copyable(row: Row | undefined): string {
    if (!row) {
      return ''
    }
    if (typeof row.value === 'string') {
      return row.value
    }
    return JSON.stringify(row.value, null, 2) ?? String(row.value)
  }

  /**
   * Asks to open or close branches, and then does and says so:
   * `helix-before-open` or `helix-before-close`, which a listener can cancel,
   * then `toggle`. A reader's act only. Returns whether they moved.
   */
  private requestOpen(paths: readonly string[], open: boolean): boolean {
    if (paths.length === 0) {
      return false
    }
    const applied = requestChange({
      apply: () => {
        const opened = new Set(this.opened)
        for (const path of paths) {
          if (open) {
            opened.add(path)
          } else {
            opened.delete(path)
          }
        }
        this.opened = opened
      },
      event: (next) => (next ? new HelixBeforeOpenEvent() : new HelixBeforeCloseEvent()),
      host: this,
      next: open,
    })
    if (applied) {
      this.announceToggle(open)
    }
    return applied
  }

  /**
   * Says a branch opened or closed under the platform's own name and in its
   * shape: `toggle` with `newState` and `oldState`, not bubbling, as
   * `<details>` sends it and as the open mixin does for the families whose
   * open state it owns. A real `ToggleEvent` where the platform has one, and a
   * plain event carrying the same two fields where it does not.
   */
  private announceToggle(open: boolean): void {
    const states = { newState: open ? 'open' : 'closed', oldState: open ? 'closed' : 'open' }
    if (typeof ToggleEvent === 'function') {
      this.dispatchEvent(new ToggleEvent('toggle', states))
      return
    }
    const event = new Event('toggle', { bubbles: false, cancelable: false, composed: false })
    Object.assign(event, states)
    this.dispatchEvent(event)
  }

  private toggle(row: Row, open = !row.open): void {
    this.requestOpen([row.path], open)
  }

  /**
   * Moves the active row, asking first: `helix-before-activate` with the path,
   * then `helix-activate` once it has moved. Returns whether it is there.
   */
  private move(to: number): boolean {
    const at = Math.max(0, Math.min(to, this.rows.length - 1))
    const path = this.rows[at]?.path
    if (path === undefined) {
      return false
    }
    if (at !== this.cursor) {
      const moved = requestChange({
        apply: () => {
          this.cursor = at
        },
        event: (value) => new HelixBeforeActivateEvent({ value }),
        host: this,
        next: path,
      })
      if (!moved) {
        return false
      }
      this.dispatchEvent(new HelixActivateEvent({ value: path }))
    }
    /* **Asked for an update even where the row stays, so the focus is spent
       now.** A key that does not move the row (Up on the first, Page Down on
       the last) requested none, so the flag waited for whatever updated next,
       the focusout of a Tab away included, and pulled focus back to the row. */
    this.revealing = true
    this.focusing = true
    this.requestUpdate()
    return true
  }

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    const rows = this.rows
    const row = rows[this.cursor]
    if (!row) {
      return
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'c') {
      /* A selection is left alone: somebody who dragged across three lines
         wants those three lines, not the row the arrow keys were on. */
      if (globalThis.getSelection?.()?.toString()) {
        return
      }
      void this.copier.copy(this.copyable(row))
      event.preventDefault()
      return
    }
    switch (event.key) {
      case 'ArrowDown':
        this.move(this.cursor + 1)
        break
      case 'ArrowUp':
        this.move(this.cursor - 1)
        break
      case 'Home':
        this.move(0)
        break
      case 'End':
        this.move(rows.length - 1)
        break
      case 'PageDown':
        this.move(this.cursor + this.pageStep())
        break
      case 'PageUp':
        this.move(this.cursor - this.pageStep())
        break
      case 'ArrowRight':
      case 'ArrowLeft':
        /* In is where a shut row's caret points, along the line, so it is the
           left arrow on a right-to-left page and the right one comes back. */
        switch (treeArrow(row, inlineStep(this, event.key) === 1 ? 1 : -1)) {
          case 'open':
          case 'close':
            this.toggle(row, !row.open)
            break
          case 'child':
            this.move(this.cursor + 1)
            break
          case 'parent': {
            const parent = rows.findLastIndex(
              (candidate, at) => at < this.cursor && candidate.depth === row.depth - 1,
            )
            if (parent >= 0) {
              this.move(parent)
            }
            break
          }
          default:
            break
        }
        break
      case 'Enter':
      case ' ':
        if (row.branch) {
          this.toggle(row)
        }
        break
      case '*':
        this.requestOpen(siblingBranches(rows, row), true)
        break
      default:
        if (event.key.length !== 1 || event.altKey || event.ctrlKey || event.metaKey) {
          return
        }
        this.typeahead(event.key)
    }
    event.preventDefault()
  }

  /**
   * Moves to the next row whose key starts with what was typed, through core's
   * `Typeahead`: letters within half a second run together, so `me` finds
   * `meta` past `message`, and a repeated letter cycles through the keys that
   * start with it.
   */
  private typeahead(letter: string): void {
    const at = this.typed.match(
      letter,
      this.rows.map((row) => row.key ?? ''),
      this.cursor,
    )
    if (at >= 0) {
      this.move(at)
    }
  }

  /**
   * How many rows Page Down and Page Up move: the rows that fit in the tree's
   * box, or in the window where the box does not scroll, less one, so the row
   * at one edge lands at the other.
   */
  private pageStep(): number {
    return pageRows(
      scrollRoom(this.partNamed('tree')),
      this.virtualize.sizeOf(this.cursor) || HelixHeadlessObjectInspector.ESTIMATE,
    )
  }

  /** A press opens or closes the row it lands on, once that row is the active one. */
  private handleRowClick(index: number, row: Row): void {
    if (this.move(index) && row.branch) {
      this.toggle(row)
    }
  }

  /** Text typed in the filter field, asked for before the tree narrows to it. */
  private readonly handleFilterInput = (event: Event): void => {
    const field = event.currentTarget as HTMLInputElement
    const applied = requestChange({
      apply: (value) => {
        this.filter = value
      },
      event: (value) => new HelixFilterEvent({ value }),
      host: this,
      next: field.value,
    })
    if (applied) {
      this.dispatchEvent(new HelixFilteredEvent({ value: field.value }))
    } else {
      field.value = this.filter
    }
  }

  /** Down from the filter field goes to the active row, where the matches are. */
  private readonly handleFilterKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'ArrowDown' && this.rows.length > 0) {
      event.preventDefault()
      this.revealing = true
      this.focusing = true
      this.requestUpdate()
    }
  }

  /* **What follows a key is isolated, so a right-to-left page orders the row
     and not the text inside it.** Unisolated, a row was one bidirectional run:
     a string's closing quote went to the far end, `"id: "dpl_8f2c`, a row
     holding a number or a branch read left to right while a row holding a
     string read right to left, and "8 keys" came out "keys 8". A value is
     code, a JSON literal, so it reads left to right on any page, and the count
     takes the direction of what it says. The key stays in the line: isolating
     it as well changed no row's order and redrew the colon after an index. */
  private drawValue(row: Row): TemplateResult {
    const { value } = row
    const drawn = this.renderValue?.(value, {
      depth: row.depth,
      key: row.key,
      path: row.path,
      type: kindOf(value),
    })
    if (drawn !== undefined) {
      return html`<span part="value">${drawn}</span>`
    }
    if (row.branch) {
      const count = entries(value as object).length
      const array = Array.isArray(value)
      return html`<span part="summary">${array ? '[…]' : '{…}'}</span>
        <span part="count" dir="auto">${this.counted(array ? 'item' : 'key', count)}</span>`
    }
    if (typeof value === 'string') {
      return html`<span part="string" dir="ltr">${JSON.stringify(value)}</span>`
    }
    if (typeof value === 'number') {
      return html`<span part="number" dir="ltr">${String(value)}</span>`
    }
    if (typeof value === 'boolean') {
      return html`<span part="boolean" dir="ltr">${String(value)}</span>`
    }
    if (value === null) {
      return html`<span part="null" dir="ltr">null</span>`
    }
    return html`<span part="string" dir="ltr">${String(value)}</span>`
  }

  /**
   * One entry, named for its state where it holds one.
   *
   * **`row-active` and no attribute beside it.** Which row the keys are on is
   * drawn by a sheet and by nothing else: the accessibility tree hears it from
   * focus, which the row holds, so an attribute would be a second spelling with
   * no reader. The name is the one a consumer can reach, nothing being able to
   * follow `::part()` with an attribute selector.
   *
   * **A `row` of a `treegrid` with one cell, focused itself, and no
   * `aria-selected`**, because nothing here is chosen. Chromium takes the
   * focused item of a single-selection `tree` as selected, by focus or by
   * `aria-activedescendant` (measured), so every arrow press was also announced
   * as a selection, and `aria-selected="false"` on every row was the one way to
   * turn it off. A row of a tree grid is not selected by focus, which is why
   * React Aria's Tree is one. The cell is `display: contents`, so the row lays
   * out its text as it did.
   */
  private renderRow(row: Row, index: number): TemplateResult {
    const active = index === this.cursor
    return html`<div
      part="row${active ? ' row-active' : ''}${row.match ? ' row-match' : ''}"
      role="row"
      id=${`row-${index}`}
      data-index=${index}
      tabindex=${active ? '0' : '-1'}
      aria-level=${row.depth + 1}
      aria-posinset=${row.position}
      aria-setsize=${row.siblings}
      aria-expanded=${row.branch ? String(row.open) : nothing}
      style=${`--object-inspector-level: ${row.depth}`}
      @click=${() => this.handleRowClick(index, row)}
    ><div role="gridcell" style="display: contents">${
      row.branch
        ? html`<svg
              part="toggle"
              ?data-mirror=${!row.open}
              fill="currentColor"
              viewBox=${(row.open ? caretDown : caretRight).viewBox}
              aria-hidden="true"
            >
              ${unsafeSVG((row.open ? caretDown : caretRight).content)}
            </svg>`
        : nothing
    }${row.key === undefined ? nothing : html`<span part="key">${row.key}</span>: `}${this.drawValue(row)}</div>
    </div>`
  }

  /** Whether a row of the tree holds focus. */
  private hasFocusedRow(): boolean {
    return this.focusedIndex() !== undefined
  }

  /** Where the row holding focus is among the visible rows, or nothing while none does. */
  private focusedIndex(): number | undefined {
    /* No `instanceof HTMLElement`: this is asked before every render, a
       server's included, where there is no such class. */
    const focused = this.shadowRoot?.activeElement as HTMLElement | null | undefined
    return focused?.getAttribute?.('role') === 'row' ? Number(focused.dataset.index) : undefined
  }

  /** Focus on the tree itself, its stop while the active row is not drawn, goes on to that row. */
  private readonly handleTreeFocus = (): void => {
    this.revealing = true
    this.focusing = true
    this.requestUpdate()
  }

  /**
   * A row that takes focus some other way than the keys, from a script or a
   * screen reader, becomes the active row, so focus and the keys agree.
   */
  private readonly handleFocusIn = (event: FocusEvent): void => {
    const index = Number((event.target as HTMLElement).dataset?.index)
    if (Number.isInteger(index) && index !== this.cursor) {
      this.move(index)
    }
  }

  /** A row kept drawn for focus is let go once focus leaves it. */
  private readonly handleFocusOut = (): void => {
    if (this.windowed) {
      this.requestUpdate()
    }
  }

  /** The copy button, behind the seam Code Block's uses, so each tier renders its own. */
  protected renderCopyButton(row: Row | undefined): TemplateResult {
    return staticHtml`<${this.tag('copy-button')}
      part="copy"
      exportparts="button: copy-button, live: copy-live, spinner: copy-spinner, text: copy-text, mark: copy-mark, tooltip: copy-tooltip,
        tooltip-arrow: copy-tooltip-arrow, tooltip-arrow-bottom: copy-tooltip-arrow-bottom,
        tooltip-arrow-left: copy-tooltip-arrow-left, tooltip-arrow-right: copy-tooltip-arrow-right,
        tooltip-arrow-top: copy-tooltip-arrow-top, tooltip-bottom: copy-tooltip-bottom,
        tooltip-left: copy-tooltip-left, tooltip-right: copy-tooltip-right, tooltip-top: copy-tooltip-top"
      label=${row?.key === undefined ? this.copyValueLabel : formatWords(this, 'copyLabel', { name: row.key })}
      .value=${this.copyable(row)}
    ></${this.tag('copy-button')}>`
  }

  protected override render(): TemplateResult {
    const rows = this.rows
    const { first, last } = this.windowed ? this.virtualize.window : { first: 0, last: rows.length }
    /* The row holding focus stays drawn when it scrolls out of the window,
       beside it on its side, and the spacer there gives up its room.

       **The row holding focus, which is not always the active row.** Between
       a jump and the focus that follows it, focus is still on the row the key
       was pressed on. Keeping the active row instead drew it beside the
       window, far from where it belongs, and the reveal scrolled to that
       place: after Page Down the row had focus below the box. */
    const focused = this.focusedIndex()
    const kept =
      this.windowed && focused !== undefined && (focused < first || focused >= last)
        ? focused
        : undefined
    const { after, before } = this.windowed
      ? this.virtualize.spacers(kept)
      : { after: 0, before: 0 }
    const shown = rows.slice(first, last).map((row, at): [Row, number] => [row, first + at])
    const keptRow = kept === undefined ? undefined : rows[kept]
    if (kept !== undefined && keptRow) {
      shown.splice(kept < first ? 0 : shown.length, 0, [keptRow, kept])
    }
    /* **The tree is the stop while the active row is not drawn.** A window
       that scrolled away from it left no row with `tabindex="0"`, so Tab back
       in landed nowhere a key could move from. The tree hands focus on. */
    const stopless = rows.length > 0 && !shown.some(([, at]) => at === this.cursor)
    return html`${
      this.label ? html`<div part="header"><span part="label">${this.label}</span></div>` : nothing
    }${
      this.filterable
        ? html`<input
            part="search-field"
            type="search"
            spellcheck="false"
            .value=${this.filter}
            placeholder=${this.filterLabel}
            aria-label=${this.filterLabel}
            aria-controls="tree"
            @input=${this.handleFilterInput}
            @keydown=${this.handleFilterKeydown}
          />`
        : nothing
    }
      <div part="frame">
        <div
          part="tree"
          id="tree"
          role="treegrid"
          ?data-scroller=${this.windowed}
          tabindex=${stopless ? '0' : nothing}
          aria-label=${this.label || this.treeLabel}
          @keydown=${this.handleKeydown}
          @focus=${this.handleTreeFocus}
          @focusin=${this.handleFocusIn}
          @focusout=${this.handleFocusOut}
          @scroll=${() => this.virtualize.measure()}
        >
          ${this.windowed ? html`<div part="before" role="presentation" style="block-size: ${before}px"></div>` : nothing}
          ${
            /* Keyed by path, so the element of a row is the same element while
               the row is shown: focus stays on the row it is on as branches
               open above it and as the window moves. */
            repeat(
              shown,
              ([row]) => row.path,
              ([row, at]) => this.renderRow(row, at),
            )
          }${
            /* A row, so the tree holds only rows, and one a reader can find:
               an empty box said nothing, to the eye or to a screen reader. */
            this.blank
              ? html`<div part="empty" role="row"><div role="gridcell"><slot name="empty">${
                  this.found ? this.noMatchesLabel : this.emptyLabel
                }</slot></div></div>`
              : nothing
          }
          ${this.windowed ? html`<div part="after" role="presentation" style="block-size: ${after}px"></div>` : nothing}
        </div>
        ${this.noCopy ? nothing : this.renderCopyButton(rows[this.cursor])}
      </div>
      ${drawStatus(this.status)}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-object-inspector': HelixHeadlessObjectInspector
  }
}
