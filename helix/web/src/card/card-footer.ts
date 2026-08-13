import { HelixBaseCardFooter } from '@helix-io/headless'
import { type CSSResultGroup, css } from 'lit'
import { customElement } from 'lit/decorators.js'

/**
 * Footers hold actions that conclude a card, such as confirm and cancel.
 *
 * @csspart container - The region.
 *
 * @cssproperty --card-padding - Inset, inherited from the card unless overridden.
 */
@customElement('helix-card-footer')
export class HelixCardFooter extends HelixBaseCardFooter {
  static override styles: CSSResultGroup = css`
    :host {
      display: block;
    }

    [part='container'] {
      padding: var(--_card-inset, var(--helix-space-md));
      align-items: center;
      border-block-start: var(--helix-border-thin) solid var(--helix-color-border);
      display: flex;
      gap: var(--helix-space-xs);
      justify-content: flex-end;
    }
  `
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-card-footer': HelixCardFooter
  }
}
