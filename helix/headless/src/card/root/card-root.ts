import { customElement, HelixElement } from '@helix-io/core'
import { html, type TemplateResult } from 'lit'

/**
 * @summary Groups related content and actions into a single surface.
 *
 * @description
 * Regions are slots rather than separate elements, because a header, body, and
 * footer carry no state, no behavior, and no API of their own. Slotting them
 * costs one custom element instead of five and lets the consumer bring their
 * own markup, so a title can be a real `<h2>` rather than an emulated one.
 *
 * Name the card with `aria-label` or `aria-labelledby`. That is the only
 * naming that survives server rendering: reading a title out of the light DOM
 * needs a DOM, and the server has none.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Panel, Surface
 * @documentation https://helix.fusion.dev/components/card
 *
 * @slot header - Title and any actions for the whole card.
 * @slot - The card's main content.
 * @slot footer - Actions that conclude the card.
 *
 * @csspart container - The card surface.
 * @csspart header - The header region.
 * @csspart body - The content region.
 * @csspart footer - The footer region.
 */
@customElement('helix-base-card')
export class HelixBaseCard extends HelixElement {
  protected override render(): TemplateResult {
    // Each region wraps its slot so the styled tier can inset and separate it.
    // A slot with no assigned content leaves its wrapper empty, which `:has()`
    // collapses, so an omitted region costs no space.
    return html`
      <div part="container" role="group">
        <div part="header"><slot name="header"></slot></div>
        <div part="body"><slot></slot></div>
        <div part="footer"><slot name="footer"></slot></div>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-card': HelixBaseCard
  }
}
