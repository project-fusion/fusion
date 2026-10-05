import {
  AriaForwardController,
  customElement,
  elementById,
  HelixElement,
  searchableById,
  VirtualizeController,
} from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'

/** One record read out of the source, which is a flat map of field to text. */
type Row = Record<string, string>

/**
 * @summary A list that renders only the rows of a long set that are on screen.
 *
 * @description
 * The items arrive as data:
 *
 * - `for` names a `<script type="application/json">` that holds an array of
 *   objects.
 * - A `<template>` child defines one row. Elements with `data-field="name"` are
 *   filled with that field of the item.
 *
 * Both are markup. React hydration skips every property it would have to set
 * imperatively, so an `items` property would be lost, and light-DOM children
 * would all exist before anything could window them. The JSON text is one node
 * whatever the row count.
 *
 * For assistive technology the list exposes the rendered window with
 * `aria-setsize`. Charts that use the same `for="<id>"` shape render an
 * accessible `<table>`, and ten thousand rows in one is the cost this component
 * avoids.
 *
 * The list follows the source: editing the script's text, or replacing the
 * script under the same id, draws the new rows. A row that stays in view keeps
 * its element as the list scrolls, and the row holding focus stays drawn when
 * it scrolls out, so a link or a button in a row keeps focus.
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
   * The id of the script element that holds the rows as JSON.
   */
  @property()
  for = ''

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
   * The parsed source.
   *
   * Empty on a server, which has nothing to read.
   */
  @state()
  private rows: Row[] = []

  /** The `for` that `rows` came from, so it is read again only when that changes. */
  private readFor: string | undefined

  /** The rows the drawn elements were filled from, so new data fills them again. */
  private filledFrom: Row[] | undefined

  /** The script the rows were read from, which the watcher follows. */
  private source: Element | null = null

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
    count: () => this.rows.length,
    estimate: () => this.estimate,
    measured: () => this.measured,
    rows: () => this.drawn(),
  })

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
    return [...this.querySelectorAll<HTMLElement>('[data-index]')].map((element) => ({
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
      this.rows = Array.isArray(parsed) ? (parsed as Row[]) : []
    } catch {
      /* Left empty rather than thrown. The source is a consumer's markup, and a
         component that throws on it takes the page down over a comma. */
      this.rows = []
    }
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
    return index !== undefined && index < this.rows.length && (index < first || index >= last)
      ? index
      : undefined
  }

  /** Fills a row's holes and its place in the set from an item. */
  private fill(elements: Element[], row: Row, at: number): void {
    const total = String(this.rows.length)
    for (const element of elements) {
      for (const hole of [
        ...(element.matches('[data-field]') ? [element as HTMLElement] : []),
        ...element.querySelectorAll<HTMLElement>('[data-field]'),
      ]) {
        hole.textContent = row[hole.dataset.field ?? ''] ?? ''
      }
      /* The real index and the real total, not the position in the window. A
         reader arrowing through this should hear where they are in the set. */
      element.setAttribute('role', 'listitem')
      element.setAttribute('aria-posinset', String(at + 1))
      element.setAttribute('aria-setsize', total)
      /* Which item this drew, for the controller to measure it against. The
         real index, the same one `aria-posinset` carries one higher. */
      element.setAttribute('data-index', String(at))
    }
  }

  /**
   * Puts the windowed rows into the light DOM, and takes the rest out.
   *
   * **A row that stays in the window keeps its element.** Clearing and
   * cloning every row on every move replaced the node a reader had focused,
   * so a link in a row lost focus to the body on any scroll, even with its row
   * still on screen. Rows are keyed by item: the ones leaving go, the ones
   * arriving are cloned in their place, and the ones staying are not moved.
   *
   * **The row holding focus is drawn outside the window too**, beside it on the
   * side it belongs, and the spacer on that side gives up its room.
   */
  private place(): void {
    const template = this.querySelector('template')
    if (!template) {
      return
    }
    const { first, last } = this.virtualize.window
    const kept = this.keptIndex()
    const wanted: number[] = []
    for (let at = first; at < Math.min(last, this.rows.length); at += 1) {
      wanted.push(at)
    }
    if (kept !== undefined) {
      wanted.push(kept)
      wanted.sort((a, b) => a - b)
    }
    const keep = new Set(wanted)
    const drawn = new Map<number, Element[]>()
    for (const child of [...this.children]) {
      if (child === template) {
        continue
      }
      const index = Number((child as HTMLElement).dataset.index)
      if (!Number.isInteger(index) || !keep.has(index)) {
        child.remove()
        continue
      }
      drawn.set(index, [...(drawn.get(index) ?? []), child])
    }
    const refill = this.filledFrom !== this.rows
    this.filledFrom = this.rows
    let anchor: Element | null = drawn.values().next().value?.[0] ?? null
    for (const at of wanted) {
      const row = this.rows[at] as Row
      const group = drawn.get(at)
      if (group) {
        if (refill) {
          this.fill(group, row, at)
        }
        anchor = (group.at(-1) as Element).nextElementSibling
        continue
      }
      const clone = template.content.cloneNode(true) as DocumentFragment
      this.fill([...clone.children], row, at)
      this.insertBefore(clone, anchor)
    }
  }

  protected override render(): TemplateResult {
    const window = this.virtualize.window
    /* The row kept for focus takes its own room out of the spacer on its side. */
    const kept = this.hasUpdated ? this.keptIndex() : undefined
    const room = kept === undefined ? 0 : this.virtualize.sizeOf(kept)
    const before = window.before - (kept !== undefined && kept < window.first ? room : 0)
    const after = window.after - (kept !== undefined && kept >= window.last ? room : 0)
    return html`<div
      data-scroller
      part="viewport"
      role="list"
      aria-label=${this.label}
      @scroll=${() => this.virtualize.measure()}
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
