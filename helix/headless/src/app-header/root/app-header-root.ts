import { customElement, HelixElement } from '@helix-io/core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary Page-level banner holding brand, navigation, and actions.
 *
 * @description
 * Tracks whether the page has scrolled and reflects it as `data-scrolled`, so
 * the styled tier can lift the bar off the page without a scroll handler of its
 * own. Scroll position is the one piece of state the server genuinely cannot
 * know, so it is read on connect rather than derived: a fresh load starts at
 * the top, which is what the server rendered, and a reload part-way down
 * corrects on hydration.
 *
 * The listener is passive and reads `scrollY` only, so it never blocks
 * scrolling.
 *
 * Three regions, each in its own wrapper, because the row is a grid and a grid
 * needs three items to put the middle one in the middle. A bare slot is
 * `display: contents`, so its assigned elements become grid items themselves:
 * two actions would take two tracks and push the navigation off centre. These
 * wrappers earn their boxes, which is the test; they carry no inset or fill of
 * their own, so an empty one still paints nothing.
 *
 * The host is the banner and spans the viewport; the row inside it is what gets
 * centred. A banner that is itself narrowed leaves its background stopping
 * short of the window edges, which reads as a floating bar rather than as the
 * top of the page. That needs one element and one row, not a wrapper as well:
 * the host carries the material and `content` carries the measure.
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
 * @csspart content - The centred row inside the banner.
 * @csspart brand - The leading region.
 * @csspart nav - The navigation region.
 * @csspart actions - The trailing region.
 */
@customElement('helix-base-app-header')
export class HelixBaseAppHeader extends HelixElement {
  /**
   * Where the navigation sits in the bar.
   *
   * Centred by default, which reads as the site's spine when the navigation is
   * the primary thing in the header rather than an afterthought beside a logo.
   * Centred against the banner rather than against whatever space the brand
   * left over, so the middle of the nav is the middle of the window whatever
   * the wordmark and the actions happen to measure.
   *
   * `start` is the opt-out, for a header whose navigation trails the brand.
   */
  @property({ attribute: 'nav-align', reflect: true })
  navAlign?: 'start'

  private readonly handleScroll = (): void => {
    this.toggleAttribute('data-scrolled', window.scrollY > 0)
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    // On the host, since the host is the banner.
    this.internals.role = 'banner'
  }

  override connectedCallback(): void {
    super.connectedCallback()
    // Never reached on the server, which is correct: there is no scroll
    // position to read there, and the un-scrolled markup it emits is what a
    // fresh load actually shows.
    window.addEventListener('scroll', this.handleScroll, { passive: true })
    this.handleScroll()
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    window.removeEventListener('scroll', this.handleScroll)
  }

  protected override render(): TemplateResult {
    return html`
      <div part="content">
        <div part="brand"><slot name="brand"></slot></div>
        <nav part="nav"><slot></slot></nav>
        <div part="actions"><slot name="actions"></slot></div>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-app-header': HelixBaseAppHeader
  }
}
