import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessDrilldownItem } from '@fusion.dev/helix-headless/drilldown'
import type { CSSResultGroup } from 'lit'
import { styles } from './drilldown-item.css.js'

/**
 * @summary One row of a drill-down, which can open a page of its own.
 *
 * @description
 * A row is a full-width band rather than an inset pill, for the reason the
 * select's options are: it reaches both edges of the panel, so a highlight
 * lines up with the edge the eye is already following down the list.
 *
 * @since 0.1.0
 * @status stable
 * @aliases Panel item, Drill row
 * @documentation https://fusion.dev/helix/components/drilldown
 *
 * @cssproperty --drilldown-item-hover-color - Fill when a row is under the pointer.
 */
@customElement('helix-drilldown-item')
export class HelixDrilldownItem extends HelixHeadlessDrilldownItem {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-drilldown-item': HelixDrilldownItem
  }
}
