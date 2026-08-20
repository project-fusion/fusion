import { customElement } from '@helix-io/core'
import { HelixBaseRating } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './rating-root.css.js'

/**
 * @summary A score out of a few marks, given or shown.
 *
 * @description
 * Presentation only: the marks, and the clip that fills them partway.
 * Everything about what the score is and how it is chosen is the base class.
 *
 * @since 0.1.0
 * @status experimental
 * @category forms
 * @aliases Stars, Score, Review score
 * @documentation https://helix.fusion.dev/components/rating
 *
 * @cssproperty --rating-mark - The shape of one mark, as a mask image.
 * @cssproperty --rating-size - How big one mark is.
 * @cssproperty --rating-gap - Space between marks.
 * @cssproperty --rating-color - The colour of a filled mark.
 * @cssproperty --rating-empty-color - And of an unfilled one.
 */
@customElement('helix-rating')
export class HelixRating extends HelixBaseRating {
  static override styles: CSSResultGroup = styles

  /**
   * Which mark the row is drawn with.
   *
   * `marks` is the star, and is what a rating means to most readers. `dots`
   * drops the glyph for a plain circle, which says how much rather than how
   * good: a star carries a judgement that a level of spice, a difficulty or a
   * confidence has not earned.
   *
   * Both are the same mechanism underneath, one shape repeated and clipped to
   * the score, so halves work in either.
   */
  @property({ reflect: true })
  appearance: 'dots' | 'marks' = 'marks'
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-rating': HelixRating
  }
}
