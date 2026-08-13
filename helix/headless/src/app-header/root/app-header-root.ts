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
 * Brand and actions are bare slots. `<nav>` keeps its wrapper because it is a
 * landmark the navigation needs whether or not anything is in it; the other two
 * are `display: contents` when unassigned and cost nothing.
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
 * @csspart nav - The navigation region.
 */
@customElement('helix-base-app-header')
export class HelixBaseAppHeader extends HelixElement {
  /**
   * Where the navigation sits in the bar.
   *
   * `center` puts it in the middle of the banner rather than beside the brand,
   * which reads as the site's spine when the nav is the primary thing in the
   * header rather than an afterthought next to a logo.
   */
  @property({ attribute: 'nav-align', reflect: true })
  navAlign: 'start' | 'center' = 'start'

  private readonly handleScroll = (): void => {
    this.toggleAttribute('data-scrolled', window.scrollY > 0)
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    // On the host, since the host is the banner.
    this.setAttribute('role', 'banner')
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
        <slot name="brand"></slot>
        <nav part="nav"><slot></slot></nav>
        <slot name="actions"></slot>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-app-header': HelixBaseAppHeader
  }
}
