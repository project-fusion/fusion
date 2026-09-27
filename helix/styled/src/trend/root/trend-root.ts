import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessTrend } from '@fusion.dev/helix-headless/trend'
import type { CSSResultGroup } from 'lit'
import '../../icon/index.js'
import { styles as glyphStyles } from '../../shared/glyph/glyph.css.js'
import { styles } from './trend-root.css.js'

/**
 * @summary An indicator that shows which way a measurement moved, and whether the change is good.
 *
 * @description
 * The arrow takes the judgment color and the number keeps the foreground color.
 * In light mode the success token has 3.8:1 contrast on the surface, enough for
 * a glyph and short of what 13px text needs, and the ramp has no darker green.
 * The number stays the most legible part.
 *
 * Trend has no `emphasis`, `material`, or `wash`. It has no mark for emphasis,
 * no surface for material, and no area for a wash. The text weight comes from
 * `Text` and the size from the region.
 *
 * The meaning axis is derived: `direction` and `good` resolve to success,
 * danger, or muted, so you state the metric's polarity once. There is no
 * `tone`, because a declared tone could disagree with the arrow.
 *
 * @since 0.1.0
 * @status stable
 * @category charts
 * @groups charts
 * @aliases Delta, Change, Movement
 * @documentation https://fusion.dev/helix/components/trend
 *
 * @cssproperty --trend-color - Color of the arrow. Setting it overrides the color that `good` sets.
 * @cssproperty --trend-icon-size - Size of the arrow.
 */
@customElement('helix-trend')
export class HelixTrend extends HelixHeadlessTrend {
  static override styles: CSSResultGroup = [glyphStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-trend': HelixTrend
  }
}
