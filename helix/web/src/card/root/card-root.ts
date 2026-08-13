import { customElement } from '@helix-io/core'
import { HelixBaseCard } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './card-root.css.js'

/**
 * @summary Groups related content and actions into a single surface.
 *
 * @description
 * Regions are slots: `media`, `header`, the default slot for content, and
 * `footer`. An omitted region takes no space, so a card with only content needs
 * no wrapper markup at all.
 *
 * `media` runs edge to edge and clips to the card's corners, so an image needs
 * no inset correction. Set `orientation="horizontal"` to move it alongside the
 * header, content, and footer stack rather than above it.
 *
 * Regions are bare slots with no wrapper element, so an omitted one occupies no
 * space without the card having to detect that it is missing. Style slotted
 * content directly rather than reaching for a part: a header is whatever
 * element you slotted, not a wrapper we put around it.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Panel, Surface
 * @documentation https://helix.fusion.dev/components/card
 *
 * @slot media - Image or video that runs edge to edge, outside the inset.
 * @slot header - Title and any actions for the whole card.
 * @slot - The card's main content.
 * @slot footer - Actions that conclude the card.
 *
 * @csspart container - The card surface.
 *
 * @cssproperty --card-background-color - Surface behind the card.
 * @cssproperty --card-border-color - Border color of the surface.
 * @cssproperty --card-media-size - Width of the media column when horizontal.
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

  /** Whether media sits above the content stack or beside it. */
  @property({ reflect: true })
  orientation: 'vertical' | 'horizontal' = 'vertical'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-card': HelixCard
  }
}
