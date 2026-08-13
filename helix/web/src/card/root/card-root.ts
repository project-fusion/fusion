import { HelixBaseCard } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { styles } from './card-root.css.js'

/**
 * @summary Groups related content and actions into a single surface.
 *
 * @description
 * Set `aria-labelledby` or `aria-label` for a name present in server-rendered
 * HTML; otherwise the card adopts the first `Card.Title` beneath it once in a
 * browser.
 *
 * @since 0.1.0
 * @status experimental
 * @documentation https://helix.fusion.dev/components/card
 * @alias Panel
 * @alias Surface
 *
 * @slot - Card regions, typically Header, Body, and Footer.
 * @csspart container - The card surface.
 *
 * @cssproperty --card-background-color - Surface behind the card.
 * @cssproperty --card-border-color - Border color of the surface.
 * @cssproperty --card-padding - Inset applied to each region.
 * @cssproperty --card-radii - Corner radius of the surface.
 */
@customElement('helix-card')
export class HelixCard extends HelixBaseCard {
  /**
   * How the card separates itself from the page.
   *
   * `outlined` is the default because a hairline is denser than a shadow,
   * scales better, and needs no tuning per color scheme. `elevated` is for a
   * card that genuinely floats above the content behind it.
   */
  @property({ reflect: true })
  appearance: 'outlined' | 'elevated' | 'plain' = 'outlined'

  /**
   * Tightens the inset for dense layouts.
   */
  @property({ reflect: true, type: Boolean })
  dense = false

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-card': HelixCard
  }
}
