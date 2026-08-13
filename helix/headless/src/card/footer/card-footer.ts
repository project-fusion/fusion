import { customElement, HelixElement } from '@helix-io/core'
import { html, type TemplateResult } from 'lit'

/**
 * @summary Holds actions that conclude a card, such as confirm and cancel.
 *
 * @description
 * Aligns its content to the end, so buttons sit where a user expects to finish.
 *
 * @since 0.1.0
 * @status experimental
 * @documentation https://helix.fusion.dev/components/card
 *
 * @slot - Actions, typically buttons.
 *
 * @csspart container - The region.
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
