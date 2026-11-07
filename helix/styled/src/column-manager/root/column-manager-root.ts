import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessColumnManager } from '@fusion.dev/helix-headless/column-manager'
import type { CSSResultGroup } from 'lit'
import { styles as liveStyles } from '../../shared/live/live.css.js'
import { styles } from './column-manager-root.css.js'

/**
 * @summary A list of a Data Table's columns, to show, hide, reorder, and pin them.
 *
 * @description
 * Each column is a row of the panel's height for a control, with its grip and
 * pin button drawn quietly until the row is under the pointer or holds focus.
 * A hidden column's name is muted, and a pinned column's pin is drawn in the
 * primary color.
 *
 * @since 0.238.0
 * @status experimental
 * @category data
 * @aliases Column picker, Column chooser
 * @documentation https://fusion.dev/helix/components/column-manager
 *
 * @cssproperty --column-manager-gap - The space between the parts of a row.
 * @cssproperty --column-manager-item-hover-background-color - The fill of a row under the pointer.
 * @cssproperty --column-manager-pinned-color - The ink of a pinned column's pin.
 */
@customElement('helix-column-manager')
export class HelixColumnManager extends HelixHeadlessColumnManager {
  static override styles: CSSResultGroup = [liveStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-column-manager': HelixColumnManager
  }
}
