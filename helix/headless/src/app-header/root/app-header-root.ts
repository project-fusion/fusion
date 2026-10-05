import {
  customElement,
  elementById,
  HelixElement,
  HelixScrolledEvent,
  hostAria,
} from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary Page-level banner holding brand, navigation, and actions.
 *
 * @description
 * Tracks whether the page has scrolled and sets the custom state `scrolled`, so
 * the styled tier can lift the bar without a scroll handler of its own. The
 * state is read when the element connects. A fresh load starts at the top,
 * which matches the server markup, and a reload partway down the page is
 * corrected on hydration.
 *
 * The element uses a custom state because an attribute such as `data-scrolled`,
 * written onto its own host, is one the server did not send. A hydrating
 * framework would report a mismatch whenever the page reloads far enough down.
 * `ElementInternals.states` is not in the DOM, so hydration has nothing to
 * compare. Select the state with `:state(scrolled)`.
 *
 * The page is the window unless `scroller` names the element that scrolls, for
 * an app shell whose content scrolls inside a container.
 *
 * @since 0.1.0
 * @status stable
 * @category navigation
 * @aliases Masthead, Navbar, TopBar
 * @documentation https://fusion.dev/helix/components/app-header
 *
 * @slot - The middle region, usually a `Navigation`.
 * @slot end - Trailing content.
 * @slot start - Leading content, usually a wordmark.
 *
 * @event {HelixScrolledEvent} helix-scrolled - Fired when the page crosses the
 * scroll threshold, with the new state. A custom state cannot be observed the
 * way an attribute can, so listen for this event to follow it. The event uses
 * the header's own threshold and hysteresis, so you do not need a second scroll
 * listener.
 *
 * @csspart content - The middle region.
 * @csspart end - The trailing region.
 * @csspart row - The centered row inside the banner.
 * @csspart start - The leading region.
 *
 * @cssstate scrolled - While the page is scrolled down from the top, which is when the bar lifts off it.
 */
@customElement('helix-headless-app-header')
export class HelixHeadlessAppHeader extends HelixElement {
  /**
   * Where the middle region sits in the bar.
   *
   * Centered by default, which reads as the site's spine when the navigation is
   * the primary thing in the header rather than an afterthought beside a logo.
   * Centered against the banner rather than against whatever space the brand
   * left over, so the middle of the nav is the middle of the window whatever
   * the wordmark and the actions happen to measure.
   *
   * `start` is the opt-out, for a header whose middle region trails the brand.
   *
   * **Named for the region and not for what is usually in it.** The middle slot
   * takes a search field or a breadcrumb trail as readily as a `Navigation`, so
   * the property carries the part's name, `content`.
   */
  @property({ attribute: 'content-align', reflect: true })
  contentAlign?: 'start'

  /**
   * The id of the element whose scrolling lifts the bar, for an app shell that
   * scrolls a container instead of the window. Unset is the window.
   */
  @property()
  scroller?: string

  /* Whether the bar currently believes the page has moved, kept alongside the
     custom state so a scroll that changes nothing writes nothing. */
  private scrolled = false

  /** What scroll is listened to now, so a change of `scroller` moves it. */
  private source: EventTarget | undefined

  /** The element `scroller` names, or the window. */
  private findSource(): EventTarget {
    return (this.scroller ? elementById(this, this.scroller) : null) ?? window
  }

  /**
   * Listens to the scroll source that `scroller` names now.
   *
   * A named element that is not in the document yet, such as a `<main>` the
   * parser has not reached when the header connects, is looked for once more
   * when the document has loaded.
   */
  private listen(): void {
    const next = this.findSource()
    if (next === window && this.scroller && document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.listen(), { once: true })
    }
    if (next === this.source) {
      return
    }
    this.source?.removeEventListener('scroll', this.handleScroll)
    this.source = next
    next.addEventListener('scroll', this.handleScroll, { passive: true })
    this.handleScroll()
  }

  /**
   * A band rather than a line, so the fill cannot flicker at the boundary.
   *
   * **`scrollY > 0` is a threshold with no width, and a threshold with no width
   * is a switch sitting exactly where scroll positions cluster.** Zero is not a
   * quiet place: rubber-banding overshoots past it and comes back, scroll
   * anchoring nudges by a pixel when an image or a font lands, and a
   * `scroll-behavior: smooth` jump settles by oscillating around its target.
   * Every one of those crossings toggles the state, and the fill and the blur
   * are both transitioned, so each toggle starts a fresh animation in the
   * opposite direction. What a reader sees is a bar that shimmers, and text
   * legible through it for as long as the fill is part way in.
   *
   * Eight pixels to take the fill, two to give it back. Asymmetric on purpose:
   * the bar should look attached to the top of the page for as long as it
   * honestly is, so leaving is nearly the whole way back, and arriving needs
   * enough travel to mean the reader moved rather than the layout did.
   */
  private readonly handleScroll = (): void => {
    const source = this.source ?? window
    const y = source instanceof Element ? source.scrollTop : window.scrollY
    const next = this.scrolled ? y > 2 : y > 8
    if (next === this.scrolled) {
      return
    }
    this.scrolled = next
    /* The state is what CSS selects; the event is what anything outside this
       element can hear. Both, because neither covers the other: a state cannot
       be observed and an event cannot be styled. */
    this.toggleState('scrolled', next)
    this.dispatchEvent(new HelixScrolledEvent({ scrolled: next }))
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    // On the host, since the host is the banner.
    hostAria(this.internals, { role: 'banner' })
  }

  override connectedCallback(): void {
    super.connectedCallback()
    // Never reached on the server, which is correct: there is no scroll
    // position to read there, and the un-scrolled markup it emits is what a
    // fresh load actually shows.
    this.listen()
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.source?.removeEventListener('scroll', this.handleScroll)
    this.source = undefined
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    if (changed.has('scroller') && this.isConnected) {
      this.listen()
    }
  }

  protected override render(): TemplateResult {
    return html`
      <div part="row">
        <div part="start"><slot name="start"></slot></div>
        <div part="content"><slot></slot></div>
        <div part="end"><slot name="end"></slot></div>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-app-header': HelixHeadlessAppHeader
  }
}
