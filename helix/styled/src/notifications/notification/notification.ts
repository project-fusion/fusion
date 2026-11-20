import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessNotification } from '@fusion.dev/helix-headless/notifications'
import type { CSSResultGroup, PropertyValues } from 'lit'
import { property } from 'lit/decorators.js'
import { styles as glyphStyles } from '../../shared/glyph/glyph.css.js'
import { styles } from './notification.generated.css.js'
import '../../format-date/index.js'

/**
 * @summary A single notification about something that happened, marked read or unread.
 *
 * @description
 * A four-column grid: media, body, actions, and dismiss.
 *
 * The feed holds the media column open. Each item is its own grid, so the root
 * reports whether any item has media, and every item reserves that column. In a
 * mixed feed, all text starts at one edge. A feed with no media reserves no
 * column.
 *
 * Unread is shown by font weight and a mark on the inline start edge. The row
 * has no fill, because depth in Helix comes from a single border. The mark has
 * a fixed height on the first line, so it looks the same on a one-line and a
 * five-line notification.
 *
 * In a narrow container, the actions move under the body. This is a container
 * query, so a feed in a 320 pixel side panel gets the narrow layout inside a
 * 1400 pixel window.
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
 *
 * @cssstate feed-filled - The feed's `separation` is `filled` and the row sets none of its own, so the row is drawn as `filled`.
 * @cssstate feed-outlined - The feed's `separation` is `outlined` and the row sets none of its own, so the row is drawn as `outlined`.
 */
@customElement('helix-notification')
export class HelixNotification extends HelixHeadlessNotification {
  static override tier = 'helix-'

  /**
   * @internal Set by the feed: its own `separation`, which this row takes
   * where it sets none, as `:state(feed-filled)` or `:state(feed-outlined)`.
   */
  @property({ attribute: false })
  feedSeparation: 'filled' | 'outlined' | 'plain' | undefined = undefined

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
   * **On the row, because the row is the box being separated, and on the
   * feed for every row at once.** A feed's own `separation` is taken by each
   * row that sets none, and a row that sets one keeps it, `plain` included.
   */
  @property({ reflect: true })
  separation?: 'filled' | 'outlined' | 'plain'

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    const taken = this.separation ? undefined : this.feedSeparation
    this.toggleState('feed-filled', taken === 'filled')
    this.toggleState('feed-outlined', taken === 'outlined')
  }

  static override styles: CSSResultGroup = [glyphStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-notification': HelixNotification
  }
}
