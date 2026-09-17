import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessCarousel } from '@fusion.dev/helix-headless/carousel'
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
 * at any count, and is declared on the tier below because it decides how many
 * positions the track has rather than only how wide a slide is,
 * which is what a run of cards wants rather than a run of full-width panels.
 * This sheet divides the track by the number that tier publishes rather than
 * enumerating the values it will answer for, so there is no count it silently
 * draws one across.
 *
 * @since 0.1.0
 * @status stable
 * @category layout
 * @aliases Slider, Gallery, Slideshow
 * @documentation https://fusion.dev/helix/components/carousel
 *
 * @cssproperty --carousel-bleed - Room inside the scroller so a slide's own shadow, border or
 * focus ring is not clipped by it. Defaults to enough for `--helix-shadow-md`, which reaches
 * 16px below the box it is on; a slide on `--helix-shadow-lg` reaches 44px and wants more.
 * @cssproperty --carousel-block-size - Height of a vertical track.
 */
@customElement('helix-carousel')
export class HelixCarousel extends HelixHeadlessCarousel {
  /**
   * Where along that side the arrows sit. See `indicatorAlign`.
   *
   * `overlay` answers it too, and the edge there is the whole slide: the bar is
   * stretched across the picture, so this moves the arrows up and down within
   * it rather than moving the bar. Centered unless asked otherwise, which is
   * where an arrow over a photograph belongs.
   */
  @property({ attribute: 'controls-align', reflect: true })
  controlsAlign?: 'center' | 'end' | 'start'

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
   * **It is a value here rather than an axis of its own.** "The controls are
   * over the content" is the whole of what a `hero` appearance would say, and
   * the surface, the edge-to-edge arrows and the bar that catches no presses all
   * follow from it. These two placements are the whole of where a carousel's
   * chrome can go.
   */
  @property({ attribute: 'controls-placement', reflect: true })
  controlsPlacement?: 'block-end' | 'block-start' | 'inline-end' | 'inline-start' | 'overlay'

  /**
   * Where along that side the dots sit.
   *
   * The second half of the answer to "where do they go". `indicatorPlacement`
   * says which edge and this says where along it, so the pair spells out the
   * nine positions a consumer asks for in words: bottom left, bottom center,
   * top right, and so on. One attribute with nine values was the alternative
   * and it multiplies rather than composing, since every value has to name both
   * facts and a consumer changing one has to rewrite the other.
   *
   * **One word for both axes, because the edge decides which axis it is.** On a
   * block edge the run is a row and this is `justify-self`; on an inline edge it
   * is a column and the same question is `align-self`. A consumer should not
   * have to know which of those two words their edge wanted.
   *
   * Logical, like the placement: `start` is the left in English and the right in
   * Arabic on a horizontal run, and the top on a vertical one.
   *
   * Unset splits the row, dots to the start and arrows to the end, which is
   * what keeps two items in one grid cell from landing on each other. Beside the
   * slides, and over them, both center instead, because a column there has
   * nothing to split the edge with. Putting both groups on the same edge with
   * the same alignment overlaps them, which is what the two different defaults
   * exist to avoid.
   */
  @property({ attribute: 'indicator-align', reflect: true })
  indicatorAlign?: 'center' | 'end' | 'start'

  /**
   * Which side of the slides the dots sit on.
   *
   * Unset is `block-end`, under them. `block-start` puts them above,
   * `inline-start` and `inline-end` beside, where a run of dots becomes a
   * column.
   *
   * **The sides of the content, not positions along a bar**, and logical names
   * rather than `top`/`left`: an `inline-start` carousel should put its dots on
   * the right in Arabic without being told.
   *
   * Independent of `controlsPlacement`. Both default to the block end, where
   * they share the row and split it, dots to the start and arrows to the end,
   * arrived at by two defaults rather than by a rule about the pair, so moving
   * one leaves the other alone.
   */
  @property({ attribute: 'indicator-placement', reflect: true })
  indicatorPlacement?: 'block-end' | 'block-start' | 'inline-end' | 'inline-start'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-carousel': HelixCarousel
  }
}
