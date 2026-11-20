import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessObjectInspector } from '@fusion.dev/helix-headless/object-inspector'
import type { CSSResultGroup } from 'lit'
import { styles as liveStyles } from '../../shared/live/live.css.js'
import { styles } from './object-inspector-root.generated.css.js'
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
 * @use A structured value, such as an API response, read as a tree you open and copy from.
 * @instead code-block - A value shown as formatted text, such as JSON in the docs.
 * @instead tree - A hierarchy you navigate, such as the files of a project.
 * @instead description-list - One level of labels and their values.
 * @anatomy header?
 * @anatomy copy
 * @anatomy toggle
 * @anatomy key
 * @anatomy count
 * @practice Name a JSON script with `for` on a page a server renders or React hydrates. - JSON text works with server rendering and with React hydration, which skips object properties.
 * @practice {windowed} Give a `windowed` inspector a height on the headless tier. - Windowing works only in a box with a height, and the styled tier sets one.
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
