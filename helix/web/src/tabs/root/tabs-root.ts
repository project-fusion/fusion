import { customElement } from '@helix-io/core'
import { HelixBaseTabs } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { styles } from './tabs-root.css.js'

/**
 * @summary A row of tabs and the panel each one shows.
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
 * @slot - The tabs.
 * @slot panels - The panels.
 *
 * @csspart tabs - The tab list.
 * @csspart panels - The panel container.
 */
@customElement('helix-tabs')
export class HelixTabs extends HelixBaseTabs {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-tabs': HelixTabs
  }
}
