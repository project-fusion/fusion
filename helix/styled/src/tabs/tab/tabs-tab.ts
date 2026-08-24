import { customElement } from '@helix-io/core'
import { HelixHeadlessTabsTab } from '@helix-io/headless/tabs'
import type { CSSResultGroup } from 'lit'
import { styles } from './tabs-tab.css.js'

/**
 * @summary One tab in a tab list.
 *
 * @description
 * Selection is marked with a rule under the active tab rather than a filled
 * pill, which keeps the row flat and lets the underline animate between tabs as
 * a movement instead of two separate fills.
 *
 * @since 0.1.0
 * @status experimental
 * @documentation https://helix.fusion.dev/components/tabs
 *
 * @slot - The tab's label.
 *
 * @csspart tab - The tab itself.
 */
@customElement('helix-tabs-tab')
export class HelixTabsTab extends HelixHeadlessTabsTab {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-tabs-tab': HelixTabsTab
  }
}
