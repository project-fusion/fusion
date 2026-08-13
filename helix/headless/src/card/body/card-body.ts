import { HelixElement } from '@helix-io/core'
import { html, type TemplateResult } from 'lit'
import { customElement } from 'lit/decorators.js'

/**
 * Bodies hold a card's main content.
 *
 * A separate element rather than a slot on the root, so it can be styled,
 * omitted, and reordered independently.
 *
 * @slot - The card's content.
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
