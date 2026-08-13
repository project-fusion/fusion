import { HelixBaseCardHeader } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { customElement } from 'lit/decorators.js'
import { styles } from './card-header.css.js'

/**
 * Headers hold a card's title and any actions that apply to the whole card.
 *
 * @csspart container - The region.
 *
 * @cssproperty --card-padding - Inset, inherited from the card unless overridden.
 */
@customElement('helix-card-header')
export class HelixCardHeader extends HelixBaseCardHeader {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-card-header': HelixCardHeader
  }
}
