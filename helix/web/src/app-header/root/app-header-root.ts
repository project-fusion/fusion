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
 *
 * @cssproperty --app-header-background - Fill behind the banner.
 * @cssproperty --app-header-border-color - The line under the bar. None by default.
 * @cssproperty --app-header-height - Height of the banner.
 * @cssproperty --app-header-inset - Inline padding of the banner.
 * @cssproperty --app-header-max-inline-size - Width the content is centered in.
 */
@customElement('helix-app-header')
export class HelixAppHeader extends HelixBaseAppHeader {
  /**
   * How much of what is behind the banner shows through it.
   *
   * One axis, three points, and `flat` is the default and the absent attribute.
   *
   * - `flat` is opaque. The page stops at the bar, which is what an application
   *   wants: the bar is chrome and chrome does not need to be interesting.
   * - `material` is translucent and blurred, so content passing underneath
   *   stays visible and goes soft. The page reads as one surface with a bar
   *   floating over it.
   * - `transparent` has no fill at all until something has scrolled under it,
   *   and then it takes the flat one. For a banner over a hero, where the art
   *   should reach the top of the window and the bar should only become a
   *   surface once it has to be legible over moving content.
   *
   * **`material` makes the header a containing block for `position: fixed`
   * descendants**, which is worth knowing and is narrower than it sounds. Every
   * overlay in this library goes into the top layer through the popover API or
   * `<dialog>`, and the top layer is not laid out against its DOM ancestors:
   * measured, a popover inside a blurred bar opens at the window origin while a
   * plain `position: fixed` child of the same bar opens at the bar's. So a
   * menu, a tooltip or a select in a material header is unaffected, and what is
   * caught is a consumer's own hand-positioned element.
   */
  @property({ reflect: true })
  appearance?: 'flat' | 'material' | 'transparent'

  /**
   * Whether the banner sticks to the top of the viewport.
   *
   * Opt in, because following the reader is a decision about the page rather
   * than about the bar, and because a reflected `true` writes an attribute the
   * server's markup does not have. Every default here is the absent attribute.
   *
   * It pairs with `appearance`: a bar that does not stick is only ever over the
   * top of the page, so `material` and `transparent` have nothing to be
   * translucent against and `data-scrolled` never lands.
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
