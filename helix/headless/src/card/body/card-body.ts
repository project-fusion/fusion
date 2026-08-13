import { customElement, HelixElement } from '@helix-io/core'
import { html, type TemplateResult } from 'lit'

/**
 * @summary Holds a card's main content.
 *
 * @description
 * Carries the card's inset and muted foreground so content does not need to restate either.
 *
 * @since 0.1.0
 * @status experimental
 * @documentation https://helix.fusion.dev/components/card
 *
 * @slot - The card's content.
 *
 * @csspart container - The region.
 */
@customElement('helix-base-card-body')
export class HelixBaseCardBody extends HelixElement {
  protected override render(): TemplateResult {
    return html`
      <div part="container">
        <slot></slot>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-card-body': HelixBaseCardBody
  }
}
