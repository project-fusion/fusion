import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessRating } from '@fusion.dev/helix-headless/rating'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles as fieldStyles } from '../../shared/field/field.css.js'
import { styles as fieldStackedStyles } from '../../shared/field/field-stacked.css.js'
import { styles } from './rating-root.css.js'

/**
 * @summary A score out of a few marks, given or shown.
 *
 * @description
 * Presentation only: the marks, and the clip that fills them partway.
 * Everything about what the score is and how it is chosen is the base class.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @aliases Stars, Score, Review score
 * @documentation https://fusion.dev/helix/components/rating
 *
 * @slot mark - The shape of a mark, cloned into every position. Left empty, the
 * stylesheet draws its own and `--rating-mark` swaps it.
 *
 * @cssproperty --rating-color - The color of a filled mark.
 * @cssproperty --rating-empty-color - And of an unfilled one.
 * @cssproperty --rating-gap - Space between marks.
 * @cssproperty --rating-mark - The shape of one mark, as a mask image.
 * @cssproperty --rating-size - How big one mark is.
 */
@customElement('helix-rating')
export class HelixRating extends HelixHeadlessRating {
  static override styles: CSSResultGroup = [fieldStyles, fieldStackedStyles, styles]

  /**
   * The geometry one mark is drawn to.
   *
   * The registry's word, because the question is the registry's: `Avatar`,
   * `Skeleton`, `IconButton`, `Meter` and `Progress` each ask what geometry
   * their own thing is cut to under this name, and `dots` is already a value
   * the axis holds. What is picked here is the outline of one mark and nothing
   * else, which is a shape and not a component-specific choice.
   *
   * `dots` drops the glyph for a plain circle, which says how much rather than
   * how good: a star carries a judgment that a level of spice, a difficulty or
   * a confidence has not earned. Either way it is one shape repeated and
   * clipped to the score, so halves work in both. A scale whose marks are
   * *different* drawings is a set of choices rather than a quantity: that is
   * `Radio.Group`, whose options already carry a value and a name each.
   *
   * **The star is the resting one and has no word**, which is the rule every
   * axis follows and is also what this family needed anyway: it reflects, so a
   * default would write the resting value onto every server-rendered rating,
   * an attribute React holds no prop for and so a hydration mismatch for each
   * one. The stylesheet names only `dots`, so an unset one draws the star by
   * landing on the base rule.
   */
  @property({ reflect: true })
  shape?: 'dots'
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-rating': HelixRating
  }
}
