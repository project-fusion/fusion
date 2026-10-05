import {
  AriaForwardController,
  customElement,
  elementById,
  HelixElement,
  searchableById,
  VirtualizeController,
} from '@fusion.dev/helix-core'
import { html, type PropertyValues, render, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { holdControls, releaseControls } from '../controls.js'
import { fillHoles } from '../fill.js'
import { stepIndex } from '../keys.js'

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
 * **Keyboard.** The list is one tab stop. Up and Down move between items, Home
 * and End go to the first and the last, and Page Up and Page Down move by a
 * screen. An item that is not drawn is scrolled into view and focused, so a
 * keyboard reaches the whole set. Tab moves on into the focused row's own links
 * and buttons. When the row holding the tab stop scrolls away, the stop moves
 * to the first row on screen.
 *
 * Each row says its place in the whole set with `aria-posinset` and
 * `aria-setsize`, so a screen reader says "4,000 of 10,000". The row holding
 * focus stays drawn when it scrolls out.
 *
 * **Loading more.** `helix-range-change` fires as the items on screen change,
 * and `range` holds them. `helix-load-more` fires once a reader is within one
 * screen of the end, once for each length of the set: add to `items` and it can
 * fire again. `scrollToIndex` takes a reader to an item.
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
 *
 * @event {Event} helix-load-more - Fired when a reader comes within one screen of the last item, once for each length of the set.
 * @event {Event} helix-range-change - Fired when the items on screen change. `range` holds them.
 *
 * @csspart after - The space that stands in for the rows below the rendered ones.
 * @csspart before - The space that stands in for the rows above the rendered ones.
 * @csspart viewport - The scrolling box. On this tier, it needs only a block size.
 */
@customElement('helix-headless-virtual-list')
export class HelixHeadlessVirtualList extends HelixElement {
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
   * The list's name, read by screen readers, because only some of its rows
   * are rendered at a time.
   *
   * An `aria-label` or `aria-labelledby` on the host names the list too, and
   * wins over this.
   */
  @property()
  label = ''

  /**
   * Places rows by their measured height. Without it, every row is placed by
   * `estimate`.
   *
   * **Off by default, because the straight line is better when it holds.** One
   * estimate makes offset and index convert by division, which can never
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

  /** The length of the set when `helix-load-more` last fired. */
  private askedAt = -1

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
  private readonly virtualize = new VirtualizeController(this, {
    container: () => this.partNamed('viewport'),
    count: () => this.data.length,
    estimate: () => this.estimate,
    measured: () => this.measured,
    rows: () => this.drawn(),
  })

  /**
   * The items on screen, as `items.slice(first, last)` reads them.
   *
   * Read from the scroll offset when asked. Both are 0 before the list has a
   * box to measure.
   */
  get range(): VirtualListRange {
    return this.virtualize.visible()
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
    this.virtualize.reveal(Math.max(0, Math.min(Math.trunc(index), count - 1)), 0, options)
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
  private drawn(): { element: HTMLElement; index: number }[] {
    return [...this.querySelectorAll<HTMLElement>(':scope > [data-index]')].map((element) => ({
      element,
      index: Number(element.dataset.index),
    }))
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
    const { first, last } = this.virtualize.visible()
    if (first !== this.said.first || last !== this.said.last) {
      this.said = { first, last }
      this.dispatchEvent(new Event('helix-range-change', { bubbles: true, composed: true }))
    }
    const box = this.partNamed('viewport')
    const count = this.data.length
    const screen = box?.clientHeight ?? 0
    if (
      count > 0 &&
      screen > 0 &&
      this.askedAt !== count &&
      this.virtualize.remaining() <= screen
    ) {
      this.askedAt = count
      this.dispatchEvent(new Event('helix-load-more', { bubbles: true, composed: true }))
    }
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
    if (
      event.defaultPrevented ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey
    ) {
      return
    }
    const at = this.indexOf(event.target)
    if (at === undefined) {
      return
    }
    const { first, last } = this.virtualize.visible()
    const next = stepIndex(event.key, at, this.data.length, last - first - 1)
    if (next === undefined) {
      return
    }
    event.preventDefault()
    void this.focusIndex(next)
  }

  /**
   * Focuses the row for item `index`, scrolling it into view and drawing it
   * first when it is not drawn.
   */
  private async focusIndex(index: number): Promise<void> {
    this.active = index
    this.virtualize.reveal(index)
    this.virtualize.measure()
    this.requestUpdate()
    await this.updateComplete
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

  /** The item drawn outside the window to keep focus, if there is one. */
  private keptIndex(): number | undefined {
    const index = this.focusedIndex()
    const { first, last } = this.virtualize.window
    return index !== undefined && index < this.data.length && (index < first || index >= last)
      ? index
      : undefined
  }

  /** Writes a row's role and its place in the set. */
  private stamp(element: Element, at: number): void {
    /* The real index and the real total, not the position in the window. A
       reader arrowing through this should hear where they are in the set. */
    element.setAttribute('role', 'listitem')
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
    const { first, last } = this.virtualize.window
    const kept = this.keptIndex()
    const wanted: number[] = []
    for (let at = first; at < Math.min(last, count); at += 1) {
      wanted.push(at)
    }
    if (kept !== undefined) {
      wanted.push(kept)
      wanted.sort((a, b) => a - b)
    }
    const keep = new Set(wanted)
    /* A row drawn the other way, by the template or by the function, is
       drawn again from nothing: its markup is not the other's to fill. */
    const redraw = (this.filledBy === undefined) !== (this.renderItem === undefined)
    const drawn = new Map<number, Element[]>()
    for (const child of [...this.children]) {
      if (child === template) {
        continue
      }
      const index = Number((child as HTMLElement).dataset.index)
      if (redraw || !Number.isInteger(index) || !keep.has(index)) {
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
    for (const at of wanted) {
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
    if (!keep.has(this.active)) {
      const onScreen = this.virtualize.visible().first
      this.active = Math.max(Math.min(onScreen, Math.min(last, count) - 1), first, 0)
    }
    for (const [at, group] of drawn) {
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
    /* The row kept for focus takes its own room out of the spacer on its side. */
    const { after, before } = this.virtualize.spacers(
      this.hasUpdated ? this.keptIndex() : undefined,
    )
    return html`<div
      data-scroller
      part="viewport"
      role="list"
      aria-label=${this.label}
      @scroll=${() => {
        this.virtualize.measure()
        this.report()
      }}
    >
      <div part="before" style="block-size: ${before}px"></div>
      <slot></slot>
      <div part="after" style="block-size: ${after}px"></div>
    </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-virtual-list': HelixHeadlessVirtualList
  }
}
