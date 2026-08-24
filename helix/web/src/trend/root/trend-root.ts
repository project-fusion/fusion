import { customElement } from '@helix-io/core'
import { HelixBaseTrend } from '@helix-io/headless/trend'
import type { CSSResultGroup } from 'lit'
import '../../icon/index.js'
import { styles as glyphStyles } from '../../icon/glyph.css.js'
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
export class HelixTrend extends HelixBaseTrend {
  static override styles: CSSResultGroup = [glyphStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-trend': HelixTrend
  }
}
