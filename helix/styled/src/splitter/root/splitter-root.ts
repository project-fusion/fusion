import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessSplitter } from '@fusion.dev/helix-headless/splitter'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './splitter-root.css.js'

/**
 * @summary Two panes and a divider that you can move.
 *
 * @description
 * The divider's line and its pointer target are different sizes. The line is a
 * border, and the target is the larger box around it.
 *
 * The whole target lights on hover, so you can see that the divider moves
 * before you drag it.
 *
 * Both panes scroll, and both have their minimum size removed. Without this, a
 * pane holding scrollable content could not shrink below its content, and the
 * divider would stop early with no visible reason.
 *
 * The corner where a nested splitter crosses is twice the divider's target
 * size, because you aim at a point. It draws nothing except a focus ring, and
 * the `move` cursor shows what it is.
 *
 * A divider stays lit while it moves, including while a drag captures the
 * pointer and while a corner moves it. It uses the primary color while moving,
 * so the two dividers a corner moves look like one gesture.
 *
 * @since 0.1.0
 * @status stable
 * @category layout
 * @aliases SplitPane, Resizable, SplitView
 * @documentation https://fusion.dev/helix/components/splitter
 *
 * @csspart corner - The handle where a nested splitter's divider crosses this one.
 * @csspart end - The box that holds the second pane.
 * @csspart separator - The divider itself.
 * @csspart start - The box that holds the first pane.
 *
 * @cssproperty --splitter-color - Color of the line between the panes.
 * @cssproperty --splitter-corner - Width of the handle where two dividers cross.
 * @cssproperty --splitter-drag-color - Color of the line while it is being moved.
 * @cssproperty --splitter-grip-color - Color of the grip beside the line, when the grip is shown.
 * @cssproperty --splitter-grip-length - How far the grip runs along the divider.
 * @cssproperty --splitter-grip-thickness - How thick the grip is, across the divider.
 * @cssproperty --splitter-handle-color - Color of a mark slotted into `handle`.
 * @cssproperty --splitter-hover-color - Color of the divider's target under the pointer.
 * @cssproperty --splitter-hover-thickness - How thick the line is under the pointer, with focus and while it moves.
 * @cssproperty --splitter-target - Width of the area you can drag.
 * @cssproperty --splitter-thickness - How thick the line is at rest.
 */
@customElement('helix-splitter')
export class HelixSplitter extends HelixHeadlessSplitter {
  /**
   * Whether the divider shows a grip.
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
