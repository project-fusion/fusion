import { customElement, HelixElement, HelixScrolledEvent, hostAria } from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary Page-level banner holding brand, navigation, and actions.
 *
 * @description
 * Tracks whether the page has scrolled and carries it as the custom state
 * `scrolled`, so the styled tier can lift the bar off the page without a scroll
 * handler of its own. Scroll position is the one piece of state the server
 * genuinely cannot know, so it is read on connect rather than derived: a fresh
 * load starts at the top, which is what the server rendered, and a reload
 * part-way down corrects on hydration.
 *
 * **A custom state and never `data-scrolled`.** An attribute the element writes
 * onto its own host is one the server did not send, so a hydrating framework
 * reports the tree as mismatched, intermittently: only when the reader reloads
 * far enough down the page to pass the threshold. A consumer can answer that
 * only by suppressing hydration warnings on an element they did not write.
 * `ElementInternals.states` is deliberately not in the DOM, so there is nothing
 * for a hydration pass to disagree with, and `:state(scrolled)` selects it. The
 * base class made the same move for `data-settled` and its note explains the
 * rest.
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
 * @status stable
 * @category navigation
 * @aliases Masthead, Navbar, TopBar
 * @documentation https://helix.fusion.dev/components/app-header
 *
 * @slot - The middle region, usually a `Navigation`.
 * @slot end - Trailing content.
 * @slot start - Leading content, usually a wordmark.
 *
 * @event {HelixScrolledEvent} helix-scrolled - Fired when the page crosses the
 * threshold, with the new state. A custom state cannot be observed the way an
 * attribute could, so the header says when it changes rather than leaving
 * consumers to run a second scroll listener and disagree about the hysteresis.
 *
 * @csspart content - The middle region.
 * @csspart end - The trailing region.
 * @csspart row - The centered row inside the banner.
 * @csspart start - The leading region.
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

  /* Whether the bar currently believes the page has moved, kept alongside the
     custom state so a scroll that changes nothing writes nothing. */
  private scrolled = false

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
    const y = window.scrollY
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
    window.addEventListener('scroll', this.handleScroll, { passive: true })
    this.handleScroll()
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    window.removeEventListener('scroll', this.handleScroll)
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
