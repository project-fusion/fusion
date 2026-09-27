import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessDrilldown } from '@fusion.dev/helix-headless/drilldown'
import type { CSSResultGroup } from 'lit'
import { styles as collectionStateStyles } from '../../shared/collection/state.css.js'
import { styles as liveStyles } from '../../shared/live/live.css.js'
import { styles } from './drilldown-root.css.js'

/**
 * @summary A stack of pages that shows one at a time, with a back button.
 *
 * @description
 * Pages slide in the direction of travel, so you can tell whether you went
 * deeper or came back. Without motion, the panel only shows different text.
 *
 * The slide is a CSS animation, because the arriving page was not in the DOM on
 * the previous frame, so there is nothing to transition from. Under
 * `prefers-reduced-motion` the pages swap instantly, as they do in `Menu`.
 *
 * @since 0.1.0
 * @status stable
 * @category navigation
 * @aliases Panel, Nested list, Drill-in
 * @documentation https://fusion.dev/helix/components/drilldown
 *
 * @cssproperty --drilldown-background-color - Fill behind the pages.
 * @cssproperty --drilldown-inline-size - Width of the region.
 */
@customElement('helix-drilldown')
export class HelixDrilldown extends HelixHeadlessDrilldown {
  static override styles: CSSResultGroup = [liveStyles, collectionStateStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-drilldown': HelixDrilldown
  }
}
