import { customElement } from '@helix-io/core'
import { HelixHeadlessNotifications } from '@helix-io/headless/notifications'
import type { CSSResultGroup } from 'lit'
import { styles } from './notifications-root.css.js'
import '../item/notifications-item.js'

/**
 * @summary A feed a reader comes back to, made of notifications they may not have seen.
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
 * @status experimental
 * @category feedback
 * @documentation https://helix.fusion.dev/components/notifications
 *
 * @slot - The notifications, as `helix-notifications-item` children.
 * @slot header - Above the list, for a title and the mark-all control.
 * @slot footer - Below the list, for a link to everything.
 *
 * @csspart list - The list itself.
 * @csspart mark-all - The control that marks everything read.
 *
 * @cssproperty --notifications-max-height - How tall the feed may get before the list scrolls.
 * @cssproperty --notifications-media-column - The gutter every item holds open where something in the feed has media.
 * @cssproperty --notifications-rule - The hairline between items and around the regions.
 * @cssproperty --notifications-padding-inline - Space either side of the header and footer.
 */
@customElement('helix-notifications')
export class HelixNotifications extends HelixHeadlessNotifications {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-notifications': HelixNotifications
  }
}
