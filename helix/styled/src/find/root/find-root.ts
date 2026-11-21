import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessFind } from '@fusion.dev/helix-headless/find'
import type { CSSResultGroup } from 'lit'
import { styles as glyphStyles } from '../../shared/glyph/glyph.css.js'
import { styles as liveStyles } from '../../shared/live/live.css.js'
import { styles } from './find-root.css.js'
import '../../button/index.js'
import '../../icon-button/index.js'
import '../../toolbar/index.js'

/**
 * @summary A bar that finds words in content and moves among the matches.
 *
 * @description
 * Drawn as the find bars of Terminal and Code Editor are: a dense strip on the
 * raised surface, with a line under it where it meets the content. Place it
 * above the content it searches, such as at the top of a pane, or make it
 * sticky with `position: sticky` on the element.
 *
 * Every match is painted with `::highlight(helix-find-match)` and the current
 * one with `::highlight(helix-find-current)`, both in the base layer.
 *
 * @since 0.220.0
 * @status experimental
 * @category navigation
 * @aliases Find in page, Search bar, Find and replace, Search in content
 * @use Words to find in a block of content, such as an article, a log, or a file of code.
 * @instead command - Commands you find by typing, from anywhere on the page.
 * @instead filter-input - Filters that narrow a list or a table.
 * @anatomy field
 * @anatomy count
 * @anatomy previous
 * @anatomy next
 * @anatomy close
 * @practice Copy the `::highlight(helix-find-match)` and `::highlight(helix-find-current)` rules into a shadow root of yours that holds text to search. - Text is painted from the tree it lives in.
 * @documentation https://fusion.dev/design/components/find
 *
 * @cssproperty --find-background-color - The bar's fill. Defaults to the raised surface.
 * @cssproperty --find-border-color - The line under the bar and the fields' edges.
 * @cssproperty --find-field-background-color - The fields' fill. Defaults to the page's background.
 */
@customElement('helix-find')
export class HelixFind extends HelixHeadlessFind {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = [liveStyles, glyphStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-find': HelixFind
  }
}
