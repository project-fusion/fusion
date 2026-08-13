import { customElement, HelixElement } from '@helix-io/core'
import { html, type TemplateResult } from 'lit'

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
 * @since 0.1.0
 * @status experimental
 * @aliases Masthead, Navbar, TopBar
 * @documentation https://helix.fusion.dev/components/app-header
 *
 * @slot brand - Wordmark or logo, at the inline start.
 * @slot - Primary navigation.
 * @slot actions - Trailing actions, such as a call to action.
 *
 * @csspart bar - The banner itself.
 * @csspart nav - The navigation region.
 */
@customElement('helix-base-app-header')
export class HelixBaseAppHeader extends HelixElement {
  private readonly handleScroll = (): void => {
    this.toggleAttribute('data-scrolled', window.scrollY > 0)
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
      <header part="bar" role="banner">
        <slot name="brand"></slot>
        <nav part="nav"><slot></slot></nav>
        <slot name="actions"></slot>
      </header>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-app-header': HelixBaseAppHeader
  }
}
