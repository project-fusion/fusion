import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessNotification } from '@fusion.dev/helix-headless/notifications'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles as glyphStyles } from '../../shared/glyph/glyph.css.js'
import { styles } from './notification.css.js'
import '../../format-date/index.js'

/**
 * @summary A single notification about something that happened, marked read or unread.
 *
 * @description
 * A four-column grid: media, body, actions, dismiss.
 *
 * **The media column is held open by the feed, not by the item.** Each item is
 * its own grid, so nothing about one row's tracks reaches the row below it: a
 * feed where some items had an avatar and some did not drew its text at two
 * different left edges, which is the fault a grid was chosen to prevent. The
 * root publishes whether anything in it has media and every item reserves that
 * much, so a mixed feed reads down one edge and a feed with no media anywhere
 * pays nothing for the column.
 *
 * **Unread is weight and a mark on the inline start edge, not a fill.** Depth
 * comes from a single border in this library, and a filled row is elevation
 * spelled differently; a feed of filled rows is a striped list nobody can read.
 * The mark is a fixed height on the first line rather than the height of the
 * row, so it says the same thing about a one line notification and a five line
 * one.
 *
 * **Narrow, the actions go under the body.** How much room the row was given is
 * a fact about this box and about nothing else, so it is a container query: a
 * feed in a 320 pixel side panel is narrow inside a 1400 pixel window, and a
 * viewport rule would hand it the wide branch.
 *
 * @since 0.1.0
 * @status stable
 * @category feedback
 * @documentation https://fusion.dev/helix/components/notifications
 *
 * @slot - What happened, in your own markup.
 * @slot actions - Actions the user can take on the notification.
 * @slot media - An avatar or icon identifying who or what it came from.
 *
 * @csspart controls - The actions and the dismiss control, shown in place of the time.
 * @csspart dismiss - The control that dismisses the notification.
 * @csspart dismiss-mark - The icon on the dismiss control, when no icon is slotted.
 * @csspart item - The whole notification.
 * @csspart time - When it happened.
 * @csspart trailing - The column holding the time and the controls.
 *
 * @cssproperty --notifications-color - Text color in a read item.
 * @cssproperty --notifications-dismiss-color - Color of the dismiss control. It is `danger`, because dismissing an item removes it for good.
 * @cssproperty --notifications-item-edge - Color of a carded row's border.
 * @cssproperty --notifications-item-fill - Fill behind a `filled` row.
 * @cssproperty --notifications-item-gap - Space between carded rows, which have no hairline.
 * @cssproperty --notifications-item-radius - Corner radius of a carded row.
 * @cssproperty --notifications-padding-block - Space above and below an item.
 * @cssproperty --notifications-padding-inline - Space either side of an item.
 * @cssproperty --notifications-rule - The hairline between items.
 * @cssproperty --notifications-unread-block-size - Length of the unread mark.
 * @cssproperty --notifications-unread-inline-size - Thickness of the unread mark.
 * @cssproperty --notifications-unread-inset - Distance from the unread mark to the row's leading edge.
 * @cssproperty --notifications-unread-mark - Color of the edge mark on an unread item.
 * @cssproperty --notifications-unread-offset - Distance from the unread mark to the row's top edge.
 * @cssproperty --notifications-unread-radius - Corner radius of the unread mark, which can turn it into a dot.
 */
@customElement('helix-notification')
export class HelixNotification extends HelixHeadlessNotification {
  static override tier = 'helix-'

  /**
   * How a row is separated from the one above it.
   *
   * `plain` is the resting one and is a hairline and nothing else: the row has
   * no box of its own, and what separates it is a line the list draws between
   * them. It is sayable rather than only reachable by leaving the attribute off,
   * which is the reason `Announcement` gives for spelling out its own neutral.
   *
   * `outlined` and `filled` make each row a box: an edge, a corner, and a gap
   * where the hairline was. A feed of boxes is a different reading of the same
   * content, and which one is right depends on whether the rows are a list to
   * scan or a set of things to act on. The reference this came from draws cards
   * because every row in it has a control.
   *
   * **On the row and not on the feed, because the row is the box being
   * separated.** A consumer wanting the whole feed carded says so once, in a
   * document rule on the element, rather than on every item: this is a styled
   * axis and a stylesheet is where it is set.
   */
  @property({ reflect: true })
  separation?: 'filled' | 'outlined' | 'plain'

  static override styles: CSSResultGroup = [glyphStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-notification': HelixNotification
  }
}
