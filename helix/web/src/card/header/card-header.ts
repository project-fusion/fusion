import { HelixBaseCardHeader } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { customElement } from 'lit/decorators.js'
import { styles } from './card-header.css.js'

/**
 * @summary Holds a card's title and any actions that apply to the whole card.
 *
 * @description
 * Sits above the body, separated by a rule. Omit it entirely for a card that needs no heading.
 *
 * @since 0.1.0
 * @status experimental
 * @documentation https://helix.fusion.dev/components/card
 *
 * @slot - Title and actions.
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
