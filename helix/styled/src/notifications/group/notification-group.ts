import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessNotificationGroup } from '@fusion.dev/helix-headless/notifications'
import type { CSSResultGroup } from 'lit'
import { styles } from './notification-group.css.js'

/**
 * @summary A named set of notifications, which can be collapsed to the first of
 * them.
 *
 * @description
 * The heading is drawn quieter than a row's title. It labels a group, and at
 * full weight a feed split into days would read as a list of dates.
 *
 * In a collapsed group, the rows after the first are not rendered. Two
 * pseudo-elements above the visible row draw the stack, offset and inset so
 * they look like the top edges of cards behind it. A shadow cannot draw this,
 * because it spreads on all four sides and cannot be narrower than the element
 * it is behind.
 *
 * @since 0.24.0
 * @status stable
 * @category feedback
 * @aliases NotificationSection, FeedGroup
 * @documentation https://fusion.dev/helix/components/notifications
 *
 * @event {HelixBeforeCloseEvent} helix-before-close - Fired before the group collapses. Cancelable.
 * @event {HelixBeforeOpenEvent} helix-before-open - Fired before the group expands. Cancelable: cancel it to keep the group collapsed.
 */
@customElement('helix-notification-group')
export class HelixNotificationGroup extends HelixHeadlessNotificationGroup {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-notification-group': HelixNotificationGroup
  }
}
