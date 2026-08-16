import { customElement } from '@helix-io/core'
import { HelixBaseDrilldown } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { styles } from './drilldown-root.css.js'

/**
 * @summary A stack of pages, one showing at a time, with a way back.
 *
 * @description
 * **The pages slide, and the direction is the point.** Both moves replace one
 * page with another, so with no motion a reader cannot tell whether they went
 * deeper or came back: the panel simply holds different words. Sliding in the
 * direction of travel says which happened, and it is most of the reason this is
 * a component rather than a menu with its trigger removed.
 *
 * An animation rather than a transition, because there is nothing to transition
 * from: the page arriving was not in the DOM a frame ago. Under
 * `prefers-reduced-motion` it becomes the instant swap `Menu` does.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Panel, Nested list, Drill-in
 * @documentation https://helix.fusion.dev/components/drilldown
 *
 * @cssproperty --drilldown-background - Fill behind the pages.
 * @cssproperty --drilldown-inline-size - Width of the region.
 */
@customElement('helix-drilldown')
export class HelixDrilldown extends HelixBaseDrilldown {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-drilldown': HelixDrilldown
  }
}
