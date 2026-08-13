import { HelixBaseCardTitle } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { customElement } from 'lit/decorators.js'
import { styles } from './card-title.css.js'

/**
 * Titles name the card that contains them.
 *
 * @csspart heading - The heading element.
 */
@customElement('helix-card-title')
export class HelixCardTitle extends HelixBaseCardTitle {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-card-title': HelixCardTitle
  }
}
