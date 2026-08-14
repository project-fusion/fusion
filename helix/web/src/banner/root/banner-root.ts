import { customElement } from '@helix-io/core'
import { HelixBaseBanner } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { styles } from './banner-root.css.js'

/**
 * @summary A page-level message above the masthead, which can be dismissed.
 *
 * @description
 * Full width and flat, with the severity carried by a tinted fill and a hairline
 * beneath rather than by a border on four sides: a banner is a band across the
 * top of the page, not a box that happens to be wide.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Announcement, Notification bar, Alert bar
 * @documentation https://helix.fusion.dev/components/banner
 *
 * @cssproperty --banner-inset - Inline padding, usually matched to the page.
 */
@customElement('helix-banner')
export class HelixBanner extends HelixBaseBanner {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-banner': HelixBanner
  }
}
