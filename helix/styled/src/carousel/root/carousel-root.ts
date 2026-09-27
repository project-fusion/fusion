import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessCarousel } from '@fusion.dev/helix-headless/carousel'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './carousel-root.css.js'

/**
 * @summary Shows one slide of several, with controls to move between them.
 *
 * @description
 * The track scroll-snaps, so dragging and trackpad swipes use the browser's
 * momentum, and the controls only scroll the track.
 *
 * Each slide fills the track by default. `per-view` shows more than one slide
 * across, at any count, for a run of cards. It is declared on the headless tier
 * because it sets how many positions the track has. The styles divide the track
 * by the count the headless tier publishes, so every count works.
 *
 * @since 0.1.0
 * @status stable
 * @category layout
 * @aliases Slider, Gallery, Slideshow
 * @documentation https://fusion.dev/helix/components/carousel
 *
 * @cssproperty --carousel-bleed - Room inside the scroller so it does not clip a slide's
 * shadow, border, or focus ring. The default leaves room for `--helix-shadow-md`, which
 * reaches 16px below its box. A slide with `--helix-shadow-lg` reaches 44px and needs more.
 * @cssproperty --carousel-block-size - Height of a vertical track.
 */
@customElement('helix-carousel')
export class HelixCarousel extends HelixHeadlessCarousel {
  /**
   * Where the arrows sit along their side of the slides. See `indicatorAlign`.
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
   * The same five places as `indicatorPlacement` and the same default, so a
   * carousel that moves only one of them keeps the other where it was. `start`
   * or `end` stacks the arrows into a column, which is what a vertical track
   * usually wants.
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
   * follow from it. The four edges and the slides are the whole of where a
   * carousel's chrome can go, and `indicatorPlacement` names the same five: the
   * dots were short of this one until #389, which is how a hero ended up with
   * its arrows on the picture and its dots in a band below.
   */
  @property({ attribute: 'controls-placement', reflect: true })
  controlsPlacement?: 'start' | 'end' | 'top' | 'bottom' | 'overlay'

  /**
   * Where the dots sit along their side of the slides.
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
   * Logical, like the placement's own `start` and `end`: `start` is the left in
   * English and the right in Arabic on a horizontal run, and the top on a
   * vertical one.
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
   * Unset is `bottom`, under them. `top` puts them above, `start` and `end`
   * beside, where a run of dots becomes a column.
   *
   * **The sides of the content, not positions along a bar.** `start` and `end`
   * are the logical ones and they are logical because that axis flips: a
   * carousel with its dots at the start should put them on the right in Arabic
   * without being told. `top` and `bottom` are the block edges, which flip in
   * no writing mode this library draws for, so the plain word is the honest one
   * and `block-start` would be jargon standing in for it.
   *
   * **`Drawer` and `Toast` say it in exactly these four words**, and one
   * vocabulary across the three is worth more than each family's own: a
   * consumer who has placed a drawer knows where a carousel's dots go.
   *
   * **`overlay` is the fifth place, and it is the slides themselves**, which is
   * where a run of dots belongs on a full-bleed carousel: the picture is the
   * page and the chrome is on it rather than in a band beneath it. The arrows
   * have always had this and the dots did not, so a hero carousel put its
   * controls over the picture and left its dots stranded in a bar under it,
   * which is the one arrangement nobody designs on purpose.
   *
   * **The run takes a surface, where the arrows take one each.** Over a
   * photograph a gray dot and a primary one are both legible against about half
   * of it, which is the reason the arrows already carry a ground and a shadow.
   * One ground under the whole run rather than one per dot, because the dots are
   * a single object with gaps too small to be edges, where the arrows are two
   * targets at opposite ends of the picture with the slide showing between them.
   * Inside it the dots keep the colors they have everywhere else, so what a
   * reader learned from a carousel in a card still reads on one over a picture.
   *
   * **`indicatorAlign` still says where along the edge**, unchanged, because
   * this placement puts the run on the block-end edge like the other four.
   * `controlsPlacement`'s own `overlay` reinterprets its alignment, that bar
   * being stretched across the middle of the picture rather than sitting on an
   * edge, and the two differ for that reason rather than by oversight.
   *
   * Independent of `controlsPlacement`. Both default to the bottom, where they
   * share the row and split it, dots to the start and arrows to the end,
   * arrived at by two defaults rather than by a rule about the pair, so moving
   * one leaves the other alone.
   */
  @property({ attribute: 'indicator-placement', reflect: true })
  indicatorPlacement?: 'start' | 'end' | 'top' | 'bottom' | 'overlay'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-carousel': HelixCarousel
  }
}
