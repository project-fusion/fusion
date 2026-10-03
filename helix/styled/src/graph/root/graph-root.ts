import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessGraph } from '@fusion.dev/helix-headless/graph'
import type { CSSResultGroup } from 'lit'
import { styles as liveStyles } from '../../shared/live/live.css.js'
import { styles as viewportStyles } from '../../shared/viewport/viewport.css.js'
import { styles } from './graph-root.css.js'

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
 * @since 0.116.0
 * @status experimental
 * @category media
 * @aliases Knowledge graph, Network, Note graph, Second brain
 * @documentation https://fusion.dev/helix/components/graph
 *
 * @cssproperty --graph-background-color - The color behind the drawing while it loads.
 * @cssproperty --graph-block-size - The frame's height, as a length.
 * @cssproperty --graph-border-color - The frame's border color.
 * @cssproperty --graph-panel-size - The list's width beside the drawing, or over it when opened with `no-panel`.
 * @cssproperty --viewport-control-background-color - The background of the zoom and fullscreen buttons. Map and Canvas use the same property.
 */
@customElement('helix-graph')
export class HelixGraph extends HelixHeadlessGraph {
  /* The live region's clip first, as that sheet asks, then the surface's,
     then this family's, so a graph's own rules win where they meet. */
  static override styles: CSSResultGroup = [liveStyles, viewportStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-graph': HelixGraph
  }
}
