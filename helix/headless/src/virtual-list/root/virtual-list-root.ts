import { customElement, HelixElement, VirtualizeController } from '@fusion.dev/helix-core'
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
 * @since 0.1.0
 * @status experimental
 * @category layout
 * @documentation https://helix.fusion.dev/components/virtual-list
 *
 * @csspart after - The space standing in for rows below the window.
 * @csspart before - The space standing in for rows above the window.
 * @csspart viewport - The scrolling box. Needs a block size and an overflow on this tier.
 */
@customElement('helix-headless-virtual-list')
export class HelixHeadlessVirtualList extends HelixElement {
  /**
   * How tall one row is, in pixels, used to map scroll offset to an index.
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
   * The parsed source.
   *
   * Empty on a server, which has nothing to read.
   */
  @state()
  private rows: Row[] = []

  /* No `overscan` property. The controller's four is a frame of fast scrolling
     at a 32 pixel row, which is a fact about the platform rather than a
     preference. */
  private readonly virtualize = new VirtualizeController(this, {
    container: () => this.renderRoot.querySelector<HTMLElement>('[part="viewport"]'),
    count: () => this.rows.length,
    estimate: () => this.estimate,
  })

  /**
   * Reads the source named by `for`, once the document exists to read.
   *
   * `firstUpdated` rather than `connectedCallback`, per the server rules: the
   * shim has attributes and no tree, so `getElementById` is undefined there.
   * A source that is missing or not an array leaves the list empty rather than
   * throwing, because a consumer whose data has not arrived yet is the ordinary
   * case and an empty list says so by itself.
   */
  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated?.(changed)
    this.read()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated?.(changed)
    if (changed.has('for')) {
      this.read()
    }
    this.virtualize.measure()
    this.place()
  }

  private read(): void {
    const source = this.for === '' ? null : this.ownerDocument.getElementById(this.for)
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
