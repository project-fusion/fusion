import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessTrend } from '@fusion.dev/helix-headless/trend'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles as glyphStyles } from '../../shared/glyph/glyph.css.js'
import { styles } from './trend-root.generated.css.js'

/**
 * @summary An indicator that shows which way a measurement moved, and whether the change is good.
 *
 * @description
 * The arrow and the metric take the trend's color, and the label stays gray.
 * Each of these colors measures at least 4.5:1 on the page and on every
 * surface, in both modes.
 *
 * Trend has no `emphasis`, `material`, or `wash`. It has no mark for emphasis,
 * no surface for material, and no area for a wash. The text weight comes from
 * `Text` and the size from the region.
 *
 * The meaning axis is derived: `movement` and `good` resolve to success,
 * danger, or muted, so you state the metric's polarity once. There is no
 * `tone`, because a declared tone could disagree with the arrow.
 *
 * **Or color by the movement alone**, for a price on a market page.
 * `color-by="movement"` draws a rise in `--helix-color-rise` and a fall in
 * `--helix-color-fall`, which are success and danger until your page sets
 * them. Mainland China, Taiwan, and Japan draw a rise in red, so a page for
 * those markets swaps the two, as
 * [Rise and fall colors](https://fusion.dev/helix/docs/localization#rise-and-fall-colors)
 * shows. `good` still decides the word and the `better` and `worse` states.
 *
 * @since 0.1.0
 * @status stable
 * @category charts
 * @groups charts
 * @aliases Delta, Change, Movement
 * @documentation https://fusion.dev/helix/components/trend
 *
 * @cssproperty --trend-better-color - Color of a move that `good` says is an improvement.
 * @cssproperty --trend-color - Color of the arrow and the metric. Setting it overrides the color that `good` or `color-by` sets.
 * @cssproperty --trend-down-color - Color of a move down under `color-by="movement"`.
 * @cssproperty --trend-gap - Space between the arrow, the metric and the label.
 * @cssproperty --trend-icon-size - Size of the arrow, or of a glyph in one of the icon slots.
 * @cssproperty --trend-label-color - Color of the label.
 * @cssproperty --trend-neutral-color - Color of a trend that did not move, or of one that `good` does not judge while the color follows the judgment.
 * @cssproperty --trend-up-color - Color of a move up under `color-by="movement"`.
 * @cssproperty --trend-worse-color - Color of a move that `good` says is a setback.
 */
@customElement('helix-trend')
export class HelixTrend extends HelixHeadlessTrend {
  /**
   * What the color says: `judgment`, success or danger by `good`, or
   * `movement`, `--helix-color-rise` for a move up and `--helix-color-fall`
   * for a move down.
   *
   * Absent is `judgment`. Use `movement` where the color of a change follows
   * a market's convention, such as a price, and set the two tokens for that
   * market. `good` still decides the word and the `better` and `worse` states.
   * A trend that did not move is gray either way.
   */
  @property({ attribute: 'color-by', reflect: true })
  colorBy?: 'judgment' | 'movement'

  static override styles: CSSResultGroup = [glyphStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-trend': HelixTrend
  }
}
