import {
  customElement,
  deepActiveElement,
  deepContains,
  elementById,
  HelixElement,
  HelixScrolledEvent,
  hostAria,
  words,
} from '@fusion.dev/helix-core'
import { list } from '@fusion.dev/helix-icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'
import { inSectioningContent } from '../sectioning.js'

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
 * **Set `hide-on-scroll` for a bar that moves out of the way.** Scrolling down
 * past the bar's own height hides it, and scrolling up shows it again, as does
 * focus moving into it. The custom state `hidden` is on the host while it is
 * hidden, and the styled tier slides a `sticky` bar up out of view.
 *
 * **Set `fold-below` to fold the middle region on a narrow screen.** Below that
 * many pixels of the bar's own width, the middle region is hidden behind a
 * toggle at the end of the bar, named by `menu-label`. The toggle says whether
 * the region is open with `aria-expanded`, and the region opens below the row.
 * Escape closes it and puts focus back on the toggle. The custom state
 * `folded` is on the host while the bar is that narrow, and `open` while the
 * folded region is open. A server serves the bar unfolded, and the browser
 * folds it once it has measured it.
 *
 * The host is the page's `banner` landmark. Placed inside `main`, `article`,
 * `aside`, `nav` or `section`, it is a plain box instead, as a native
 * `<header>` is there, so a header inside a card or a pane does not add a
 * second banner. The ancestors are read as the accessibility tree reads them,
 * through the slots that take the header in, so one slotted into a component
 * that draws a `<nav>`, such as `Navigation`, is not a banner either. A server
 * cannot see the ancestors, so it serves the banner and the browser corrects
 * it when the element connects.
 *
 * @since 0.1.0
 * @status stable
 * @category navigation
 * @aliases Masthead, Navbar, TopBar
 * @documentation https://fusion.dev/helix/components/app-header
 *
 * @slot - The middle region, usually a `Navigation`.
 * @slot end - Trailing content.
 * @slot menu-icon - Replaces the glyph inside the toggle that opens a folded middle region.
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
 * @csspart toggle - The control that opens and closes the folded middle region, drawn while the bar is narrower than `fold-below`.
 * @csspart toggle-mark - The glyph on the toggle, where none is slotted.
 *
 * @cssstate folded - While the bar is narrower than `fold-below`, and the middle region is behind the toggle.
 * @cssstate hidden - While `hide-on-scroll` has the bar out of the way, after a scroll down.
 * @cssstate open - While the folded middle region is open.
 * @cssstate scrolled - While the page is scrolled down from the top, which is when the bar lifts off it.
 */
@customElement('helix-headless-app-header')
export class HelixHeadlessAppHeader extends HelixElement {
  /**
   * The key this family's words are registered under, its styled tag:
   * `registerWords('de', { 'helix-app-header': { menuLabel: 'Menü' } })`.
   */
  static words = 'helix-app-header'

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
   * The width of the bar, in pixels, below which the middle region folds behind
   * a toggle. Unset, it never folds.
   */
  @property({ attribute: 'fold-below', type: Number })
  foldBelow?: number

  /**
   * Hides the bar as the page scrolls down past it, and shows it again as the
   * page scrolls up.
   */
  @property({ attribute: 'hide-on-scroll', type: Boolean })
  hideOnScroll = false

  /** Whether the bar is narrower than `fold-below`, which only the observer sets. */
  @state()
  private folded = false

  /** Whether the folded middle region is open. */
  @state()
  private unfolded = false

  /** Watches the bar's own width while `fold-below` is set. */
  private widths: ResizeObserver | undefined

  /** Starts or stops watching the width, according to `fold-below`. */
  private watchWidth(): void {
    if (!this.foldBelow || typeof ResizeObserver === 'undefined') {
      this.widths?.disconnect()
      this.widths = undefined
      this.folded = false
      return
    }
    if (this.widths) {
      return
    }
    this.widths = new ResizeObserver(([entry]) => {
      const width = entry?.borderBoxSize?.[0]?.inlineSize ?? entry?.contentRect.width ?? 0
      /* Zero is a bar not laid out yet, which is no narrow bar. */
      if (width > 0) {
        this.fold(width)
      }
    })
    this.widths.observe(this)
  }

  /** Folds the middle region where the bar is narrower than `fold-below`. */
  private fold(width: number): void {
    const folded = this.foldBelow !== undefined && width < this.foldBelow
    if (folded !== this.folded) {
      this.folded = folded
      this.unfolded = false
    }
  }

  /** Opens or closes the folded middle region. */
  private readonly handleToggle = (): void => {
    this.unfolded = !this.unfolded
  }

