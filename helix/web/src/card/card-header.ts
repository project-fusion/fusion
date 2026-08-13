import { HelixBaseCardHeader } from '@helix-io/headless'
import { type CSSResultGroup, css } from 'lit'
import { customElement } from 'lit/decorators.js'

/**
 * Headers hold a card's title and any actions that apply to the whole card.
 *
 * @csspart container - The region.
 *
 * @cssproperty --card-padding - Inset, inherited from the card unless overridden.
 */
@customElement('helix-card-header')
export class HelixCardHeader extends HelixBaseCardHeader {
  static override styles: CSSResultGroup = css`
    :host {
      display: block;
    }

    [part='container'] {
      padding: var(--_card-inset, var(--helix-space-md));
      align-items: center;
      border-block-end: var(--helix-border-thin) solid var(--helix-color-border);
      display: flex;
      gap: var(--helix-space-sm);
      justify-content: space-between;
    }
  `
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-card-header': HelixCardHeader
  }
}
