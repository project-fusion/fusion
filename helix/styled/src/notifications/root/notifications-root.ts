import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessNotifications } from '@fusion.dev/helix-headless/notifications'
import type { CSSResultGroup, PropertyValues } from 'lit'
import { property } from 'lit/decorators.js'
import { styles as collectionStateStyles } from '../../shared/collection/state.css.js'
import { styles as liveStyles } from '../../shared/live/live.css.js'
import { HelixNotification } from '../notification/notification.js'
import { styles } from './notifications-root.css.js'

/**
 * @summary A feed of notifications, each marked read or unread.
 *
 * @description
 * Three rows: a header, a scrolling list, and a footer. Only the list scrolls,
 * so the controls in the header and footer stay in view in a fixed-height
 * panel.
 *
 * The list does not virtualize. The items are your own elements, so N
 * notifications are N elements. For a feed of thousands, use `helix-data-table`
 * with a custom cell.
 *
 * @since 0.1.0
 * @status stable
 * @category feedback
 * @documentation https://fusion.dev/helix/components/notifications
 *
 * @slot - The notifications.
 * @slot empty - Replaces the words of `empty-text` in the `empty` part, such as a picture and a line of your own.
 * @slot error - Replaces the words of `error-text` in the `error` part, such as a line with a retry button.
 * @slot footer - Below the list, for a link to everything.
 * @slot header - Above the list, for a title and the mark-all control.
 * @slot loading - Replaces the words of `loading-text` in the `loading` part, such as a loader.
 *
 * @csspart error - The line `error-text` shows under the rows, in the danger color.
 * @csspart list - The list itself.
 * @csspart live - A copy of the empty, loading and error messages, in a live region that screen readers announce when they change. Visually hidden in the styled tier.
 * @csspart mark-all - The control that marks everything read.
 * @csspart more - The button after the list that asks for more, while `load-more` is set. It stays while the feed is loading, in a lighter color and `aria-disabled`, so focus stays on it.
 *
 * @cssproperty --notifications-error-color - The color of the `error` line.
 * @cssproperty --notifications-item-gap - Space before the first row, and between rows, while `separation` makes every row a box.
 * @cssproperty --notifications-max-block-size - How tall the feed may get before the list scrolls.
 * @cssproperty --notifications-media-column - Width of the media column that every item keeps when any item in the feed has media.
 * @cssproperty --notifications-padding-inline - Space either side of the header and footer.
 * @cssproperty --notifications-rule - The hairline between items and around the regions.
 */
@customElement('helix-notifications')
export class HelixNotifications extends HelixHeadlessNotifications {
  static override tier = 'helix-'

  /**
   * How every row in the feed is set apart from the one above it, where the
   * row does not say for itself.
   *
   * `plain`, the resting one, separates the rows by a hairline. `outlined` and
   * `filled` make every row a box, as the row's own `separation` does, take
   * away the rule under the header, which reads as a stray line above a box,
   * and put the gap that falls between the boxes before the first one too.
   *
   * A row that sets its own `separation` keeps it, so a feed of boxes can hold
   * one plain row and the other way round.
   */
  @property({ reflect: true })
  separation?: 'filled' | 'outlined' | 'plain'

  static override styles: CSSResultGroup = [liveStyles, collectionStateStyles, styles]

  /** Tells each row the feed's `separation`, which a row that sets none takes. */
  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    for (const item of this.items) {
      if (item instanceof HelixNotification) {
        item.feedSeparation = this.separation
      }
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-notifications': HelixNotifications
  }
}
