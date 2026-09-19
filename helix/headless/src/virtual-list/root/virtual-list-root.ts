import {
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
 * @summary Renders the rows of a long set that are on screen, and no others.
 *
 * @description
 * **The set arrives as data, which is what makes this a virtual list rather
 * than a box that hides children.** `for` names a
 * `<script type="application/json">` holding an array of objects, and a
 * `<template>` child says what one row looks like: elements carrying
 * `data-field="name"` are filled with that field of the item.
 *
 * Both halves are markup, and that is the reason for the shape. An `items`
 * property cannot survive React hydration, which skips every property it would
 * have to apply imperatively, and light-DOM children exist by the time anything
 * could decide not to create them. Text in the document is neither, and it is
 * one node whatever the row count.
 *
 * **The accessible version is not a `<table>`**, the way it is for the charts
 * that share this `for="<id>"` shape: ten thousand rows in one is the cost this
 * exists to avoid. It is the rendered window plus `aria-setsize`.
 *
 * **The box scrolls on this tier.** The viewport carries `data-scroller` and
 * `core` ships `[data-scroller] { overflow: auto }` into every shadow root, so
 * `scrollTop` exists with no stylesheet at all. What a headless consumer still
 * has to supply is a block size, which is a design decision; the `overflow`
 * they used to supply was a mechanism they had no way of knowing was missing.
 *
 * @since 0.1.0
 * @status stable
 * @category layout
 * @documentation https://fusion.dev/helix/components/virtual-list
 *
 * @csspart after - The space standing in for rows below the window.
 * @csspart before - The space standing in for rows above the window.
 * @csspart viewport - The scrolling box. Needs a block size on this tier, and nothing else.
 */
@customElement('helix-headless-virtual-list')
export class HelixHeadlessVirtualList extends HelixElement {
  /**
   * How tall one row is, in pixels, used to map scroll offset to an index.
   *
   * An estimate rather than a measurement while `measured` is off, which is
   * right whenever the rows really are one height and is the cheaper of the two.
   */
  @property({ type: Number })
  estimate = 32

  /**
   * Id of the element holding the rows, as JSON in a script.
   */
  @property()
  for = ''

  /**
   * What the list is called, since the rendered rows are only a window on it.
   */
  @property()
  label = ''

  /**
   * Places rows by what they came to rather than by `estimate`.
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
   * Puts the windowed rows into the light DOM, and takes the rest out.
   *
   * Cleared and re-cloned rather than reconciled: a window is twenty-odd rows
   * and cloning that many is well under a frame. A reconciler here would carry
   * keys and identity for a set nothing selects into.
   */
  private place(): void {
    const template = this.querySelector('template')
    if (!template) {
      return
    }
    for (const stale of [...this.children]) {
      if (stale !== template) {
        stale.remove()
      }
    }
    const { first, last } = this.virtualize.window
    const total = this.rows.length
    const fragment = this.ownerDocument.createDocumentFragment()
    for (let at = first; at < last; at += 1) {
      const row = this.rows[at]
      if (!row) {
        continue
      }
      const clone = template.content.cloneNode(true) as DocumentFragment
      for (const hole of clone.querySelectorAll<HTMLElement>('[data-field]')) {
        hole.textContent = row[hole.dataset.field ?? ''] ?? ''
      }
      /* The real index and the real total, not the position in the window. A
         reader arrowing through this should hear where they are in the set. */
      for (const element of clone.children) {
        element.setAttribute('role', 'listitem')
        element.setAttribute('aria-posinset', String(at + 1))
        element.setAttribute('aria-setsize', String(total))
        /* Which item this drew, for the controller to measure it against. The
           real index, the same one `aria-posinset` carries one higher. */
        element.setAttribute('data-index', String(at))
      }
      fragment.append(clone)
    }
    this.append(fragment)
  }

  protected override render(): TemplateResult {
    const { after, before } = this.virtualize.window
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
