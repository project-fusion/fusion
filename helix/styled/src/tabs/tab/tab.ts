import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessTab } from '@fusion.dev/helix-headless/tabs'
import type { CSSResultGroup } from 'lit'
import { styles } from './tab.css.js'

/**
 * @summary One tab in a tab list.
 *
 * @description
 * A tab has a control's height, so a tab row sits level with the buttons beside
 * it. The current tab is marked by one indicator that moves along the tab list.
 * Each tab keeps a transparent edge of the same width, so its box does not
 * shift when it becomes current.
 *
 * @since 0.1.0
 * @status stable
 * @documentation https://fusion.dev/helix/components/tabs
 *
 * @slot - The tab's label.
 *
 * @csspart tab - The tab itself.
 *
 * @cssproperty --tabs-tab-block-size - The height of a tab. `segmented` sizes its tabs to the track and does not read it.
 * @cssproperty --tabs-tab-color - The label color of a tab that is not current.
 * @cssproperty --tabs-tab-disabled-opacity - How faint a disabled tab is drawn.
 * @cssproperty --tabs-tab-font-size - The size of a tab's label.
 * @cssproperty --tabs-tab-font-weight - The weight of a tab's label.
 * @cssproperty --tabs-tab-hover-background-color - The wash under the pointer.
 * @cssproperty --tabs-tab-hover-color - The label color under the pointer.
 * @cssproperty --tabs-tab-padding-inline - The space either side of the label.
 * @cssproperty --tabs-tab-radius - The corners of a tab, which the hover wash takes.
 * @cssproperty --tabs-tab-selected-background-color - The fill of the current tab itself, under the moving mark.
 * @cssproperty --tabs-tab-selected-color - The label color of the current tab.
 */
@customElement('helix-tab')
export class HelixTab extends HelixHeadlessTab {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-tab': HelixTab
  }
}
