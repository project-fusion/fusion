import { customElement } from '@helix-io/core'
import { HelixBaseAppHeader } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './app-header-root.css.js'

/**
 * @summary Page-level banner holding brand, navigation, and actions.
 *
 * @description
 * Flat, opaque, and in the flow. Both of the interesting things a banner can do
 * are opt-in: `sticky` because following the reader is a decision about the
 * page rather than about the bar, and `appearance="material"` because a
 * backdrop filter makes the header a containing block for `position: fixed`
 * descendants, so an overlay rendered inside a material header is placed
 * against the header rather than the viewport.
 *
 * The separating rule appears only once the page has scrolled, which keeps the
 * banner flat against a hero and lifts it off the content afterwards. There is
 * no shadow: the rule is the whole of it.
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
