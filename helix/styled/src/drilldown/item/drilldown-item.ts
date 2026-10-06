import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessDrilldownItem } from '@fusion.dev/helix-headless/drilldown'
import type { CSSResultGroup } from 'lit'
import { styles } from './drilldown-item.css.js'

/**
 * @summary One row of a drill-down, which can open a page of its own.
 *
 * @description
 * Each row is a full-width band that reaches both edges of the panel, like the
 * options in a select, so the highlight lines up with the edge of the list.
 *
 * @since 0.1.0
 * @status stable
 * @aliases Panel item, Drill row
 * @documentation https://fusion.dev/helix/components/drilldown
 *
 * @cssproperty --drilldown-item-block-size - Height of a row.
 * @cssproperty --drilldown-item-color - Color of a row's words.
 * @cssproperty --drilldown-item-description-color - Color of the line under a row's label.
 * @cssproperty --drilldown-item-disabled-opacity - How faint a disabled row is drawn.
 * @cssproperty --drilldown-item-font-size - Size of a row's words.
 * @cssproperty --drilldown-item-hover-color - Fill when a row is under the pointer.
 * @cssproperty --drilldown-item-mark-color - Color of the caret on a row that opens a page.
 * @cssproperty --drilldown-item-padding-inline - Space at either end of a row.
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
