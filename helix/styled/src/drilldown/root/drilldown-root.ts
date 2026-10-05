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
 * @cssproperty --drilldown-back-color - Color of the back button's icon.
 * @cssproperty --drilldown-back-hover-background-color - Fill of the back button under the pointer.
 * @cssproperty --drilldown-background-color - Fill behind the pages.
 * @cssproperty --drilldown-duration - How long a page takes to slide in.
 * @cssproperty --drilldown-header-block-size - Height of the bar above a page.
 * @cssproperty --drilldown-header-border-color - Color of the rule under the bar above a page.
 * @cssproperty --drilldown-inline-size - Width of the region.
 * @cssproperty --drilldown-page-padding-block - Space above and below a page's rows.
 * @cssproperty --drilldown-title-color - Color of the page's name.
 * @cssproperty --drilldown-title-font-size - Size of the page's name.
 * @cssproperty --drilldown-title-font-weight - Weight of the page's name.
 * @cssproperty --drilldown-travel - How far a page slides as it arrives, along the line of text.
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
