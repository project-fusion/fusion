import {
  AriaForwardController,
  commaList,
  customElement,
  elementById,
  HelixBeforeChangeEvent,
  HelixElement,
  HelixLoadMoreEvent,
  HelixRangeChangeEvent,
  isRtl,
  type Rendered,
  rangeAdd,
  requestChange,
  searchableById,
  Typeahead,
  toggleValue,
  typesCharacter,
  VirtualizeController,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, render, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { holdControls, releaseControls } from '../controls.js'
import { fillHoles, keyOf, textsOf } from '../fill.js'
import { stepIndex } from '../keys.js'
import { drawPlan, itemsOf, stopAfter } from '../plan.js'

/**
 * Draws one item into its row, for a list given `renderItem`.
 *
 * Returns anything Lit renders: a template from `html`, a string, or a DOM
 * node the function built.
 */
export type VirtualListRenderer = (item: unknown, index: number) => unknown

/** Where `scrollToIndex` puts an item, and how it gets there. */
export interface VirtualListScrollOptions {
  /**
   * Where the item lands: the least distance that shows it whole (`nearest`,
   * the default), or at the box's `start`, `center` or `end`.
   */
  align?: 'center' | 'end' | 'nearest' | 'start'
  /** The platform's scroll behavior. Instant when left out. */
  behavior?: ScrollBehavior
}

/** The items on screen: `items.slice(first, last)`. */
export interface VirtualListRange {
  /** The index of the first item on screen. */
  first: number
  /** One past the index of the last item on screen. */
  last: number
}

/**
 * @summary A list that renders only the rows of a long set that are on screen.
 *
 * @description
 * The items arrive as data, in one of two ways:
 *
 * - `items` takes an array. A framework sets it as a property, and React
 *   hydration keeps it.
 * - `for` names a `<script type="application/json">` that holds an array, which
 *   a server sends as markup.
 *
 * Each item is drawn into a row in one of two ways:
 *
 * - `renderItem` is a function from an item and its index to the row's
 *   content: a Lit template, a string, or a DOM node.
 * - A `<template>` child defines one row. `data-field="name"` fills an element
 *   with the item's `name` as text, and `data-field-href="url"` writes the
 *   item's `url` into `href`, the same for any attribute. A field may be a path
 *   of keys, such as `author.name`.
 *
 * Rows are your markup in the light DOM, so your stylesheet styles them.
 *
 * **A grid.** `columns` lays the items out that many to a line, as a grid of
 * equal columns, and windows the set a line at a time, as React Aria's grid
 * layout does. Each item draws one element, a cell of the grid, and
 * `estimate` is the height of a line. Space the items with padding inside
 * each one, which the list measures with the line.
 *
 * **Keyboard.** The list is one tab stop.
 *
 * | Key | What it does |
 * |---|---|
 * | Down, Up | Moves to the next or the previous item, or in a grid to the item in the same column on the next or the previous line. |
 * | Right, Left | In a grid, moves to the next or the previous item along the line, the other way round on a right-to-left page. |
 * | Home, End | Moves to the first or the last item. |
 * | Page Down, Page Up | Moves by the number of items, or of lines in a grid, on screen. |
 * | A letter or a word | Moves to the next item whose text starts with what you typed. |
 * | Tab | Moves into the focused row's own links and buttons, then out of the list. |
 *
 * An item that is not drawn is scrolled into view and focused, so a keyboard
 * reaches the whole set. When the row holding the tab stop scrolls away, the
 * stop moves to the first row on screen. Typing matches each item's
 * `text-field`, which is the first `data-field` of the row template by default,
 * or the item itself when it is a string or a number.
 *
 * Each row says its place in the whole set with `aria-posinset` and
 * `aria-setsize`, so a screen reader says "4,000 of 10,000". The row holding
 * focus stays drawn when it scrolls out.
 *
 * **Selecting.** `selection-mode` makes the list a list box a reader chooses
 * from: `single` selects one item and `multiple` any number. Space or a press
 * selects an item, Shift with Space, an arrow, Home, End or a press takes in
 * the items from the last one chosen, and Control or Command with A selects
 * them all, in `multiple`. `value` holds the chosen items' keys, separated by
 * commas, in the order of the set: `key-field` names each item's key, and a
 * string or a number item is its own key. A change asks with
 * `helix-before-change` and tells with `change`. Each row is an `option`
 * marked `aria-selected`, so a row's own links and buttons are not reached
 * there: keep those to a list without `selection-mode`.
 *
 * **Loading more.** `helix-range-change` fires as the items on screen change,
 * and `range` holds them. `helix-load-more` fires once a reader is within one
 * screen of the end, once for each length of the set: add to `items` and it can
 * fire again. While you fetch, set `loading`: the list is busy, and a row after
 * the last item says "Loading more" (`loading-label`, or your own content in
 * the `loading` slot). `scrollToIndex` takes a reader to an item.
 *
 * **Row height.** Rows are placed by `estimate` until they are drawn. Then the
 * list reads the drawn rows' height once and places every row by it, so a
 * wrong estimate still reaches the last item. Set `measured` for rows of
 * different heights.
 *
 * The list follows its source. A new `items` array, an edit to the script's
 * text, or a script replaced under the same id draws the new rows. A row that
 * stays in view keeps its element as the list scrolls.
 *
 * The viewport scrolls on this tier. It carries `data-scroller`, and `core`
 * ships `[data-scroller] { overflow: auto }` into every shadow root, so
 * `scrollTop` works with no stylesheet. You still need to set a block size.
 *
 * @since 0.1.0
 * @status stable
 * @category layout
 * @documentation https://fusion.dev/helix/components/virtual-list
 *
 * @slot - The `<template>` that defines one row. The list writes the rows it renders beside it, and this slot shows them between the two spacers.
 * @slot loading - Content for the row after the last item while `loading` is set. Falls back to `loading-label`.
 *
 * @event {Event} change - Fired once a press or a key has changed which items are selected, in a list with `selection-mode`.
 * @event {HelixBeforeChangeEvent} helix-before-change - Fired before a press or a key changes which items are selected, with the `value` it would leave. Cancelable.
 * @event {HelixLoadMoreEvent} helix-load-more - Fired when a reader comes within one screen of the last item, once for each length of the set.
 * @event {HelixRangeChangeEvent} helix-range-change - Fired when the items on screen change, with the new `first` and `last`, which `range` also holds.
 *
 * @csspart after - The space that stands in for the rows below the rendered ones.
 * @csspart before - The space that stands in for the rows above the rendered ones.
 * @csspart loading - The row after the last item while `loading` is set.
 * @csspart viewport - The scrolling box. On this tier, it needs only a block size.
 */
@customElement('helix-headless-virtual-list')
export class HelixHeadlessVirtualList extends HelixElement {
  /**
   * How many items a line holds. One, the default, is a list; more lays the
   * items out as a grid of that many equal columns, windowed a line at a
   * time, with Left and Right moving along a line.
   */
  @property({ type: Number })
  columns = 1

  /**
   * The height of one row, in pixels, used to find the row at a scroll offset.
   *
   * An estimate rather than a measurement while `measured` is off, which is
   * right whenever the rows really are one height and is the cheaper of the two.
   */
  @property({ type: Number })
  estimate = 32

  /**
   * The id of the script element that holds the items as JSON. `items` wins
   * where both are set.
   */
  @property()
  for = ''

  /**
   * The items, as an array. Set it as a property.
   *
   * Each item is drawn by `renderItem`, or into the row `<template>` by its
   * fields. A new array draws the new rows, so replace the array to change it.
   * Left unset, the list reads the script that `for` names.
   */
  @property({ attribute: false })
  items: readonly unknown[] | undefined

  /**
   * The field of each item that is its key in `value`, as a key or a path of
   * keys. Empty reads a string or a number item as its own key, and any
   * other item by its place in the set.
   */
  @property({ attribute: 'key-field' })
  keyField = ''

  /**
   * The list's name, read by screen readers, because only some of its rows
   * are rendered at a time.
   *
   * An `aria-label` or `aria-labelledby` on the host names the list too, and
   * wins over this.
   */
  @property()
  label = ''

  /**
   * Marks the list as busy fetching more items, and draws a row after the last
   * item that says so.
   *
   * Set it when `helix-load-more` starts a fetch, and clear it when the items
   * arrive. The list does not ask for more while it is set.
   */
  @property({ type: Boolean })
  loading = false

  /** The text of the row drawn while `loading` is set, where the `loading` slot is empty. */
  @property({ attribute: 'loading-label' })
  loadingLabel = 'Loading more'

  /**
   * Places each row by its own measured height. Without it, rows are placed
   * by one height: `estimate` until rows are drawn, then the drawn rows' height,
   * read once.
   *
   * **Off by default, because the straight line is better when it holds.** One
   * height makes offset and index convert by division, which can never
   * disagree with itself; measuring is what a set of genuinely different
   * heights needs and costs a read of each row as it renders. A list of
   * one-line rows should leave this alone.
   */
  @property({ type: Boolean })
  measured = false

  /**
   * Draws one item into its row, given the item and its index. Set it as a
   * property.
   *
   * It returns what Lit renders: a template from `html`, a string, or a DOM
   * node. The list wraps each result in a `<div>` that carries the row's role
   * and place in the set. Where it is unset, the row `<template>` is used.
   */
  @property({ attribute: false })
  renderItem: VirtualListRenderer | undefined

  /**
   * Makes the list a list box a reader chooses from: `single` selects one
   * item, and `multiple` any number. Unset is a list a reader reads.
   */
  @property({ attribute: 'selection-mode' })
  selectionMode?: 'multiple' | 'single'

  /**
   * The field of each item that typing matches, as a key or a path of keys
   * (`author.name`).
   *
   * Empty by default, which matches the first `data-field` of the row
   * template, or the item itself where it is a string or a number.
   */
  @property({ attribute: 'text-field' })
  textField = ''

  /**
   * The keys of the chosen items, separated by commas, in a list with
   * `selection-mode`. Set it to start with items chosen.
   */
  @property()
  value = ''

  /**
   * The parsed script.
   *
   * Empty on a server, which has nothing to read.
   */
  @state()
  private rows: unknown[] = []

  /** The `for` that `rows` came from, so it is read again only when that changes. */
  private readFor: string | undefined

  /** The items the drawn rows were filled from, so new data fills them again. */
  private filledFrom: readonly unknown[] | undefined

  /** The function the drawn rows were filled by, so a new one draws them again. */
  private filledBy: VirtualListRenderer | undefined

  /** The script the rows were read from, which the watcher follows. */
  private source: Element | null = null

  /**
   * The item whose row holds the tab stop.
   *
   * A plain field, because the pass that places the rows is the one that keeps
   * it on a drawn row and writes the `tabindex` that follows from it.
   */
  private active = 0

  /** The item whose row's own controls are in the tab order. */
  private released: number | undefined

  /** The range last reported, so `helix-range-change` fires only on a change. */
  private said: VirtualListRange = { first: 0, last: 0 }

  /** The letters typed at the list, which move to the item they start. */
  private readonly typeahead = new Typeahead()

  /** The key of the item a Shift range runs from: the last one chosen. */
  private anchor: string | undefined

  /**
   * Watches the source and the tree around it.
   *
   * **The list read its source once per `for`**, so a page that wrote new JSON
   * into the script, the way a framework updates a text child, kept the old
   * rows. The script's own text is watched, and the tree it sits in, for a
   * script replaced under the same id.
   */
  private watcher: MutationObserver | undefined

  /** Carries a host `aria-label` and `aria-labelledby` to the element with the `list` role. */
  protected readonly aria = new AriaForwardController(this, {
    label: true,
    target: () => this.partNamed('viewport'),
  })

  /* No `overscan` property. The controller's four is a frame of fast scrolling
     at a 32 pixel row, which is a fact about the platform rather than a
     preference. */
  /* Windowed by lines, which are the items themselves in a list. */
  private readonly virtualize = new VirtualizeController(this, {
    container: () => this.partNamed('viewport'),
    count: () => Math.ceil(this.data.length / this.across),
    estimate: () => this.estimate,
    measured: () => this.measured,
    rows: () => this.lines(),
  })

  /**
   * The items on screen, as `items.slice(first, last)` reads them.
   *
   * Read from the scroll offset when asked. Both are 0 before the list has a
   * box to measure.
   */
  get range(): VirtualListRange {
    return this.itemsOn(this.virtualize.visible())
  }

  /** How many items a line holds: `columns`, at least one. */
  private get across(): number {
    return Math.max(1, Math.trunc(this.columns) || 1)
  }

  /** The items a span of lines holds. */
  private itemsOn(lines: { first: number; last: number }): VirtualListRange {
    return itemsOf(lines, this.across, this.data.length)
  }

  /**
   * Scrolls the list to show the item at `index`.
   *
   * By default the least distance that shows it whole. `align` puts it at the
   * `start`, `center` or `end` of the box, and `behavior: 'smooth'` animates the
   * scroll. An index past either end goes to the first or the last item.
   */
  scrollToIndex(index: number, options: VirtualListScrollOptions = {}): void {
    const count = this.data.length
    if (count === 0 || !Number.isFinite(index)) {
      return
    }
    const at = Math.max(0, Math.min(Math.trunc(index), count - 1))
    this.virtualize.reveal(Math.floor(at / this.across), 0, options)
    this.virtualize.measure()
  }

  /** The items in force: `items` where it is set, and the script otherwise. */
  private get data(): readonly unknown[] {
    return this.items ?? this.rows
  }

  /**
   * The rows in the tree, each with the item it drew.
   *
   * **Read off `data-index` rather than counted**, because what is in the tree
   * when the controller asks is what `place` appended on the *previous* pass:
   * `hostUpdated` runs before `updated`, so counting from the current window
   * would record the right heights against the wrong items every time the
   * window moved.
   */
  private drawn(): Rendered[] {
    return [...this.querySelectorAll<HTMLElement>(':scope > [data-index]')].map((element) => ({
      element,
      index: Number(element.dataset.index),
    }))
  }

  /**
   * The drawn lines, for the controller to measure: each row in a list, and
   * the first item of each line in a grid, whose cell is as tall as its line.
   */
  private lines(): Rendered[] {
    const across = this.across
    const drawn = this.drawn()
    return across === 1
      ? drawn
      : drawn
          .filter(({ index }) => index % across === 0)
          .map(({ element, index }) => ({ element, index: index / across }))
  }

  /**
   * Reads the source named by `for`, before the render that draws it.
   *
   * **Resolved through `getRootNode()`, so a list inside another component's
   * shadow root names a source in that root rather than in the page.** Read
   * against `ownerDocument` it looked in the document whatever tree it was in,
   * and found nothing from inside an app shell or a sandbox, which is
   * indistinguishable here from the miss this tolerates on purpose.
   *
   * Not on the server, per the server rules: the shim has attributes and no
   * tree to look an id up in. Nor while hydrating what a server sent, which it
   * drew with nothing read. A source that is missing or
   * not an array leaves the list empty rather than throwing, because a consumer
   * whose data has not arrived yet is the ordinary case and an empty list says
   * so by itself.
   */
  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    if (this.readFor !== this.for && searchableById(this) && !this.hydrating) {
      this.readFor = this.for
      this.read()
    }
  }

  override connectedCallback(): void {
    super.connectedCallback()
    /* On the host, because the rows are light DOM and their events reach it
       without crossing a shadow boundary. */
    this.addEventListener('keydown', this.handleKeydown)
    this.addEventListener('click', this.handleClick)
    this.addEventListener('focusin', this.handleFocusIn)
    this.addEventListener('focusout', this.handleFocusOut)
    if (typeof MutationObserver === 'undefined') {
      return
    }
    this.watcher = new MutationObserver((records) => this.handleMutations(records))
    /* Connected, so the root is the document or a shadow root. */
    this.watcher.observe(this.getRootNode(), {
      characterData: true,
      childList: true,
      subtree: true,
    })
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('keydown', this.handleKeydown)
    this.removeEventListener('click', this.handleClick)
    this.removeEventListener('focusin', this.handleFocusIn)
    this.removeEventListener('focusout', this.handleFocusOut)
    this.watcher?.disconnect()
    this.watcher = undefined
  }

  /**
   * Reads the source again when its text changed or another element took its
   * id. Rows this list drew are its own writes and are not news.
   */
  private handleMutations(records: MutationRecord[]): void {
    if (this.for === '' || this.hydrating || this.readFor === undefined) {
      return
    }
    const found = elementById(this, this.for)
    const edited = records.some(
      (record) => found !== null && (record.target === found || found.contains(record.target)),
    )
    if (found !== this.source || edited) {
      this.read()
    }
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated?.(changed)
    this.finishHydration()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated?.(changed)
    this.virtualize.measure()
    this.place()
    this.report()
  }

  private read(): void {
    const source = this.for === '' ? null : elementById(this, this.for)
    this.source = source
    const text = source?.textContent ?? ''
    if (text.trim() === '') {
      this.rows = []
      return
    }
    try {
      const parsed: unknown = JSON.parse(text)
      this.rows = Array.isArray(parsed) ? parsed : []
    } catch {
      /* Left empty rather than thrown. The source is a consumer's markup, and a
         component that throws on it takes the page down over a comma. */
      this.rows = []
    }
  }

  /**
   * Fires `helix-range-change` when the items on screen moved, and
   * `helix-load-more` when a reader is within one screen of the end.
   *
   * After a render and on every scroll, which are the two times either can
   * change. `helix-load-more` waits for a box with a height, so a list that
   * has not been laid out yet asks for nothing.
   */
  private report(): void {
    const { first, last } = this.range
    if (first !== this.said.first || last !== this.said.last) {
      this.said = { first, last }
      this.dispatchEvent(new HelixRangeChangeEvent({ first, last }))
    }
    if (!this.loading && this.virtualize.endInSight()) {
      this.dispatchEvent(new HelixLoadMoreEvent())
    }
  }

  /**
   * The text typing matches for each item: `text-field`, the template's first
   * `data-field`, or a string or number item itself.
   */
  private texts(): string[] {
    const field =
      this.textField ||
      this.querySelector<HTMLTemplateElement>(':scope > template')
        ?.content.querySelector('[data-field]')
        ?.getAttribute('data-field') ||
      ''
    return textsOf(this.data, field)
  }

  /** The item a row element drew, for an element that is one of the rows. */
  private indexOf(node: EventTarget | null): number | undefined {
    if (!(node instanceof HTMLElement) || node.parentElement !== this) {
      return undefined
    }
    const index = node.dataset.index
    return index === undefined ? undefined : Number(index)
  }

  /** The row that holds the tab stop for item `index`, where it is drawn. */
  private rowFor(index: number): HTMLElement | null {
    return this.querySelector<HTMLElement>(`:scope > [data-index="${index}"]`)
  }

  /**
   * Moves between items with the keys `stepIndex` names.
   *
   * Only from a row itself. A key pressed in a row's own link, button or field
   * is that control's, so a field in a row keeps its arrows.
   */
  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (event.defaultPrevented) {
      return
    }
    const at = this.indexOf(event.target)
    if (at === undefined) {
      return
    }
    /* Space only continues a word, so a row's own use of it is left alone. */
    if (typesCharacter(event) && (event.key !== ' ' || this.typeahead.typing())) {
      const found = this.typeahead.match(event.key, this.texts(), at)
      event.preventDefault()
      if (found >= 0 && found !== at) {
        void this.focusIndex(found)
      }
      return
    }
    const toggle = event.ctrlKey || event.metaKey
    if (this.selectionMode && !event.altKey) {
      if (toggle && event.key.toLowerCase() === 'a' && this.selectionMode === 'multiple') {
        event.preventDefault()
        this.choose(this.keys().join(','))
        return
      }
      if (event.key === ' ' && !toggle) {
        event.preventDefault()
        this.press(at, event.shiftKey)
        return
      }
    }
    const extend = event.shiftKey && this.selectionMode === 'multiple'
    if (event.altKey || toggle || (event.shiftKey && !extend)) {
      return
    }
    const { first, last } = this.virtualize.visible()
    const next = stepIndex(event.key, at, this.data.length, last - first - 1, {
      across: this.across,
      forward: isRtl(this) ? 'ArrowLeft' : 'ArrowRight',
    })
    if (next === undefined) {
      return
    }
    event.preventDefault()
    void this.focusIndex(next)
    if (extend) {
      this.anchor ??= this.keyAt(at)
      this.press(next, true)
    }
  }

  /** The key of item `at` in `value`. See `keyField`. */
  private keyAt(at: number): string {
    return keyOf(this.data[at], at, this.keyField)
  }

  /** Every item's key, in the order of the set. */
  private keys(): string[] {
    return this.data.map((_, at) => this.keyAt(at))
  }

  /** The keys chosen now. */
  private get chosen(): Set<string> {
    return new Set(commaList(this.value))
  }

  /**
   * Selects item `at`, or lets it go, asking first. With `extend`, in
   * `multiple`, the items from the anchor to it are taken in, as Data Table
   * and List take in a range. Otherwise the item is where the next range runs
   * from.
   */
  private press(at: number, extend = false): void {
    const mode = this.selectionMode
    const key = this.keyAt(at)
    if (!mode || at < 0 || at >= this.data.length) {
      return
    }
    const now = commaList(this.value)
    if (extend && mode === 'multiple') {
      const keys = this.keys()
      const from = this.anchor === undefined ? -1 : keys.indexOf(this.anchor)
      const range = rangeAdd(now, keys, from, at)
      if (range) {
        this.choose(this.inOrder(range))
      }
      return
    }
    this.anchor = key
    if (mode === 'single') {
      this.choose(now.length === 1 && now[0] === key ? '' : key)
      return
    }
    this.choose(this.inOrder(toggleValue(now, key)))
  }

  /** Keys in the order of the set, a key it no longer holds kept after them. */
  private inOrder(keys: readonly string[]): string {
    const wanted = new Set(keys)
    const ordered = this.keys().filter((key) => wanted.has(key))
    const placed = new Set(ordered)
    return [...ordered, ...keys.filter((key) => !placed.has(key))].join(',')
  }

  /** Asks for a new `value`, and says so once it has moved. */
  private choose(next: string): void {
    if (next === this.value) {
      return
    }
    requestChange({
      apply: (value) => {
        this.value = value
        this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
      },
      event: (value) => new HelixBeforeChangeEvent({ value }),
      host: this,
      next,
    })
  }

  /**
   * A press on a row selects it, in a list with `selection-mode`, except on a
   * control of its own. Shift takes in a range.
   */
  private readonly handleClick = (event: MouseEvent): void => {
    if (!this.selectionMode) {
      return
    }
    const path = event.composedPath()
    const row = path.find(
      (node): node is HTMLElement => node instanceof HTMLElement && node.parentElement === this,
    )
    const at = this.indexOf(row ?? null)
    if (at === undefined) {
      return
    }
    const inner = path.slice(0, path.indexOf(row as HTMLElement))
    if (
      inner.some(
        (node) =>
          node instanceof HTMLElement &&
          node.matches('a[href], button, input, select, textarea, label'),
      )
    ) {
      return
    }
    this.press(at, event.shiftKey && this.selectionMode === 'multiple')
  }

  /**
   * Focuses the row for item `index`, scrolling it into view and drawing it
   * first when it is not drawn.
   */
  private async focusIndex(index: number): Promise<void> {
    this.active = index
    /* Drawn whether or not the window reaches it. Placed by the estimate, the
       window can stop short of a row once the rows it measured turn out
       shorter: in Chromium, End on 5000 rows of 18px drew 4983 to 4996. */
    this.focusing = index
    this.virtualize.reveal(Math.floor(index / this.across))
    this.virtualize.measure()
    this.requestUpdate()
    try {
      await this.updateComplete
    } finally {
      this.focusing = undefined
    }
    /* Focus scrolls the row the rest of the way: placed by the estimate, a
       measured row can land short of the edge once its real height is known. */
    this.rowFor(index)?.focus()
  }

  /** The row kept for focus is let go once focus has left it. */
  private readonly handleFocusOut = (): void => {
    this.requestUpdate()
  }

  /** A row that takes focus, by a press or by Tab, takes the tab stop with it. */
  private readonly handleFocusIn = (event: FocusEvent): void => {
    let node = event.target as Node | null
    while (node && node.parentNode !== this) {
      node = node.parentNode
    }
    const index = this.indexOf(node)
    if (index !== undefined) {
      this.active = index
    }
    this.requestUpdate()
  }

  /**
   * The item whose row holds focus, where one does.
   *
   * Asked of the root this list is in, which retargets focus inside a row's
   * own shadow root to the row's element.
   */
  private focusedIndex(): number | undefined {
    const root = this.getRootNode() as Document | ShadowRoot
    let node = root.activeElement as Element | null
    while (node && node.parentElement !== this) {
      node = node.parentElement
    }
    const index = node instanceof HTMLElement ? node.dataset.index : undefined
    return index === undefined ? undefined : Number(index)
  }

  /** The item a key is moving focus to, drawn until it has it. */
  private focusing: number | undefined

  /** The item drawn outside the window to keep focus, or to take it, if there is one. */
  private keptIndex(): number | undefined {
    const index = this.focusing ?? this.focusedIndex()
    const { first, last } = this.itemsOn(this.virtualize.window)
    return index !== undefined && index < this.data.length && (index < first || index >= last)
      ? index
      : undefined
  }

  /**
   * Writes a row's role, and whether it is chosen in a list that selects:
   * `option` with `aria-selected` there, and `listitem` otherwise. Every pass,
   * since a choice changes no row's content.
   */
  private mark(element: Element, at: number, chosen: ReadonlySet<string>): void {
    element.setAttribute('role', this.selectionMode ? 'option' : 'listitem')
    if (this.selectionMode) {
      element.setAttribute('aria-selected', String(chosen.has(this.keyAt(at))))
    } else {
      element.removeAttribute('aria-selected')
    }
  }

  /** Writes a row's place in the set. */
  private stamp(element: Element, at: number): void {
    /* The real index and the real total, not the position in the window. A
       reader arrowing through this should hear where they are in the set. */
    element.setAttribute('aria-posinset', String(at + 1))
    element.setAttribute('aria-setsize', String(this.data.length))
    /* Which item this drew, for the controller to measure it against. The
       real index, the same one `aria-posinset` carries one higher. */
    element.setAttribute('data-index', String(at))
  }

  /** Fills a drawn row from its item, by `renderItem` or by the template's holes. */
  private fill(elements: Element[], at: number): void {
    const item = this.data[at]
    for (const element of elements) {
      if (this.renderItem) {
        render(this.renderItem(item, at), element as HTMLElement)
      } else {
        fillHoles(element, item)
      }
      this.stamp(element, at)
    }
  }

  /** New elements for item `at`: a `<div>` for `renderItem`, or the template's clone. */
  private draw(template: HTMLTemplateElement | null, at: number): DocumentFragment {
    const fragment = document.createDocumentFragment()
    if (this.renderItem) {
      fragment.append(document.createElement('div'))
    } else if (template) {
      fragment.append(template.content.cloneNode(true))
    }
    this.fill([...fragment.children], at)
    return fragment
  }

  /**
   * Puts the windowed rows into the light DOM, and takes the rest out.
   *
   * **A row that stays in the window keeps its element.** Clearing and
   * cloning every row on every move replaced the node a reader had focused,
   * so a link in a row lost focus to the body on any scroll, even with its row
   * still on screen. Rows are keyed by item: the ones leaving go, the ones
   * arriving are drawn in their place, and the ones staying are not moved.
   *
   * **The row holding focus is drawn outside the window too**, beside it on the
   * side it belongs, and the spacer on that side gives up its room.
   *
   * **One row holds the tab stop**, the one the reader last focused while it is
   * drawn, and the first row on screen once it is not. Its own links and
   * buttons are in the tab order, and those of every other row wait.
   */
  private place(): void {
    const template = this.querySelector<HTMLTemplateElement>(':scope > template')
    if (!template && !this.renderItem) {
      return
    }
    const count = this.data.length
    const { first, last } = this.itemsOn(this.virtualize.window)
    /* A child given a slot of its own, such as `loading`, is the consumer's. */
    const children = [...this.children].filter(
      (child): child is HTMLElement =>
        child !== template && child instanceof HTMLElement && !child.hasAttribute('slot'),
    )
    const plan = drawPlan({
      across: this.across,
      count,
      drawn: children.map((child) => Number(child.dataset.index)),
      first,
      kept: this.keptIndex(),
      last,
      /* A row drawn the other way, by the template or by the function, is
         drawn again from nothing: its markup is not the other's to fill. */
      redraw: (this.filledBy === undefined) !== (this.renderItem === undefined),
    })
    const drawn = new Map<number, Element[]>()
    for (const child of children) {
      const index = Number(child.dataset.index)
      if (plan.remove.has(index)) {
        child.remove()
        continue
      }
      drawn.set(index, [...(drawn.get(index) ?? []), child])
    }
    const refill = this.filledFrom !== this.data || this.filledBy !== this.renderItem
    this.filledFrom = this.data
    this.filledBy = this.renderItem
    /* Rows drawn or filled on this pass, whose controls are new to the tab order. */
    const fresh = new Set<number>()
    let anchor: Element | null = drawn.values().next().value?.[0] ?? null
    for (const at of plan.wanted) {
      const group = drawn.get(at)
      if (group) {
        if (refill) {
          this.fill(group, at)
          fresh.add(at)
        }
        anchor = (group.at(-1) as Element).nextElementSibling
        continue
      }
      const fragment = this.draw(template, at)
      drawn.set(at, [...fragment.children])
      fresh.add(at)
      this.insertBefore(fragment, anchor)
    }
    this.active = stopAfter(this.active, plan.wanted, {
      count,
      first,
      last,
      onScreen: this.range.first,
    })
    const chosen = this.chosen
    for (const [at, group] of drawn) {
      for (const element of group) {
        this.mark(element, at, chosen)
      }
      const stop = at === this.active
      group[0]?.setAttribute('tabindex', stop ? '0' : '-1')
      if (stop && (fresh.has(at) || this.released !== at)) {
        releaseControls(group)
      } else if (!stop && (fresh.has(at) || this.released === at)) {
        holdControls(group)
      }
    }
    this.released = this.active
  }

  protected override render(): TemplateResult {
    /* The line kept for focus takes its own room out of the spacer on its side. */
    const kept = this.hasUpdated ? this.keptIndex() : undefined
    const { after, before } = this.virtualize.spacers(
      kept === undefined ? undefined : Math.floor(kept / this.across),
    )
    const across = this.across
    return html`<div
      data-scroller
      part="viewport"
      role=${this.selectionMode ? 'listbox' : 'list'}
      aria-multiselectable=${this.selectionMode === 'multiple' ? 'true' : nothing}
      aria-busy=${this.loading ? 'true' : nothing}
      aria-label=${this.label}
      @scroll=${() => {
        this.virtualize.measure()
        this.report()
      }}
    >
      <div part="before" style="block-size: ${before}px"></div>
      <slot
        style=${
          across === 1
            ? nothing
            : `display: grid; grid-template-columns: repeat(${across}, minmax(0, 1fr))`
        }
      ></slot>
      <div part="after" style="block-size: ${after}px"></div>
      ${
        /* An item of the list that is not one of the set, so it carries no
           place in it, as React Aria's loading row does. */
        this.loading
          ? html`<div part="loading" role=${this.selectionMode ? 'option' : 'listitem'}>
              <slot name="loading">${this.loadingLabel}</slot>
            </div>`
          : nothing
      }
    </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-virtual-list': HelixHeadlessVirtualList
  }
}
