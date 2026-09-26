import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessNotifications } from '@fusion.dev/helix-headless/notifications'
import type { CSSResultGroup } from 'lit'
import { styles as collectionStateStyles } from '../../shared/collection/state.css.js'
import { styles as liveStyles } from '../../shared/live/live.css.js'
import { styles } from './notifications-root.css.js'
import '../notification/notification.js'

/**
 * @summary A feed of notifications, each marked read or unread.
 *
 * @description
 * Three rows: header, a list that scrolls, footer. The list scrolls and the
 * other two do not, because a panel is opened at a fixed height and a mark-all
 * control that slides away as the reader scrolls is the control they were
 * reaching for.
 *
 * **It does not virtualize and it cannot**, which is the headless tier's note
 * and worth repeating where the choice is made: the items are the consumer's own
 * elements, so N notifications is N elements by construction. A feed that really
 * holds thousands wants `helix-data-table` with a custom cell.
 *
 * @since 0.1.0
 * @status stable
 * @category feedback
 * @documentation https://fusion.dev/helix/components/notifications
 *
 * @slot - The notifications.
 * @slot footer - Below the list, for a link to everything.
 * @slot header - Above the list, for a title and the mark-all control.
 *
 * @csspart list - The list itself.
 * @csspart live - A copy of the empty and loading messages, in a live region that screen readers announce when they change. Visually hidden in the styled tier.
 * @csspart mark-all - The control that marks everything read.
 *
 * @cssproperty --notifications-max-block-size - How tall the feed may get before the list scrolls.
 * @cssproperty --notifications-media-column - Width of the media column that every item keeps when any item in the feed has media.
 * @cssproperty --notifications-padding-inline - Space either side of the header and footer.
 * @cssproperty --notifications-rule - The hairline between items and around the regions.
 */
@customElement('helix-notifications')
export class HelixNotifications extends HelixHeadlessNotifications {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = [liveStyles, collectionStateStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-notifications': HelixNotifications
  }
}
