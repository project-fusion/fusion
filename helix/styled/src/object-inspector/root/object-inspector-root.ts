import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessObjectInspector } from '@fusion.dev/helix-headless/object-inspector'
import type { CSSResultGroup } from 'lit'
import { styles as liveStyles } from '../../shared/live/live.css.js'
import { styles } from './object-inspector-root.css.js'
import '../../copy-button/index.js'

/**
 * @summary A structured value shown as a tree, where you can close branches,
 * see how many entries each holds, and copy any part.
 *
 * @description
 * The styled tier draws the tree in the Code Block frame. Keys and each type of
 * value take their colors from the syntax colors code blocks use. Each row is
 * one line, and a long string ends in an ellipsis, so every row has the same
 * height and a windowed tree does not measure rows one by one. A filter's
 * matches take a tinted ground, and the filter field is a band of the same
 * frame, under the label.
 *
 * @since 0.1.0
 * @status stable
 * @category data
 * @aliases JSON viewer, Object viewer, Inspector, Data explorer
 * @documentation https://fusion.dev/helix/components/object-inspector
 *
 * @cssproperty --object-inspector-background-color - The background of the tree.
 * @cssproperty --object-inspector-block-size - The height of the scrolling box when `windowed` is set.
 * @cssproperty --object-inspector-border-color - The color of the edge around the tree and its header.
 * @cssproperty --object-inspector-header-background-color - The background of the bar that holds the label.
 * @cssproperty --object-inspector-match-background-color - The background of an entry a filter matched.
 * @cssproperty --object-inspector-radius - The corner radius of the tree.
 */
@customElement('helix-object-inspector')
export class HelixObjectInspector extends HelixHeadlessObjectInspector {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = [liveStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-object-inspector': HelixObjectInspector
  }
}
