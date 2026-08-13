import { customElement } from '@helix-io/core'
import { HelixBaseCard } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './card-root.css.js'

/**
 * @summary Groups related content and actions into a single surface.
 *
 * @description
 * Regions are slots: `header`, the default slot for content, and `footer`. An
 * omitted region takes no space, so a card with only content needs no wrapper
 * markup at all.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Panel, Surface
 * @documentation https://helix.fusion.dev/components/card
 *
 * @slot header - Title and any actions for the whole card.
 * @slot - The card's main content.
 * @slot footer - Actions that conclude the card.
 *
 * @csspart container - The card surface.
 * @csspart header - The header region.
 * @csspart body - The content region.
 * @csspart footer - The footer region.
 *
 * @cssproperty --card-background-color - Surface behind the card.
 * @cssproperty --card-border-color - Border color of the surface.
 * @cssproperty --card-padding - Inset applied to each region.
 * @cssproperty --card-radii - Corner radius of the surface.
 */
@customElement('helix-card')
export class HelixCard extends HelixBaseCard {
  /** How the card separates itself from the page. */
  @property({ reflect: true })
  appearance: 'outlined' | 'elevated' | 'plain' = 'outlined'

  /** Tightens the inset for dense layouts. */
  @property({ reflect: true, type: Boolean })
  dense = false

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-card': HelixCard
  }
}