  /** Escape in the open region closes it and puts focus back on the toggle. */
  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || !this.unfolded || event.defaultPrevented) {
      return
    }
    event.preventDefault()
    this.unfolded = false
    void this.updateComplete.then(() => this.partNamed('toggle')?.focus())
  }

  /** Whether the bar is out of the way, under `hide-on-scroll`. */
  private away = false

  /** Where the page was last scrolled to, to tell down from up. */
  private lastY = 0

  /** Shows a hidden bar again when focus moves into it. */
  private readonly handleFocusIn = (): void => {
    this.hide(false)
  }

  /** Hides the bar or shows it again, under `hide-on-scroll`. */
  private hide(away: boolean): void {
    if (away === this.away) {
      return
    }
    this.away = away
    this.toggleState('hidden', away)
  }

  /**
   * Hides the bar on a scroll down past its own height, and shows it on a
   * scroll up. A few pixels either way are not a direction, so a bar does not
   * flicker under a hand resting on a trackpad. Not while focus is in the bar
   * or its folded region is open, which a reader is using.
   */
  private follow(y: number): void {
    const moved = y - this.lastY
    this.lastY = y
    if (!this.hideOnScroll) {
      this.hide(false)
      return
    }
    const height = this.getBoundingClientRect().height
    if (y <= height) {
      this.hide(false)
    } else if (moved > 4 && !this.unfolded && !deepContains(this, deepActiveElement())) {
      this.hide(true)
    } else if (moved < -4) {
      this.hide(false)
    }
  }
  /** The name of the toggle that opens a folded middle region. */
  @words
  @property({ attribute: 'menu-label' })
  menuLabel = 'Menu'

  /**
   * The id of the element whose scrolling lifts the bar, for an app shell that
   * scrolls a container instead of the window. Unset is the window.
   */
  @property()
  scroller?: string

  /* The role the host takes: `banner`, or none inside sectioning content. Read
     when the element connects, since a server has no ancestors to read. */
  private landmark: 'banner' | '' = 'banner'

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
    this.follow(y)
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
    hostAria(this.internals, { role: this.landmark })
    this.toggleState('folded', this.folded)
    this.toggleState('open', this.folded && this.unfolded)
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.readLandmark()
    /* Again once the components around it have drawn, which is when a slot
       they render, inside a `<nav>` of theirs, has taken this element in. */
    setTimeout(() => {
      if (this.isConnected) {
        this.readLandmark()
      }
    })
    // Never reached on the server, which is correct: there is no scroll
    // position to read there, and the un-scrolled markup it emits is what a
    // fresh load actually shows.
    this.listen()
    this.addEventListener('focusin', this.handleFocusIn)
    this.addEventListener('keydown', this.handleKeydown)
    if (this.hasUpdated) {
      this.watchWidth()
    }
  }

  /** Whether this header is the page's banner, read from where it sits. */
  private readLandmark(): void {
    this.landmark = inSectioningContent(this) ? '' : 'banner'
    hostAria(this.internals, { role: this.landmark })
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.source?.removeEventListener('scroll', this.handleScroll)
    this.source = undefined
    this.removeEventListener('focusin', this.handleFocusIn)
    this.removeEventListener('keydown', this.handleKeydown)
    this.widths?.disconnect()
    this.widths = undefined
  }

  /** The `fold-below` the width watch was started for, so a change is measured at once. */
  private watchedFor: number | undefined

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.watchedFor = this.foldBelow
    this.watchWidth()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    if (changed.has('scroller') && this.isConnected) {
      this.listen()
    }
    /* A `fold-below` set after the first render: the observer reports a size
       only when it changes, so the bar is measured here. */
    if (this.foldBelow !== this.watchedFor) {
      this.watchedFor = this.foldBelow
      this.watchWidth()
      const width = this.getBoundingClientRect().width
      if (this.widths && width > 0) {
        this.fold(width)
      }
    }
    if (changed.has('hideOnScroll') && !this.hideOnScroll) {
      this.hide(false)
    }
  }

  /**
   * The glyph on the toggle that opens a folded middle region, behind a seam:
   * slot fallback, so a consumer replaces it by slotting, and a method, so a
   * tier above replaces it by overriding.
   */
  protected renderMenuIcon(): TemplateResult {
    return html`<slot name="menu-icon">
      <svg part="toggle-mark" fill="currentColor" viewBox=${list.viewBox} aria-hidden="true">
        ${unsafeSVG(list.content)}
      </svg>
    </slot>`
  }

  protected override render(): TemplateResult {
    return html`
      <div part="row">
        <div part="start"><slot name="start"></slot></div>
        <div part="content" id="content" ?hidden=${this.folded && !this.unfolded}><slot></slot></div>
        <div part="end"><slot name="end"></slot>${
          this.folded
            ? html`<button
                part="toggle"
                type="button"
                aria-controls="content"
                aria-expanded=${this.unfolded ? 'true' : 'false'}
                aria-label=${this.menuLabel}
                @click=${this.handleToggle}
              >
                ${this.renderMenuIcon()}
              </button>`
            : nothing
        }</div>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-app-header': HelixHeadlessAppHeader
  }
}
