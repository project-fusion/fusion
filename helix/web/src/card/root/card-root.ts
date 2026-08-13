import { HelixBaseCard } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { styles } from './card-root.css.js'

/**
 * Cards group related content and actions into a single surface.
 *
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
