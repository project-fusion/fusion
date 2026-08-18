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
 * @property appearance - Whether the controls sit beside the dots or on the slides.
 *
 * @cssproperty --carousel-block-size - Height of a vertical track.
 * @cssproperty --carousel-gap - Space between slides.
 */
@customElement('helix-carousel')
export class HelixCarousel extends HelixBaseCarousel {
  /**
   * Whether the controls sit beside the dots or on the slides.
   *
   * Unset is one bar under the track, dots at the start of it and arrows at the
   * end. That was three parts stacked in template order until it was measured,
   * which put a bar of arrows *above* the slides and the dots below them: on a
   * three-slide carousel with autoplay, sixty-four pixels of a hundred and
   * seventeen were chrome, and the two things a reader uses to move were at
   * opposite ends of the component. Nobody chose that arrangement; it is what
   * stacking gives.
   *
   * `hero` puts the arrows against the track's own edges, over the content,
   * which is what a full-bleed carousel wants: the slide is the page and the
   * controls are on it rather than in a bar beneath it. The dots go back to the
   * middle there, because the row below them holds nothing else and there is a
   * real centre to sit on.
   *
   * Presentation only, so it lives here rather than on the headless tier.
   */
  @property({ reflect: true })
  appearance?: 'hero'

  /**
   * Where the dots sit along the bar they share with the arrows.
   *
   * Unset is `start`, under the slides where the reading begins. `center` and
   * `end` are for a carousel whose bar is doing something else with the space:
   * centred reads as a gallery, and at the end the two chrome groups sit
   * together in one corner.
   *
   * It centres within the dots' own column rather than across the whole bar, so
   * `center` is the middle of the space left over from the arrows and never
   * underneath them.
   */
  @property({ attribute: 'indicator-placement', reflect: true })
  indicatorPlacement?: 'center' | 'end' | 'start'

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
