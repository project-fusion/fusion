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
 * element you slotted, not a wrapper around it.
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
 * @cssproperty --card-background-color - Surface behind the card.
 * @cssproperty --card-border-color - Border color of the surface.
 * @cssproperty --card-media-size - Width of the media column when horizontal.
 * @cssproperty --card-padding - Inset applied to each region.
 * @cssproperty --card-radii - Corner radius of the surface.
 */
@customElement('helix-card')
export class HelixCard extends HelixBaseCard {
  /**
   * How the card separates itself from the page.
   *
   * - `outlined` is the default, and a hairline is usually enough. It costs
   *   less attention than a shadow: a screen of shadowed cards reads as a stack
   *   of things floating, none of them settled.
   * - `elevated` is lifted off the page instead of framed, for a card on a
   *   coloured or busy background, where a line has to compete with whatever is
   *   behind it and a shadow does not.
   * - `plain` has no frame at all: the card is a layout and whatever it sits in
   *   is the surface. For a card inside something already bounded, where a
   *   second box adds a line and no meaning.
   */
  @property({ reflect: true })
  appearance?: 'outlined' | 'elevated' | 'plain'

  /** Tightens the inset for dense layouts. */
  @property({ reflect: true, type: Boolean })
  dense = false

  /** Whether media sits above the content stack or beside it. */
  @property({ reflect: true })
  orientation?: 'vertical' | 'horizontal'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-card': HelixCard
  }
}
