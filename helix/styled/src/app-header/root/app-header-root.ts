import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessAppHeader } from '@fusion.dev/helix-headless/app-header'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './app-header-root.css.js'

/**
 * @summary Page-level banner holding brand, navigation, and actions.
 *
 * @description
 * The header is flat, opaque, and in the document flow. Two behaviors are
 * opt-in:
 *
 * - `sticky` keeps the header in view while the page scrolls. Whether it should
 *   follow the page is a decision about the page.
 * - `material` adds a backdrop filter. The filter makes the header a containing
 *   block for `position: fixed` descendants, so an overlay rendered inside a
 *   material header is positioned against the header.
 *
 * A separating rule appears once the page has scrolled, so the header sits flat
 * against a hero and lifts off the content afterwards. The header has no
 * shadow.
 *
 * @since 0.1.0
 * @status stable
 * @category navigation
 * @aliases Masthead, Navbar, TopBar
 * @documentation https://fusion.dev/helix/components/app-header
 *
 * @slot - Primary navigation.
 * @slot end - Trailing content, usually a call to action.
 * @slot start - Leading content, usually a wordmark.
 *
 * @csspart content - The centered row inside the banner.
 *
 * @cssproperty --app-header-backdrop - The filter behind the banner. Set it to `none` when you pair the header with a panel.
 * @cssproperty --app-header-background-color - Fill behind the banner.
 * @cssproperty --app-header-block-size - Height of the banner.
 * @cssproperty --app-header-border-color - The line under the bar. None by default.
 * @cssproperty --app-header-max-inline-size - Width the content is centered in.
 * @cssproperty --app-header-padding - Inline padding of the banner.
 */
@customElement('helix-app-header')
export class HelixAppHeader extends HelixHeadlessAppHeader {
  /**
   * What the banner is made of, which sets how much of the page behind it
   * shows through.
   *
   * One axis, and absent is opaque, per the rule that a reflected property
   * takes no default.
   *
   * - Absent is opaque. The page stops at the bar, which is what an application
   *   wants: the bar is chrome and chrome does not need to be interesting.
   * - `glass` is translucent and blurred, so content passing underneath stays
   *   visible and goes soft. The page reads as one surface with a bar floating
   *   over it.
   * - `frosted` is the same pair turned up: less shows through and the blur is
   *   heavier.
   * - `transparent` has no fill at all until something has scrolled under it,
   *   and then it takes the glass. For a banner over a hero, where the art
   *   should reach the top of the window and the bar should only become a
   *   surface once it has to be legible over moving content.
   *
   * **This belongs to `material` and not to a shape or an appearance.** The
   * library's test is the one `Card` states: `separation` is where a surface
   * ends, `tone` is what it means, `material` is what it is made of, and a
   * property belongs to `material` when it can be true at the same time as the
   * other two. Every value here varies exactly one quantity, translucency. The
   * proof is inside the component: scrolled, `transparent` emits the same two
   * declarations `glass` does, so two of the points are the same material
   * arriving at different times.
   *
   * **One axis rather than two, and that is the whole reason it stays an
   * enum.** The values are mutually exclusive: a bar cannot be opaque and
   * see-through. Splitting the glass out onto a second property would make
   * `material="glass"` and a transparent flag sayable together, which is a
   * state with nothing to mean, where an enum makes it unsayable.
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
  material?: 'frosted' | 'glass' | 'transparent'

  /**
   * Whether the banner sticks to the top of the viewport.
   *
   * Opt in, because following the reader is a decision about the page rather
   * than about the bar, and because a reflected `true` writes an attribute the
   * server's markup does not have. Every default here is the absent attribute.
   *
   * It pairs with `material`: a bar that does not stick is only ever over the
   * top of the page, so `glass` and `transparent` have nothing to be
   * translucent against and the `scrolled` state never lands.
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
