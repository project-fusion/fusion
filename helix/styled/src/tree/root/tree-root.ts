import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessTree } from '@fusion.dev/helix-headless/tree'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles as collectionStateStyles } from '../../shared/collection/state.css.js'
import { styles as liveStyles } from '../../shared/live/live.css.js'
import { styles } from './tree-root.generated.css.js'

/**
 * @summary A hierarchy of items, with branches that open and close.
 *
 * @description
 * Quiet by default: no rules between rows and no fill except on the selected
 * item, so the labels are easy to scan.
 *
 * @since 0.1.0
 * @status stable
 * @category navigation
 * @aliases FileTree, Navigation tree
 * @documentation https://fusion.dev/helix/components/tree
 *
 * @slot - The tree's items.
 *
 * @event {HelixBeforeSelectEvent} helix-before-select - Fired when an item is chosen. The item sends it, and you can listen for it on the tree. Cancelable: canceling it changes nothing.
 *
 * @csspart drag-preview - A copy of the row a pointer drags by its grip, which follows the pointer in the top layer until the item is let go, in a `reorderable` tree. Hidden from assistive technology.
 * @csspart live - A copy of the empty and loading messages, and each step of a move in a `reorderable` tree, in a live region that announces them when they change. Visually hidden in the styled tier.
 * @csspart tree - The tree container.
 *
 * @cssproperty --tree-chevron-gap - The space before the chevron. Set from `chevron-placement`.
 * @cssproperty --tree-chevron-order - The chevron's order in the row. Set from `chevron-placement` and read by each item.
 * @cssproperty --tree-chevron-size - Size of the chevron, and the gutter a leaf reserves.
 * @cssproperty --tree-drag-preview-background-color - The fill behind the copy of an item a pointer drags.
 * @cssproperty --tree-drag-preview-border-color - The color of the edge around the copy of an item a pointer drags.
 * @cssproperty --tree-drag-preview-border-width - The width of the edge around the copy of an item a pointer drags. None by default, where the shadow lifts it.
 * @cssproperty --tree-drag-preview-opacity - The opacity of the copy of an item a pointer drags.
 * @cssproperty --tree-drag-preview-radius - The corner radius of the copy of an item a pointer drags.
 * @cssproperty --tree-drag-preview-shadow - The shadow that raises the copy of an item a pointer drags over the page.
 * @cssproperty --tree-gap - Space between rows.
 * @cssproperty --tree-indent - Indent added per level.
 * @cssproperty --tree-row-size - Minimum height of a row, so rows with and without an icon match.
 */
@customElement('helix-tree')
export class HelixTree extends HelixHeadlessTree {
  /**
   * Which end of the row the branch chevron sits at.
   *
   * Styled tier, because it is presentation and nothing else: it moves paint
   * and leaves the markup, the ARIA and the reading order exactly as they were.
   *
   * On the tree rather than on the item, because it is a fact about the list. A
   * navigation puts every chevron on the same side, and a per-item version
   * would make a ragged tree writable and would have to be repeated on every
   * row to say one thing.
   *
   * **Optional, with no default.** A reflected property that defaults to a
   * value writes that value onto every host: `chevron-placement="start"`
   * appeared in the server's markup for every tree anybody rendered, which is
   * the same fault `href` and `target` had on `Button`. The resting arrangement
   * is the absence of the attribute, and the stylesheet only asks about `end`.
   *
   * `label` sets the chevron against the end of a branch's name, where the name
   * takes only its own width, and leaves the `end` slot at the row's far side.
   * A leaf is unchanged, since it has no chevron.
   *
   * It is worth owning rather than leaving to `::part(toggle)`, which a
   * consumer could reach for: the naive version is `order` plus an auto margin,
   * and the row's `end` slot already carries an auto margin of its own, so the
   * two split the free space and the chevron lands halfway along. Measured at
   * 70px short. That is the kind of thing a component should absorb once.
   */
  @property({ attribute: 'chevron-placement', reflect: true })
  chevronPlacement?: 'start' | 'end' | 'label'

  static override styles: CSSResultGroup = [liveStyles, collectionStateStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-tree': HelixTree
  }
}
