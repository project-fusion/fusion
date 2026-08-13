import { HelixElement } from '@helix-io/core'
import { html, type TemplateResult } from 'lit'
import { customElement } from 'lit/decorators.js'

/**
 * @summary Holds a card's title and any actions that apply to the whole card.
 *
 * @description
 * Sits above the body, separated by a rule. Omit it entirely for a card that needs no heading.
 *
 * @since 0.1.0
 * @status experimental
 * @documentation https://helix.fusion.dev/components/card
 *
 * @slot - Title and actions.
 * @csspart container - The region.
 */
@customElement('helix-base-card-header')
export class HelixBaseCardHeader extends HelixElement {
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
    'helix-base-card-header': HelixBaseCardHeader
  }
}
