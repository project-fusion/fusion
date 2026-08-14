import { customElement } from '@helix-io/core'
import { HelixBaseAppHeader } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './app-header-root.css.js'

/**
 * @summary Page-level banner holding brand, navigation, and actions.
 *
 * @description
 * Sticky and translucent, drawn on the material tokens so the page content
 * blurs behind it rather than being hidden by an opaque bar. The separating
 * rule and shadow appear only once the page has scrolled, which keeps the bar
 * flat against the hero and lifts it off the content afterwards.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Masthead, Navbar, TopBar
 * @documentation https://helix.fusion.dev/components/app-header
 *
 * @slot brand - Wordmark or logo, at the inline start.
 * @slot - Primary navigation.
 * @slot actions - Trailing actions, such as a call to action.
 *
 * @csspart content - The centered row inside the banner.
 * @csspart nav - The navigation region.
 *
 * @cssproperty --app-header-background - Fill behind the banner.
 * @cssproperty --app-header-height - Height of the banner.
 * @cssproperty --app-header-inset - Inline padding of the banner.
 * @cssproperty --app-header-max-inline-size - Width the content is centered in.
 */
@customElement('helix-app-header')
export class HelixAppHeader extends HelixBaseAppHeader {
  /**
   * Whether the banner is flat or a pane of material.
   *
   * Flat by default. Material is translucency plus blur, and a filter makes the
   * header a containing block for `position: fixed` descendants, so any overlay
   * rendered inside it is positioned against the header rather than the
   * viewport. Opt in knowing that.
   */
  @property({ reflect: true })
  appearance?: 'flat' | 'material'

  /**
   * Whether the banner sticks to the top of the viewport.
   *
   * Opt in, because a reflected `true` writes an attribute the server's markup
   * does not have. Every default here is the absent attribute.
   */
  @property({ reflect: true, type: Boolean })
  sticky = false

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-app-header': HelixAppHeader
  }
}
