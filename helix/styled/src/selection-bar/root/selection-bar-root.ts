import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessSelectionBar } from '@fusion.dev/helix-headless/selection-bar'
import type { CSSResultGroup } from 'lit'
import { styles } from './selection-bar-root.css.js'

/**
 * @summary A bar that says how many of a Data Table's rows are selected, with what you can do to them and a way to clear them.
 *
 * @description
 * A filled band the height of the toolbar it replaces, so the table does not
 * move as rows are selected. The count leads, the actions follow it, and
 * Clear sits at the end.
 *
 * @since 0.238.0
 * @status experimental
 * @category data
 * @aliases Bulk actions, Action bar
 * @documentation https://fusion.dev/helix/components/selection-bar
 *
 * @cssproperty --selection-bar-background-color - The fill of the bar.
 */
@customElement('helix-selection-bar')
export class HelixSelectionBar extends HelixHeadlessSelectionBar {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-selection-bar': HelixSelectionBar
  }
}
