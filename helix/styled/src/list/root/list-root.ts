import { customElement } from '@helix-io/core'
import { HelixHeadlessList } from '@helix-io/headless/list'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './list-root.css.js'

/**
 * @summary A set of rows, read as a set.
 *
 * @description
 * Rules between rows rather than around each one, so a list reads as one object
 * with divisions instead of as a stack of cards. `divided` is off by default,
 * because space alone separates rows perfectly well and a rule at every seam is
 * decoration doing what emptiness already does.
 *
 * @since 0.1.0
 * @status stable
 * @category data
 * @aliases Rows, Stack, Menu
 * @documentation https://helix.fusion.dev/components/list
 *
 * @cssproperty --list-gap - Space between rows.
 * @cssproperty --list-marker-gutter - Room the ordered and unordered markers hang into.
 * @cssproperty --list-rail-style - What a rail counts with. Any `list-style-type`.
 * @cssproperty --list-rail-width - The width of the rail's track.
 */
@customElement('helix-list')
export class HelixList extends HelixHeadlessList {
  /**
   * Whether a rule sits between rows.
   */
  @property({ reflect: true, type: Boolean })
  divided = false

  /**
   * Where the marker sits.
   *
   * On the styled tier because it is decoration, which is the other half of the
   * argument `kind` makes on the headless one: *that* a list is numbered is a
   * fact about the content, and *where the numbers are drawn* is not. A railed
   * ordered list and a plain one say the same thing about their rows.
   *
   * - unset draws the platform's marker beside the row, which is what a list of
   *   short rows wants.
   * - `rail` draws the ordinal in a track of its own at the start edge of the
   *   block, so the numbers read as a column and every row's text begins at one
   *   measure. This is how a numbered argument is set: a claim per item, prose
   *   under it, and the numbering carried down the left rather than tucked
   *   against the words.
   *
   * A rail replaces the marker rather than joining it, so it applies to
   * `unordered` too, where it numbers what a bullet did not.
   */
  @property({ reflect: true })
  marker?: 'rail'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-list': HelixList
  }
}
