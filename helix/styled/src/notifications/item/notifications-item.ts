import { customElement } from '@helix-io/core'
import { HelixHeadlessNotificationsItem } from '@helix-io/headless/notifications'
import type { CSSResultGroup } from 'lit'
import { styles } from './notifications-item.css.js'

/**
 * @summary One thing that happened, which a reader may not have seen yet.
 *
 * @description
 * A three-column grid: media, body, actions. A grid rather than a flex row,
 * because the media column has to line up down the feed whether or not every
 * item has one, and a flex row collapses the empty ones so every line of text
 * starts somewhere different.
 *
 * **Unread is weight and a mark on the inline start edge, not a fill.** Depth
 * comes from a single border in this library, and a filled row is elevation
 * spelled differently; a feed of filled rows is a striped list nobody can read.
 *
 * @since 0.1.0
 * @status experimental
 * @category feedback
 * @documentation https://helix.fusion.dev/components/notifications
 *
 * @slot - What happened, in the consumer's own markup.
 * @slot media - An avatar or icon identifying who or what it came from.
 * @slot actions - What a reader can do about it.
 *
 * @csspart item - The whole notification.
 * @csspart time - When it happened.
 * @csspart dismiss - The control that removes it.
 *
 * @cssproperty --notifications-rule - The hairline between items.
 * @cssproperty --notifications-color - Ink in an item that has been read.
 * @cssproperty --notifications-unread-mark - The edge mark on an unread item.
 * @cssproperty --notifications-padding-block - Space above and below an item.
 * @cssproperty --notifications-padding-inline - Space either side of an item.
 */
@customElement('helix-notifications-item')
export class HelixNotificationsItem extends HelixHeadlessNotificationsItem {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-notifications-item': HelixNotificationsItem
  }
}
