import { HelixElement } from '@helix-io/core'
import { html, type TemplateResult } from 'lit'
import { customElement } from 'lit/decorators.js'

/**
 * Footers hold actions that conclude a card, such as confirm and cancel.
 *
 * A separate element rather than a slot on the root, so it can be styled,
 * omitted, and reordered independently.
 *
 * @slot - Actions, typically buttons.
 */
@customElement('helix-base-card-footer')
export class HelixBaseCardFooter extends HelixElement {
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
    'helix-base-card-footer': HelixBaseCardFooter
  }
}
