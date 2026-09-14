import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessTrend } from '@fusion.dev/helix-headless/trend'
import type { CSSResultGroup } from 'lit'
import '../../icon/index.js'
import { styles as glyphStyles } from '../../shared/glyph/glyph.css.js'
import { styles } from './trend-root.css.js'

/**
 * @summary Which way a measurement moved, and whether that is good news.
 *
 * @description
 * The arrow takes the judgment color and the number does not, which is the
 * opposite of the dashboard convention and is measured rather than preferred:
 * in light mode the success token is 3.8:1 on the surface, enough for a glyph
 * and short of what 13px text needs, and there is no darker green in the ramp.
 * The number therefore keeps the page's own foreground and stays the most
 * legible thing here, which is right anyway, since the number is what a reader
 * reads and the judgment is a gloss on it.
 *
 * **No visual axis applies here, and that is the answer rather than a gap.**
 * `emphasis` is how much ink a mark claims, and there is no mark: an arrow glyph
 * and two runs of text, whose weight is `Text`'s business and whose size is the
 * region's. `material` is what reads through a surface, and a 13px glyph has
 * nothing behind it. `wash` is a gradient across an area, and there is no area.
 *
 * The meaning axis is here and is *derived*, which is the more interesting half:
 * `direction` and `good` together resolve to success, danger or muted, so a
 * consumer states the metric's polarity once rather than picking a color. A
 * declared `tone` would let the color disagree with the arrow, which is the one
 * thing this component exists to stop.
 *
 * @since 0.1.0
 * @status stable
 * @category charts
 * @groups charts
 * @aliases Delta, Change, Movement
 * @documentation https://helix.fusion.dev/components/trend
 *
 * @cssproperty --trend-color - Color of the arrow, overriding the judgment.
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
