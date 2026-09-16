import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessTooltip } from '@fusion.dev/helix-headless/tooltip'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './tooltip-root.css.js'

/**
 * @summary A short description that appears beside what it describes.
 *
 * @description
 * The bubble is in the top layer, so it needs no `z-index` and cannot be
 * clipped by whatever it sits inside.
 *
 * The arrow is positioned by the same pass that positions the bubble, so it
 * still points at the trigger after the bubble has slid along to stay in view.
 *
 * @since 0.1.0
 * @status experimental
 * @category overlays
 * @groups charts
 * @aliases Hint, Popup label
 * @documentation https://fusion.dev/helix/components/tooltip
 *
 * @cssproperty --tooltip-arrow-size - Size of the point at the bubble's edge.
 * @cssproperty --tooltip-backdrop - Blur behind a `glass` bubble.
 * @cssproperty --tooltip-background-color - Fill of the bubble.
 * @cssproperty --tooltip-max-inline-size - Widest the bubble grows before wrapping.
 */
@customElement('helix-tooltip')
export class HelixTooltip extends HelixHeadlessTooltip {
  /**
   * What the bubble is made of.
   *
   * Absent is the inverse bubble, a dark surface over a light page, which is
   * what a hint over content the theme cannot know has always been here. `glass`
   * makes it the page's own translucent ground instead, for a page whose surfaces
   * are glass, so a hint over a glass header is not the one opaque slab on it.
   *
   * **It flips the ink and adds an edge, which no other family carrying this axis
   * has to do.** A card is already the page's surface, so glass swaps one ground
   * for another; this one starts inverse, and `--helix-material-translucent` is
   * the page's ground, so taking it without the foreground would put light ink on
   * a light bubble. The border arrives with the material rather than being there
   * all along, because a glass bubble has to be told from what is behind it while
   * an inverse one is told from the page by being its opposite.
   *
   * The strength is the theme's: `--helix-material-translucent` and
   * `--helix-material-backdrop` are what the policy moves.
   *
   * **`emphasis` is not here and that is not an omission.** It says how much ink
   * a *mark* claims, and this is a surface: what varies about a surface is where
   * it ends, which is `separation`, and a bubble in the top layer with a point on
   * it has one answer to that. A quiet tooltip is a tooltip that is not shown.
   *
   * **No `transparent`, deliberately.** A bubble floating over arbitrary page
   * content is only readable because it has a ground; dropping it makes an
   * unreadable tooltip rather than a lighter one. `frosted` and `glass` are the
   * two honest points here.
   */
  @property({ reflect: true })
  material?: 'frosted' | 'glass'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-tooltip': HelixTooltip
  }
}
