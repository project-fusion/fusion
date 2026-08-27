import { customElement } from '@helix-io/core'
import { HelixHeadlessTabPanel } from '@helix-io/headless/tabs'
import type { CSSResultGroup } from 'lit'
import { styles } from './tab-panel.css.js'

/**
 * @summary The content shown for one tab.
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
 * @slot - The panel's content.
 *
 * @csspart panel - The panel container.
 */
@customElement('helix-tab-panel')
export class HelixTabPanel extends HelixHeadlessTabPanel {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-tab-panel': HelixTabPanel
  }
}
