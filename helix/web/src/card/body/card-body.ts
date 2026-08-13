import { HelixBaseCardBody } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { customElement } from 'lit/decorators.js'
import { styles } from './card-body.css.js'

/**
 * Bodies hold a card's main content.
 *
 * @csspart container - The region.
 *
 * @cssproperty --card-padding - Inset, inherited from the card unless overridden.
 */
@customElement('helix-card-body')
export class HelixCardBody extends HelixBaseCardBody {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-card-body': HelixCardBody
  }
}
