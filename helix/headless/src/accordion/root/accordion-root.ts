import { customElement, HelixElement } from '@helix-io/core'
import { html, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { HelixBaseAccordionItem } from '../item/accordion-item.js'

/** Keys that move focus between triggers, per the APG accordion pattern. */
const NAVIGATION = new Set(['ArrowDown', 'ArrowUp', 'Home', 'End'])

/**
 * @summary Groups collapsible sections, one open at a time by default.
 *
 * @description
 * Holds the mode and nothing else. The item that was clicked is what
 * coordinates: it walks up to the nearest accordion, reads the mode off it, and
 * closes its peers itself.
 *
 * Coordination is structural, not a subscription. `helix-open` does not bubble
 * and is not composed, because overlays nest and an inner one's lifecycle must
 * never read as the outer one's, so an accordion cannot learn that a child
 * opened by listening for it.
 *
 * Membership resolves on demand, so there is no registry to keep in step: an
 * item added a second after render coordinates on its first click.
 *
 * Items are matched with `instanceof HelixBaseAccordionItem`, never by tag
 * name. Matching `helix-accordion-item` would tie this tier to the styled one.
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
 */
@customElement('helix-base-accordion')
export class HelixBaseAccordion extends HelixElement {
  /**
   * How many sections may be open at once.
   *
   * Absent is `multiple`, so nothing closes unexpectedly and the default costs
   * no attribute on the host. `single` keeps exactly one open and refuses to
   * close the last; `single-collapsible` keeps at most one and lets it close.
   *
   * A union rather than a mode plus a `collapsible` boolean, which would make
   * `collapsible` alongside `multiple` expressible and meaningless.
   */
  @property({ reflect: true })
  mode?: 'single' | 'single-collapsible'

  /** Direct items, in light-DOM order. Client only: the server has no tree. */
  get items(): HelixBaseAccordionItem[] {
    return [...this.children].filter(
      (child): child is HelixBaseAccordionItem => child instanceof HelixBaseAccordionItem,
    )
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
    this.addEventListener('keydown', this.handleKeydown)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('keydown', this.handleKeydown)
  }

  protected override render(): TemplateResult {
    return html`<slot></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-accordion': HelixBaseAccordion
  }
}
