import { customElement } from '@helix-io/core'
import { HelixBaseRating } from '@helix-io/headless/rating'
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
 * @cssproperty --rating-color - The color of a filled mark.
 * @cssproperty --rating-empty-color - And of an unfilled one.
 *
 * @slot mark - The shape of a mark, cloned into every position. Left empty, the
 * stylesheet draws its own and `--rating-mark` swaps it.
 */
@customElement('helix-rating')
export class HelixRating extends HelixBaseRating {
  static override styles: CSSResultGroup = styles

  /**
   * Which mark the row is drawn with.
   *
   * `marks` is the star, and is what a rating means to most readers. `dots`
   * drops the glyph for a plain circle, which says how much rather than how
   * good: a star carries a judgment that a level of spice, a difficulty or a
   * confidence has not earned.
   *
   * Both are one shape repeated and clipped to the score, so halves work in
   * either, and both are only a choice of drawing. A scale whose marks are
   * *different* drawings is a set of choices rather than a quantity: that is
   * `Radio.Group`, whose options already carry a value and a name each.
   *
   * **Undefaulted, because it reflects.** Defaulted to `marks` it wrote
   * `appearance="marks"` onto every rating the server rendered, which React
   * held no prop for and reported as a hydration mismatch. The stylesheet was
   * already written the right way round, naming only `dots`, so marks is what
   * an unset one draws and nothing else had to move.
   */
  @property({ reflect: true })
  variant?: 'dots' | 'marks'
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-rating': HelixRating
  }
}
