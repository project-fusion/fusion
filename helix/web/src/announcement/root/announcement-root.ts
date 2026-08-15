import { customElement } from '@helix-io/core'
import { HelixBaseAnnouncement } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { styles } from './announcement-root.css.js'

/**
 * @summary A page-level message above the masthead, which can be dismissed.
 *
 * @description
 * Full width and flat, with the severity carried by a tinted fill and a
 * hairline beneath rather than by a border on four sides: an announcement is a
 * band across the top of the page, not a box that happens to be wide.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Banner, Notification bar, Alert bar
 * @documentation https://helix.fusion.dev/components/announcement
 *
 * @cssproperty --announcement-inset - Inline padding, matched to the page.
 */
@customElement('helix-announcement')
export class HelixAnnouncement extends HelixBaseAnnouncement {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-announcement': HelixAnnouncement
  }
}
