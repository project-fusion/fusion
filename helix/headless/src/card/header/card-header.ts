import { HelixElement } from '@helix-io/core'
import { html, type TemplateResult } from 'lit'
import { customElement } from 'lit/decorators.js'

/**
 * Headers hold a card's title and any actions that apply to the whole card.
 *
 * A separate element rather than a slot on the root, so it can be styled,
 * omitted, and reordered independently.
 *
 * @slot - Title and actions.
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
