import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessColumnManager } from '@fusion.dev/helix-headless/column-manager'
import type { CSSResultGroup } from 'lit'
import { styles as liveStyles } from '../../shared/live/live.css.js'
import { styles } from './column-manager-root.css.js'
import '../../checkbox/index.js'

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
 * @use Which of a Data Table's columns show, in what order, and which stay pinned.
 * @instead view-panel - A table's whole view on a phone, with the columns as one section.
 * @instead quick-filters - A saved view of a table that you switch to in one press.
 * @anatomy header
 * @anatomy item
 * @anatomy grip
 * @anatomy checkbox
 * @anatomy pin
 * @practice Put Column Manager in a Popover opened by a Columns button, or in a Drawer on a phone. - The list is the panel's content, and it draws no trigger of its own.
 * @practice Store the table's view to keep a reader's columns. - Every change goes to the table's view, and the list keeps nothing of its own.
 * @documentation https://fusion.dev/design/components/column-manager
 *
 * @cssproperty --column-manager-drop-color - The line that marks where a dragged row will land. Defaults to `--helix-color-primary`.
 * @cssproperty --column-manager-gap - The space between the parts of a row.
 * @cssproperty --column-manager-item-hover-background-color - The fill of a row under the pointer.
 * @cssproperty --column-manager-move-duration - How long a column's row takes to slide to its new place. Defaults to `--helix-duration-normal`. `0ms` moves nothing.
 * @cssproperty --column-manager-move-easing - The curve a column's row slides along. Defaults to `--helix-easing-standard`.
 * @cssproperty --column-manager-pinned-color - The ink of a pinned column's pin.
 */
@customElement('helix-column-manager')
export class HelixColumnManager extends HelixHeadlessColumnManager {
  /** Composes the styled `Checkbox`, as the styled tier's families do. */
  static override tier = 'helix-'

  static override styles: CSSResultGroup = [liveStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-column-manager': HelixColumnManager
  }
}
