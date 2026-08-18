import { customElement } from '@helix-io/core'
import { HelixBaseSplitter } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { styles } from './splitter-root.css.js'

/**
 * @summary Two panes and a divider the reader can move.
 *
 * @description
 * The divider is a line to look at and a box to hit, and they are different
 * sizes. Drawn at the border's own width it is a one pixel pointer target, which
 * is the fault every hand-rolled splitter has; the line is a border and the
 * target is the box around it.
 *
 * It lights on hover before it is touched, because a hairline says nothing about
 * being movable, and the whole target lights rather than the line, so the thing
 * that answers the pointer is the thing that changed.
 *
 * Both panes scroll and both have their minimum size taken off them. A flex
 * item's floor is its content, so a pane holding anything scrollable would
 * otherwise refuse to go below it: the divider would stop at a width nobody
 * asked for and nothing would say why.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases SplitPane, Resizable, SplitView
 * @documentation https://helix.fusion.dev/components/splitter
 *
 * @csspart start - The box holding the first pane.
 * @csspart end - The box holding the second.
 * @csspart separator - The divider itself.
 *
 * @cssproperty --splitter-color - The line between the panes.
 * @cssproperty --splitter-hover-color - The target under the pointer.
 * @cssproperty --splitter-target - How wide the draggable box is.
 */
@customElement('helix-splitter')
export class HelixSplitter extends HelixBaseSplitter {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-splitter': HelixSplitter
  }
}
