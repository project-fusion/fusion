import { customElement, type ViewportControlAxes } from '@fusion.dev/helix-core'
import { HelixHeadlessGraph } from '@fusion.dev/helix-headless/graph'
import type { CSSResultGroup } from 'lit'
import { styles as liveStyles } from '../../shared/live/live.css.js'
import { styles as viewportStyles } from '../../shared/viewport/viewport.css.js'
import { styles } from './graph-root.css.js'
import '../../icon-button/index.js'
import '../../tooltip/index.js'

/**
 * @summary A frame around a graph of notes drawn by another library, and the list that makes it readable.
 *
 * @description
 * The styled frame: the drawing with its zoom and fullscreen buttons, and the
 * list of notes beside it, which moves below the drawing where the frame is
 * narrower than 40rem. The selected note leads the list on a surface of its
 * own, and the notes linked to it are named by how they link. With
 * `no-panel`, the drawing takes the whole frame, and a button among the
 * controls opens the search and the list over its end.
 *
 * The [Graphs](https://fusion.dev/design/docs/graphs) guide connects a
 * renderer, lists the keys and what a screen reader hears, and describes the
 * methods of a driver for another renderer.
 *
 * @since 0.116.0
 * @status stable
 * @category media
 * @aliases Knowledge graph, Network, Note graph, Second brain
 * @use Notes and the links between them, such as a knowledge base, with a list of every note.
 * @instead canvas - Cards and arrows that you place by hand.
 * @instead tree - Items in a hierarchy, each inside one parent.
 * @anatomy viewport
 * @anatomy controls
 * @anatomy search
 * @anatomy list
 * @practice Set `nodes` and `links` as properties, from a script. - A graph of ten thousand notes as ten thousand elements would cost what the renderer exists to save.
 * @practice On the headless tier, give the `list` part a block size. - Without one, the list grows to hold every row.
 * @documentation https://fusion.dev/design/components/graph
 *
 * @cssproperty --graph-background-color - The color behind the drawing while it loads.
 * @cssproperty --graph-block-size - The frame's height, as a length.
 * @cssproperty --graph-border-color - The frame's border color.
 * @cssproperty --graph-note-hover-color - The wash over a note in the list while the pointer is over it, and over the note the keyboard is on.
 * @cssproperty --graph-note-padding-inline - The space at either end of a note in the list.
 * @cssproperty --graph-note-relation-color - The color of how a note stands to the selected one, such as "Linked from Alpha".
 * @cssproperty --graph-note-selected-background-color - The fill behind the selected note, which leads the list.
 * @cssproperty --graph-note-selected-weight - The weight of the selected note's name.
 * @cssproperty --graph-note-text - The size of a note's name in the list.
 * @cssproperty --graph-panel-background-color - The fill behind the search and the list.
 * @cssproperty --graph-panel-color - The text color of the search and the list.
 * @cssproperty --graph-panel-size - The list's width beside the drawing, or over it when opened with `no-panel`.
 * @cssproperty --viewport-control-background-color - The background of the zoom and fullscreen buttons. Map and Canvas use the same property.
 */
@customElement('helix-graph')
export class HelixGraph extends HelixHeadlessGraph {
  static override tier = 'helix-'

  /** The controls float over the drawing, so they are raised. */
  protected override get controlAxes(): ViewportControlAxes {
    return { raised: true }
  }

  /* The live region's clip first, as that sheet asks, then the surface's,
     then this family's, so a graph's own rules win where they meet. */
  static override styles: CSSResultGroup = [liveStyles, viewportStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-graph': HelixGraph
  }
}
