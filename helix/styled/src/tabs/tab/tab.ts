import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessTab } from '@fusion.dev/helix-headless/tabs'
import type { CSSResultGroup } from 'lit'
import { styles } from './tab.css.js'

/**
 * @summary One tab in a tab list.
 *
 * @description
 * A control's height, so a tab row sits level with the buttons beside it. The
 * current tab is not marked here: one indicator travels along the tab list, and
 * each tab keeps a transparent edge of the same width so its box does not move
 * when it becomes current.
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
