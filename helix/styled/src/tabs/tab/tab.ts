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
