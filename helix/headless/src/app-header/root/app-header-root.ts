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
 * two actions would take two tracks and push the navigation off center. These
 * wrappers earn their boxes, which is the test; they carry no inset or fill of
 * their own, so an empty one still paints nothing.
 *
 * The host is the banner and spans the viewport; the row inside it is what gets
 * centered. A banner that is itself narrowed leaves its background stopping
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
 * @csspart content - The centered row inside the banner.
 * @csspart brand - The leading region.
 * @csspart nav - The navigation region.
 * @csspart nav-indicator - The marker that travels to the current link.
 * @csspart actions - The trailing region.
 */
@customElement('helix-base-app-header')
export class HelixBaseAppHeader extends HelixElement {
  /**
   * Where the navigation sits in the bar.
   *
   * Centered by default, which reads as the site's spine when the navigation is
   * the primary thing in the header rather than an afterthought beside a logo.
   * Centered against the banner rather than against whatever space the brand
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

  private observer: ResizeObserver | undefined
  private current: MutationObserver | undefined

  /** The navigation links the consumer put in the default slot. */
  private get items(): HTMLElement[] {
    const slot = this.renderRoot.querySelector<HTMLSlotElement>('nav slot')
    return (slot?.assignedElements() ?? []) as HTMLElement[]
  }

  /**
   * Moves the marker to whichever link is current.
   *
   * The header owns this because it owns the `<nav>`. A marker that travels
   * needs something that knows where every item is, and adding a component
   * whose only job was to be that would be a container for links.
   *
   * `aria-current` is what it reads, rather than a second attribute mirroring
   * it, so the thing that makes the marker right is the same thing that makes
   * the page announce correctly.
   *
   * Geometry is written onto the marker inside the shadow root. On the host it
   * would be an inline style the element gives itself after upgrading, which a
   * consumer's server markup never has.
   */
  private place(): void {
    const marker = this.renderRoot.querySelector<HTMLElement>('[part="nav-indicator"]')
    const nav = this.renderRoot.querySelector<HTMLElement>('[part="nav"]')
    if (!marker || !nav) {
      return
    }

    const active = this.items.find((item) => item.getAttribute('aria-current') === 'page')
    if (!active) {
      marker.removeAttribute('data-placed')
      return
    }

    const box = active.getBoundingClientRect()
    if (box.width === 0) {
      return
    }
    const own = nav.getBoundingClientRect()
    marker.style.setProperty('--_nav-indicator-x', `${box.left - own.left}px`)
    marker.style.setProperty('--_nav-indicator-w', `${box.width}px`)
    marker.style.setProperty('--_nav-indicator-h', `${box.height}px`)
    marker.toggleAttribute('data-placed', true)
  }

  /** Re-measures when the links change, move, or hand over the current page. */
  private watch(): void {
    this.observer?.disconnect()
    this.current?.disconnect()
    this.place()

    this.observer = new ResizeObserver(() => this.place())
    this.observer.observe(this)
    for (const item of this.items) {
      this.observer.observe(item)
    }

    // Client-side routing changes `aria-current` in place rather than
    // reloading, so nothing else would tell the marker to move.
    this.current = new MutationObserver(() => this.place())
    for (const item of this.items) {
      this.current.observe(item, { attributeFilter: ['aria-current'] })
    }
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
    this.observer?.disconnect()
    this.current?.disconnect()
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.watch()
  }

  protected override render(): TemplateResult {
    return html`
      <div part="content">
        <div part="brand"><slot name="brand"></slot></div>
        <nav part="nav">
          <div part="nav-indicator" aria-hidden="true"></div>
          <slot @slotchange=${() => this.watch()}></slot>
        </nav>
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
