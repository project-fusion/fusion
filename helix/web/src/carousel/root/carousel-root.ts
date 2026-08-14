import { customElement } from '@helix-io/core'
import { HelixBaseCarousel } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './carousel-root.css.js'

/**
 * @summary Shows one slide of several, with controls to move between them.
 *
 * @description
 * The track scroll-snaps, so a drag and a trackpad swipe move it with the
 * browser's own momentum and the controls only have to scroll.
 *
 * Slides take the full track by default. `per-view` fits more than one across,
 * which is what a run of cards wants rather than a run of full-width panels.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Slider, Gallery, Slideshow
 * @documentation https://helix.fusion.dev/components/carousel
 *
 * @cssproperty --carousel-gap - Space between slides.
 */
@customElement('helix-carousel')
export class HelixCarousel extends HelixBaseCarousel {
  /**
   * How many slides are shown across the track at once. Absent shows one.
   *
   * No default, because it reflects. A reflected property with a value writes
   * its attribute on upgrade, and the host then carries something a consumer's
   * server markup never had, which React reports as a mismatch. The one-across
   * case is the absent attribute, and the styles read it that way.
   */
  @property({ attribute: 'per-view', reflect: true, type: Number })
  perView?: number

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-carousel': HelixCarousel
  }
}
