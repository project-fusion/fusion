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
 *
 * @cssproperty --carousel-block-size - Height of a vertical track.
 * @cssproperty --carousel-gap - Space between slides.
 */
@customElement('helix-carousel')
export class HelixCarousel extends HelixBaseCarousel {
  /**
   * Which side of the slides the dots sit on.
   *
   * Unset is `block-end`, under them. `block-start` puts them above,
   * `inline-start` and `inline-end` beside, where a run of dots becomes a
   * column.
   *
   * **The sides of the content, not positions along a bar.** This was
   * `start | center | end`, which answered "where along the row" when the
   * question is "which edge", and could not say "above" at all. The logical
   * names rather than `top`/`left`, because the component is already careful
   * about writing direction everywhere else and an `inline-start` carousel
   * should put its dots on the right in Arabic without being told.
   *
   * Independent of `controlsPlacement`. Both default to the block end, where
   * they share the row and split it, dots to the start and arrows to the end.
   * That is the arrangement the old shared bar gave, arrived at by two defaults
   * rather than by a rule about the pair, so moving one leaves the other alone.
   */
  @property({ attribute: 'indicator-placement', reflect: true })
  indicatorPlacement?: 'block-end' | 'block-start' | 'inline-end' | 'inline-start'

  /**
   * Which side of the slides the arrows sit on.
   *
   * The same four sides as `indicatorPlacement` and the same default, so a
   * carousel that moves only one of them keeps the other where it was.
   * `inline-start` or `inline-end` stacks the arrows into a column, which is
   * what a vertical track usually wants.
   *
   * `overlay` puts them on the slides, at the track's own edges, which is what a
   * full-bleed carousel wants: the slide is the page and the controls are on it
   * rather than in a bar beneath it. It carries its own treatment with it, a
   * surface and a shadow under each arrow, because a glyph drawn straight onto a
   * photograph is legible against about half of one.
   *
   * **That was `appearance="hero"` and did not need to be.** A third axis for
   * something these two already describe: what `hero` meant was "the controls
   * are over the content", and the surface, the edge-to-edge arrows and the bar
   * that catches no presses all followed from it rather than being separate
   * decisions. One fewer property, and the two axes are now the whole of where
   * a carousel's chrome can go.
   */
  @property({ attribute: 'controls-placement', reflect: true })
  controlsPlacement?: 'block-end' | 'block-start' | 'inline-end' | 'inline-start' | 'overlay'

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
