import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessSplitter } from '@fusion.dev/helix-headless/splitter'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
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
 * The corner where a nested splitter crosses is twice the divider's target,
 * because it is aimed at as a point rather than a line. It draws nothing of its
 * own: the `move` cursor already says what it is, at the moment a reader is on
 * it. A ring on focus is the exception, since with nothing drawn there would
 * otherwise be no way to see where the keyboard is.
 *
 * A divider stays lit for as long as it is moving, which `:hover` cannot say on
 * its own: a drag captures the pointer, and a corner moves the nested divider
 * while the reader is nowhere near it. It goes primary while it moves rather
 * than merely darker, because hover is a question and a drag is an answer, and
 * because a corner moving two dividers at once needs the pair to read as one
 * gesture.
 *
 * @since 0.1.0
 * @status experimental
 * @category layout
 * @aliases SplitPane, Resizable, SplitView
 * @documentation https://helix.fusion.dev/components/splitter
 *
 * @csspart corner - The handle where a nested splitter's divider crosses this one.
 * @csspart end - The box holding the second.
 * @csspart separator - The divider itself.
 * @csspart start - The box holding the first pane.
 *
 * @cssproperty --splitter-color - The line between the panes.
 * @cssproperty --splitter-corner - How wide the handle at a crossing is.
 * @cssproperty --splitter-drag-color - The line while it is being moved.
 * @cssproperty --splitter-grip-color - The grip beside the line, once it is shown.
 * @cssproperty --splitter-grip-length - How far the grip runs along the divider.
 * @cssproperty --splitter-hover-color - The target under the pointer.
 * @cssproperty --splitter-target - How wide the draggable box is.
 */
@customElement('helix-splitter')
export class HelixSplitter extends HelixHeadlessSplitter {
  /**
   * Whether the divider carries a grip.
   *
   * - `line` is the divider alone, for a splitter the reader already knows is
   *   one: an editor, a mail client, anything they open every day.
   * - `grip` adds a short capsule beside the line, for the first encounter. A
   *   hairline between two panels is a border until something says otherwise,
   *   and at rest the only thing saying otherwise is a cursor that appears once
   *   the pointer is already on it.
   *
   * `grip` rather than `handle`, which this component has already spent on the
   * corner: that is a box the reader grabs, and this is a mark that says the
   * line can be grabbed. The grip adds no hit area of its own.
   *
   * Both are writable, so a generated page can say which it means rather than
   * relying on the absence of an attribute.
   */
  @property({ reflect: true })
  variant?: 'grip' | 'line'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-splitter': HelixSplitter
  }
}
