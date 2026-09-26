import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessObjectInspector } from '@fusion.dev/helix-headless/object-inspector'
import type { CSSResultGroup } from 'lit'
import { styles } from './object-inspector-root.css.js'
import '../../copy-button/index.js'

/**
 * @summary A structured value shown as a tree, where you can close branches,
 * see how many entries each holds, and copy any part.
 *
 * @description
 * Code Block's frame around a tree of entries. Each type takes its ink from the
 * syntax set the code blocks already use, a key in one, a string in another and
 * a number, a boolean and a null in theirs, and each row is one line with a long
 * string ending in an ellipsis, so every row is one height and a windowed tree
 * never has to measure them one by one.
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
 * @cssproperty --object-inspector-radius - The corner radius of the tree.
 */
@customElement('helix-object-inspector')
export class HelixObjectInspector extends HelixHeadlessObjectInspector {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-object-inspector': HelixObjectInspector
  }
}
