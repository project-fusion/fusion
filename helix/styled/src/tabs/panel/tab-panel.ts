import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessTabPanel } from '@fusion.dev/helix-headless/tabs'
import type { CSSResultGroup } from 'lit'
import { styles } from './tab-panel.css.js'

/**
 * @summary The content shown for one tab.
 *
 * @description
 * No box of its own, so only the panel that is showing takes space: a tab set
 * with four panels gives the visible one the whole height rather than a
 * quarter of it.
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
