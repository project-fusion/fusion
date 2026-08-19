import { customElement } from '@helix-io/core'
import { HelixBaseTree } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './tree-root.css.js'

/**
 * @summary A tree of items, navigable entirely from the keyboard.
 *
 * @description
 * Quiet by default: no rules between rows and no fill except on the selected
 * item. A navigation tree is read by scanning, and every line of chrome added
 * to it is one more thing between the reader and the label.
 *
 * @since 0.1.0
 * @status experimental
 * @category navigation
 * @aliases FileTree, Navigation tree
 * @documentation https://helix.fusion.dev/components/tree
 *
 * @slot - The tree's items.
 *
 * @csspart tree - The tree container.
 *
 * @event {HelixSelectEvent} helix-select - Fired when an item is chosen. Dispatched by the item and listened for here, because the tree is what a consumer holds a reference to.
 *
 * @cssproperty --tree-indent - Indent added per level.
 * @cssproperty --tree-chevron-size - Size of the chevron, and the gutter a leaf reserves.
 * @cssproperty --tree-gap - Space between rows.
 * @cssproperty --tree-row-size - Least height of a row, so rows with and without an icon match.
 * @cssproperty --tree-chevron-order - Set from `chevron-placement`; read by each item.
 * @cssproperty --tree-chevron-gap - Set from `chevron-placement`; the space before the chevron.
 */
@customElement('helix-tree')
export class HelixTree extends HelixBaseTree {
  /**
   * Which end of the row the branch chevron sits at.
   *
   * Styled tier, because it is presentation and nothing else: it moves paint
   * and leaves the markup, the ARIA and the reading order exactly as they were.
   * It was written on the base class first, which the tier rule forbids for
   * precisely this kind of property.
   *
   * On the tree rather than on the item, because it is a fact about the list. A
   * navigation puts every chevron on the same side, and a per-item version
   * would make a ragged tree writable and would have to be repeated on every
   * row to say one thing.
   *
   * It is worth owning rather than leaving to `::part(toggle)`, which a
   * consumer could reach for: the naive version is `order` plus an auto margin,
   * and the row's `end` slot already carries an auto margin of its own, so the
   * two split the free space and the chevron lands halfway along. Measured at
   * 70px short. That is the kind of thing a component should absorb once.
   */
  @property({ attribute: 'chevron-placement', reflect: true })
  chevronPlacement: 'start' | 'end' = 'start'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-tree': HelixTree
  }
}
