import { HelixBaseCardFooter } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { customElement } from 'lit/decorators.js'
import { styles } from './card-footer.css.js'

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
