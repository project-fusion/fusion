import { HelixBaseCardFooter } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { customElement } from 'lit/decorators.js'
import { styles } from './card-footer.css.js'

/**
 * Footers hold actions that conclude a card, such as confirm and cancel.
 *
 * @csspart container - The region.
 *
 * @cssproperty --card-padding - Inset, inherited from the card unless overridden.
 */
@customElement('helix-card-footer')
export class HelixCardFooter extends HelixBaseCardFooter {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-card-footer': HelixCardFooter
  }
}
