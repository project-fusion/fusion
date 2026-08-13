import { customElement, HelixElement, type HelixOpenChangeEvent } from '@helix-io/core'
import { html, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { HelixBaseAccordionItem } from '../item/accordion-item.js'

/** Keys that move focus between triggers, per the APG accordion pattern. */
const NAVIGATION = new Set(['ArrowDown', 'ArrowUp', 'Home', 'End'])

/**
 * @summary Groups collapsible sections, one open at a time by default.
 *
 * @description
 * Coordination is by event rather than by registration. Items dispatch
 * `OpenChange`, which bubbles and is composed, so the accordion learns that one
 * opened by listening to itself. No ready handshake, no child registry, and
 * nothing to keep in step when items are added or removed.
 *
 * Items are matched with `instanceof HelixBaseAccordionItem`, never by tag
 * name. A headless component that looked for `helix-accordion-item` would only
 * work with the styled tier, which is the tier it is not allowed to know about.
 *
 * Every listener is attached on connect, so none of it runs on the server,
 * where there is no tree to walk and no events to hear.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Collapse, Expander group
 * @documentation https://helix.fusion.dev/components/accordion
 *
 * @slot - The accordion's items.
 *
 * @csspart container - The stack of items.
 */
@customElement('helix-base-accordion')
export class HelixBaseAccordion extends HelixElement {
  /** Whether more than one item may be open at once. */
  @property({ reflect: true, type: Boolean })
  multiple = false

  /** Items in light-DOM order. Client only: the server has no children to read. */
  private get items(): HelixBaseAccordionItem[] {
    return [...this.children].filter(
      (child): child is HelixBaseAccordionItem => child instanceof HelixBaseAccordionItem,
    )
  }

  private readonly handleOpenChange = (event: Event): void => {
    if (this.multiple || !(event as HelixOpenChangeEvent).detail.open) {
      return
    }
    // Retargeting means `target` is the item, not the button inside its shadow
    // root, which is exactly the granularity needed here.
    const opened = event.target
    for (const item of this.items) {
      if (item !== opened && item.isOpen) {
        item.setOpen(false)
      }
    }
  }

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (!NAVIGATION.has(event.key)) {
      return
    }
    const items = this.items
    const current = items.indexOf(event.target as HelixBaseAccordionItem)
    if (current === -1) {
      return
    }

    const last = items.length - 1
    let next = current
    if (event.key === 'ArrowDown') {
      next = current === last ? 0 : current + 1
    } else if (event.key === 'ArrowUp') {
      next = current === 0 ? last : current - 1
    } else if (event.key === 'Home') {
      next = 0
    } else {
      next = last
    }

    // Only once a move is certain, so an unhandled key still scrolls the page.
    event.preventDefault()
    items[next]?.focusTrigger()
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('OpenChange', this.handleOpenChange)
    this.addEventListener('keydown', this.handleKeydown)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('OpenChange', this.handleOpenChange)
    this.removeEventListener('keydown', this.handleKeydown)
  }

  protected override render(): TemplateResult {
    return html`<div part="container"><slot></slot></div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-accordion': HelixBaseAccordion
  }
}
