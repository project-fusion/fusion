import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessList } from '@fusion.dev/helix-headless/list'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles as liveStyles } from '../../shared/live/live.css.js'
import { styles } from './list-root.css.js'

/**
 * @summary A set of rows, announced as a list.
 *
 * @description
 * `divided` draws rules between rows, so the list reads as one object with
 * divisions. It is off by default, and space alone separates the rows.
 *
 * @since 0.1.0
 * @status stable
 * @category data
 * @aliases Rows, Stack, Menu
 * @documentation https://fusion.dev/helix/components/list
 *
 * @cssproperty --list-drag-preview-background-color - The fill behind the copy of a row a pointer drags.
 * @cssproperty --list-drag-preview-border-color - The color of the edge around the copy of a row a pointer drags.
 * @cssproperty --list-drag-preview-border-width - The width of the edge around the copy of a row a pointer drags. None by default, where the shadow lifts it.
 * @cssproperty --list-drag-preview-opacity - The opacity of the copy of a row a pointer drags.
 * @cssproperty --list-drag-preview-radius - The corner radius of the copy of a row a pointer drags.
 * @cssproperty --list-drag-preview-shadow - The shadow that raises the copy of a row a pointer drags over the page.
 * @cssproperty --list-gap - The space between rows.
 * @cssproperty --list-marker-gutter - The space that the markers of ordered and unordered lists sit in.
 * @cssproperty --list-rail-inline-size - The width of the rail's track.
 * @cssproperty --list-rail-style - The counter style of the rail's numbers. Takes any `list-style-type`.
 */
@customElement('helix-list')
export class HelixList extends HelixHeadlessList {
  /**
   * Draws a line between rows.
   */
  @property({ reflect: true, type: Boolean })
  divided = false

  /**
   * Where the marker sits.
   *
   * On the styled tier because it is decoration: *that* a list is numbered is a
   * fact about the content, which `kind` carries on the headless tier, and
   * *where the numbers are drawn* is not.
   *
   * - unset draws the platform's marker beside the row, which is what a list of
   *   short rows wants.
   * - `rail` draws the ordinal in a track of its own at the start edge of the
   *   block, so the numbers read as a column and every row's text begins at one
   *   measure, which is how a numbered argument is set.
   *
   * A rail replaces the marker rather than joining it, so it applies to
   * `unordered` too, where it numbers what a bullet did not.
   */
  @property({ reflect: true })
  marker?: 'rail'

  static override styles: CSSResultGroup = [liveStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-list': HelixList
  }
}
