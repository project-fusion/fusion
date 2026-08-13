import { HelixBaseCardBody } from '@helix-io/headless'
import { type CSSResultGroup, css } from 'lit'
import { customElement } from 'lit/decorators.js'

/**
 * Bodies hold a card's main content.
 *
 * @csspart container - The region.
 *
 * @cssproperty --card-padding - Inset, inherited from the card unless overridden.
 */
@customElement('helix-card-body')
export class HelixCardBody extends HelixBaseCardBody {
  static override styles: CSSResultGroup = css`
    :host {
      display: block;
    }

    [part='container'] {
      padding: var(--_card-inset, var(--helix-space-md));
      color: var(--helix-color-foreground-muted);
      line-height: var(--helix-leading-normal);
    }
  `
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-card-body': HelixCardBody
  }
}
