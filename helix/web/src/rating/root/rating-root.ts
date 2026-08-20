import { customElement } from '@helix-io/core'
import { HelixBaseRating } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
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
 * @cssproperty --rating-chip-size - How big one chip is, under `appearance="chips"`.
 *
 * @slot mark - The shape of a mark. One element is cloned into every position;
 * several are used in order, which is what a face scale needs. Left empty, the
 * stylesheet draws the mark and `--rating-mark` swaps it.
 */
@customElement('helix-rating')
export class HelixRating extends HelixBaseRating {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-rating': HelixRating
  }
}
