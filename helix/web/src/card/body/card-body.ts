import { customElement } from '@helix-io/core'
import { HelixBaseCardBody } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { styles } from './card-body.css.js'

/**
 * @summary Holds a card's main content.
 *
 * @description
 * Carries the card's inset and muted foreground so content does not need to restate either.
 *
 * @since 0.1.0
 * @status experimental
 * @documentation https://helix.fusion.dev/components/card
 *
 * @slot - The card's content.
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
