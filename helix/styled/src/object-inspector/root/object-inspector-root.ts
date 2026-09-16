import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessObjectInspector } from '@fusion.dev/helix-headless/object-inspector'
import type { CSSResultGroup } from 'lit'
import { styles } from './object-inspector-root.css.js'
import '../../copy-button/index.js'

/**
 * @summary A value read as a tree: collapse what you do not need, count what
 * you collapsed, copy the part you do.
 *
 * @description
 * Code Block's frame around a tree of entries. Each type takes its ink from the
 * syntax set the code blocks already use, a key in one, a string in another and
 * a number, a boolean and a null in theirs, and each row is one line with a long
 * string ending in an ellipsis, so every row is one height and a windowed tree
 * never has to measure them one by one.
 *
 * @since 0.1.0
 * @status experimental
 * @category data
 * @aliases JSON viewer, Object viewer, Inspector, Data explorer
 * @documentation https://fusion.dev/helix/components/object-inspector
 *
 * @cssproperty --object-inspector-background-color - Ground under the tree.
 * @cssproperty --object-inspector-block-size - Height of the scrolling box, when windowed.
 * @cssproperty --object-inspector-border-color - The edge around the tree and its header.
 * @cssproperty --object-inspector-header-background-color - The bar carrying the label.
 * @cssproperty --object-inspector-radius - Corner radius of the tree.
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
