import { HelixBaseCardTitle } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { customElement } from 'lit/decorators.js'
import { styles } from './card-title.css.js'

/**
 * @summary Names the card that contains it.
 *
 * @description
 * Renders as a heading whose level the consumer sets, because the correct level
 * depends on the surrounding document.
 *
 * @since 0.1.0
 * @status experimental
 * @documentation https://helix.fusion.dev/components/card
 *
 * @slot - The title text.
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
