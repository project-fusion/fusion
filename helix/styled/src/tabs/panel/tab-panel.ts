import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessTabPanel } from '@fusion.dev/helix-headless/tabs'
import type { CSSResultGroup } from 'lit'
import { styles } from './tab-panel.css.js'

/**
 * @summary The content shown for one tab.
 *
 * @description
 * The panel has no box of its own, so only the panel that is showing takes
 * space. In a set of four panels, the visible one gets the full height.
 *
 * @since 0.1.0
 * @status stable
 * @documentation https://fusion.dev/helix/components/tabs
 *
 * @slot - The panel's content.
 *
 * @csspart panel - The panel container.
 *
 * @cssproperty --tab-panel-padding-block-start - The space between the tab row and the panel's content.
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
