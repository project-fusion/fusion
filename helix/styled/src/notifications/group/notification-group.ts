import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessNotificationGroup } from '@fusion.dev/helix-headless/notifications'
import type { CSSResultGroup } from 'lit'
import { styles } from './notification-group.css.js'

/**
 * @summary A named set of notifications, which can be collapsed to the first of
 * them.
 *
 * @description
 * The heading is chrome: it says which pile a reader is looking at and is never
 * the thing they came to read, so it is drawn quieter than a row's title. A feed
 * cut into five days has five of these, and a heading at the weight of the
 * content turns a list of notifications into a list of dates.
 *
 * **The stack is two lines rather than two cards.** Collapsed, the rows behind
 * the first are not rendered at all, so there is nothing to see through: what
 * draws the pile is a pair of pseudo-elements above the visible row, offset and
 * inset so they read as the top edges of cards behind it. A shadow could not do
 * it, spreading on four sides where this has a top edge and no bottom one, and
 * having no way to sit narrower than the thing it is behind, which is the cue
 * that says there is something back there.
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
