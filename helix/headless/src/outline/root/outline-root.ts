import {
  customElement,
  HelixActivateEvent,
  HelixElement,
  IndicatorController,
} from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'

/**
 * @summary Links to the headings on this page, marking the one being read.
 *
 * @description
 * A table of contents, named for the job. It sits beside `Navigation`, which is
 * the same job at the other scale: one navigates a site, the other a document.
 *
 * **The links are the consumer's own anchors.** A router renders its own `<a>`
 * and cannot render one inside this shadow root, and the hrefs are fragments
 * the page already knows.
 *
 * **What is current is decided by position, not by intersection.** An
 * `IntersectionObserver` with a band near the top fails in both directions:
 * with headings far apart nothing is in the band and the marker goes out, and
 * with headings close together several are in it at once.
 *
 * @since 0.1.0
 * @status stable
 * @category navigation
 * @aliases Table of contents, On this page, Outline
 * @documentation https://fusion.dev/helix/components/outline
 *
 * @slot - The links, as anchors with fragment hrefs.
 *
 * @event {HelixActivateEvent} helix-activate - The section being read has changed, carrying its id as the value. An announcement: it is read off where the page is scrolled to, so there is no decision here to take.
 *
 * @csspart indicator - The mark that travels to the section being read.
 * @csspart nav - The navigation landmark.
 */
@customElement('helix-headless-outline')
export class HelixHeadlessOutline extends HelixElement {
  /* The mark. Vertical, which the controller needs no telling about: it writes
     all four values and the stylesheet uses the two it cares about. */
  private readonly indicator = new IndicatorController(this, {
    active: () => this.links.find((link) => link.hasAttribute('aria-current')),
    indicator: () => this.partNamed('indicator'),
    surface: () => this.partNamed('nav'),
  })

  /**
   * How a click on one of these links travels to its section.
   *
   * The platform's own vocabulary, because this is the platform's own option:
   * `auto` defers to whatever `scroll-behavior` the page has set on its scroll
   * container, which is the honest default and means an outline changes nothing
   * a consumer did not ask it to. `smooth` slides, `instant` jumps.
   *
   * **`auto` is also the only value that leaves the navigation to the browser.**
   * A fragment link does four things: it scrolls, it writes the hash, it pushes
   * a history entry, and it moves the sequential focus point so the next Tab
   * continues from the heading rather than from the link. Choosing a behavior
   * means intercepting the click, and an interception that does only the first
   * of those is a keyboard reader stranded in the contents list. So the other
   * three are done by hand here, and only when there is a reason to take over.
   *
   * `smooth` becomes `instant` under `prefers-reduced-motion: reduce`. That is
   * read at the click rather than cached, because a reader can change it while
   * the page is open and this is the only motion in the component that
   * JavaScript rather than CSS decides.
   */
  @property()
  behavior: ScrollBehavior = 'auto'

  /**
   * Accessible name for the navigation.
   */
  @property()
  label = 'On this page'

  /**
   * How far below the top of what scrolls a heading counts as reached, in
   * pixels: the window, or the panel the sections scroll in.
   *
   * The reading line. A page with a sticky masthead sets this to its height, or
   * a little more: without it the current section changes as a heading slides
   * under the chrome rather than as it reaches the top of what can be seen.
   */
  @property({ type: Number })
  offset = 0

  /**
   * The id of the section being read, or empty before anything is measured.
   *
   * Read-only, and a getter rather than a property for that reason: it is
   * derived from where the page is scrolled to, so a consumer setting it would
   * be overwritten by the next thing that crossed the reading line. Every other
   * writable property in this library that a component also writes is state a
   * consumer can own; this one cannot be, and saying so with the type is better
   * than saying it in a sentence nobody reads.
   */
  get current(): string {
    return this.reading
  }

  /**
   * What `current` reports, which only `mark` writes.
   */
  @state()
  private reading = ''

  private observer: IntersectionObserver | undefined

  /** The links, in document order. Empty on the server, which has no tree. */
  private get links(): HTMLAnchorElement[] {
    const slot = this.renderRoot?.querySelector<HTMLSlotElement>('slot')
    return (slot?.assignedElements({ flatten: true }) ?? []).filter(
      (element): element is HTMLAnchorElement =>
        element instanceof HTMLAnchorElement &&
        element.getAttribute('href')?.startsWith('#') === true,
    )
  }

  /** What each link points at, paired with the link, skipping anything missing. */
  private get sections(): { link: HTMLAnchorElement; target: Element }[] {
    const root = this.getRootNode() as Document | ShadowRoot
    return this.links.flatMap((link) => {
      const id = decodeURIComponent(link.getAttribute('href')?.slice(1) ?? '')
      const target = id ? root.getElementById?.(id) : null
      /* A section that is not rendered is not one that can be read.
       *
       * `display: none` reports a zero rect, and zero is above the reading line,
       * so an unrendered section counts as passed on every measurement and the
       * marker lands on the last one of them. Found on a reference page that
       * shows one API tier at a time and hides the other: the rail marked a
       * heading the reader could not see, and no scrolling could move it,
       * because the hidden sections always won the comparison.
       *
       * `getClientRects()` rather than a size check, because it is empty for
       * exactly the case in question and non-empty for a section that is merely
       * scrolled out of view, which is very much readable. */
      return target && target.getClientRects().length > 0 ? [{ link, target }] : []
    })
  }

  /**
   * Works out which section is being read, and marks its link.
   *
   * Positional rather than a reading of what intersects, for the reason above.
   * The comparison is against `offset` and not zero, so the reading line is
   * wherever the page says the top of the readable area is.
   */
  private mark(): void {
    /* A destination beats a measurement. See `handleClick`: while the page is
       traveling to somewhere a reader asked for, what it passes on the way is
       not what they are reading. */
    if (this.landing) {
      return
    }
    const sections = this.sections
    if (sections.length === 0) {
      return
    }
    /* From the top of what the sections scroll in, so a contents rail beside a
       scrolling panel reads the panel rather than the window, which in that
       layout never moves. */
    const scroller = this.scroller
    const page = scroller === this.page
    const origin = page ? 0 : scroller.getBoundingClientRect().top
    const passed = sections.filter(
      ({ target }) => target.getBoundingClientRect().top - origin - this.offset <= 1,
    )
    /* At the end of the page the last section is what is being read, whether or
       not its top ever reached the reading line.
     *
     * The positional rule has one blind spot and it is at the bottom: a section
     * is current once its top passes the line, and a section near the end of the
     * document may not have enough page beneath it to get there. Measured on
     * three sections with a short last one, scrolled fully to the end, 910 of
     * 910: the third heading sat at 530px, plainly on screen and plainly the
     * thing being read, and the marker stayed on the second. The last item in a
     * contents list was unreachable by scrolling.
     *
     * There is no mirror of it at the top: `passed` is empty there and the first
     * section is already the fallback, and the first heading's top starts *at*
     * the line rather than below it, so there is nothing for it to fail to
     * reach.
     *
     * What this cannot do is tell trailing sections apart. If the last three
     * share the final screenful, none of them can reach the line and the page
     * has no scroll left to distinguish them, so all three collapse into "you
     * are at the end". That is a fact about the page rather than a choice made
     * here: the component cannot invent room to scroll. */
    const active = this.atEnd ? sections.at(-1) : (passed.at(-1) ?? sections[0])
    this.markTo(active)
  }

  /** Where the destination is set, whether measured or asked for. */
  private markTo(active: { link: HTMLAnchorElement; target: Element } | undefined): void {
    for (const { link, target } of this.sections) {
      if (target === active?.target) {
        link.setAttribute('aria-current', 'location')
      } else {
        link.removeAttribute('aria-current')
      }
    }
    /* And say so. `reading` is derived from scroll position, which is the one
     * fact this component computes that nothing else on the page can, so a
     * consumer syncing a URL hash to it has no other way in short of a
     * `MutationObserver` on the anchors.
     *
     * Only on a change, because this runs from a scroll frame and an event per
     * frame is not a signal, it is a firehose.
     *
     * **The announcement, and it was declared as the request.** This was
     * `helix-before-activate`, whose `@event` line promised that refusing it
     * took the decision: the links and `reading` are written above, the
     * dispatch is a bare statement, and nothing anywhere reads what it
     * returned, so a consumer's `preventDefault()` did nothing at all. Nor
     * could it, for the reason `current` records: the value follows where the
     * page is scrolled to, and the next frame that crosses the reading line
     * computes it again. Every other family firing the before event routes it
     * through `requestChange` and applies the answer. This one has only the
     * notification to give, so it gives the library's word for that. */
    const next = active?.target.id ?? ''
    if (next !== this.reading) {
      this.reading = next
      this.dispatchEvent(new HelixActivateEvent({ value: next }))
    }
  }

  /**
   * Whether the page has no more scroll left.
   *
   * `Math.ceil` and a pixel of slack, because a fractional device pixel ratio
   * leaves the position a hair under the height at the very bottom and an exact
   * comparison never fires.
   *
   * **All three numbers off the same element.** Adding the window's `scrollY`
   * and `innerHeight` and comparing them against
   * `documentElement.scrollHeight` mixes two coordinate systems, which agree
   * only while the viewport is what scrolls, and the body takes that job the
   * moment it becomes a scroll container. Measured on a page whose body is
   * `overflow: clip visible`, which is a pair CSS resolves by making the
   * `visible` axis `auto`: `documentElement.scrollTop` read 1126 at the bottom
   * of the page and `window.scrollY` read 240, so a contents rail never learned
   * it had reached the end and its last item stayed unreachable. This library's
   * own base layer produces exactly that page.
   *
   * `clientHeight` rather than `innerHeight` for the same reason, and because it
   * is the one that excludes a scrollbar, which is what `scrollHeight` is
   * measured against.
   */
  private get atEnd(): boolean {
    const doc = this.scroller
    return Math.ceil(doc.scrollTop + doc.clientHeight) >= doc.scrollHeight - 1
  }

  /** The element the page itself scrolls with, which `atEnd` explains. */
  private get page(): Element {
    const doc = globalThis.document
    return (doc.scrollingElement ?? doc.documentElement) as Element
  }

  /**
   * What the sections scroll in: the nearest ancestor of the first one that
   * scrolls, or the page when none does.
   *
   * **The window is not always what moves.** A contents rail beside a panel
   * with its own scrollbar, which is a docs layout and every sandbox preview,
   * measured the window. The window never scrolled, so it was always at its end
   * and the last section was always current: the events example named `api`
   * at rest with `install` on screen, a wheel over the panel changed nothing,
   * and a press on `install` marked it for a moment and snapped back.
   */
  private get scroller(): Element {
    const doc = globalThis.document
    const first = this.sections[0]?.target
    for (
      let node = first?.parentElement;
      node && node !== doc.body && node !== doc.documentElement;
      node = node.parentElement
    ) {
      const { overflowY } = getComputedStyle(node)
      if (/auto|scroll|overlay/.test(overflowY) && node.scrollHeight > node.clientHeight) {
        return node
      }
    }
    return this.page
  }

  /** The frame a mark is already scheduled for, so a scroll asks for one. */
  private frame = 0

  /** Where a click said to go, while the page is still on its way there. */
  private landing: { link: HTMLAnchorElement; target: Element } | undefined

  /** The guard behind `scrollend`, in case it never comes. */
  private landed: ReturnType<typeof setTimeout> | undefined

  /**
   * The two things an `IntersectionObserver` cannot see, and one listener for
   * both.
   *
   * *At the bottom*, arriving at the end of a page changes no intersection: a
   * short last section is fully visible long before the final pixel, so its
   * ratio reached 1 and stopped moving. Nothing fires for the scroll that ends
   * the page.
   *
   * *And at the end of a smooth scroll*, which is the one that showed up in
   * use. Clicking a link in the contents list scrolled to the section and left
   * the mark where it was. Measured on the shipped example: after clicking
   * `#usage` the heading sat at 72px, exactly the reading line, and `current`
   * was still `install`. The observer fires several times during the travel and
   * the last of them lands a frame or two before the final position, where the
   * heading has not crossed yet, and no callback follows for the rest of the
   * way.
   *
   * Marking once per animation frame while a scroll is happening covers both,
   * where a listener that marks only when its own comparison changes fixes the
   * bottom and cannot fix the settle. The cost is what `mark()` costs, a
   * `getBoundingClientRect` per section on frames a reader is already scrolling
   * through. Passive, and coalesced to one call per frame however many events
   * arrive.
   */
  private readonly handleScroll = (): void => {
    if (this.frame !== 0) {
      return
    }
    this.frame = globalThis.requestAnimationFrame(() => {
      this.frame = 0
      this.mark()
    })
  }

  /**
   * Gives every section the same reading line the marker uses.
   *
   * `offset` says where the top of the readable area is, so it has to govern
   * where a click lands as much as what the marker calls current. Read by the
   * marker alone, a click puts the heading against the very top of the window
   * and underneath the sticky masthead the consumer measured the offset from,
   * which is the same number meaning two things.
   *
   * `scroll-margin-block-start` rather than an interception, because it is the
   * property the platform provides for exactly this and the UA honors it on
   * ordinary fragment navigation, on `scrollIntoView`, and on a browser
   * restoring a position. Nothing has to be taken over to get it.
   *
   * Written onto the consumer's element, like `aria-current` above and for the
   * same reason: it is derived from a property describing the page's chrome,
   * so no server rendered it and there is nothing to disagree with. Cleared
   * rather than set to `0px` when there is no offset, so the common case leaves
   * no attribute at all.
   */
  private reach(): void {
    for (const { target } of this.sections) {
      const element = target as HTMLElement
      element.style.scrollMarginBlockStart = this.offset > 0 ? `${this.offset}px` : ''
    }
  }

  /**
   * Takes a link's click, but only where `auto` would not have done the job.
   *
   * Left the platform's wherever it can be: a modified click is a new tab or a
   * download and none of this applies, a click something else has already
   * handled is not ours, and `auto` is the whole point of `auto`.
   */
  private readonly handleClick = (event: MouseEvent): void => {
    if (event.defaultPrevented || event.button !== 0) {
      return
    }
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return
    }
    const link = (event.target as Element | null)?.closest?.('a[href^="#"]')
    const section = this.sections.find((one) => one.link === link)
    if (!section) {
      return
    }

    /* The destination is marked now, and everything between here and there is
     * not.
     *
     * The marker follows the scroll, which is right when a reader is scrolling
     * and wrong when they have said where they are going: traveling to the
     * fifth section passes the second, third and fourth, each became current
     * for a frame or two on the way, and the mark stepped down the list one
     * item at a time instead of making the journey.
     *
     * Suppressed for any click on one of these links, not only the ones this
     * component scrolls itself: a consumer with `scroll-behavior: smooth` on
     * their own scroll container gets the same travel and the same stepping,
     * and `behavior="auto"` does not mean "nobody is animating".
     *
     * `landing` is cleared when the page stops moving, by the same `scrollend`
     * and timeout pair the mark uses elsewhere, because a scroll that is
     * interrupted by a reader grabbing the page has to hand the marker back. */
    this.landing = section
    this.markTo(section)
    clearTimeout(this.landed)
    const arrive = (): void => {
      clearTimeout(this.landed)
      this.landing = undefined
      document.removeEventListener('scrollend', arrive, true)
      this.mark()
    }
    /* On the document in capture, like the scroll listener, so a panel's
       scroll ending lands here as the window's does. */
    document.addEventListener('scrollend', arrive, { capture: true, once: true })
    this.landed = setTimeout(arrive, 1200)

    if (this.behavior === 'auto') {
      return
    }
    event.preventDefault()
    const reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
    section.target.scrollIntoView({
      behavior: reduced && this.behavior === 'smooth' ? 'instant' : this.behavior,
      block: 'start',
    })
    /* The three things the anchor would have done and the scroll does not. The
       history entry keeps Back working and the address bar copyable; the focus
       move is what stops Tab continuing from the contents list. `preventScroll`
       because the scroll above is already under way and focusing would fight it,
       instantly, wherever `smooth` was asked for. */
    globalThis.history?.pushState(null, '', link?.getAttribute('href') ?? '')
    const target = section.target as HTMLElement
    if (!target.hasAttribute('tabindex')) {
      target.setAttribute('tabindex', '-1')
    }
    target.focus({ preventScroll: true })
  }

  /**
   * Watches every section, and re-marks whenever any of them crosses anything.
   *
   * The thresholds are what make the trigger frequent enough: an observer fires
   * on entering and leaving, and a long section scrolled slowly crosses neither
   * for a long time. Asking for a callback at each quarter of visibility is
   * cheap. It is still only a trigger: see `handleScroll` for the two cases no
   * intersection can see.
   */
  private watch(): void {
    this.observer?.disconnect()
    /* Nothing to watch yet is not nothing to watch ever. A page whose sections
     * arrive after the nav does, which is every page rendering its content
     * asynchronously, resolves no href at first update, and returning here
     * without leaving a way back kills the component for the life of the page.
     * `updated` re-runs this while `observer` is undefined, which is why the
     * field is cleared rather than left holding a disconnected observer. */
    if (this.sections.length === 0) {
      this.observer = undefined
      return
    }
    this.observer = new IntersectionObserver(() => this.mark(), {
      threshold: [0, 0.25, 0.5, 0.75, 1],
    })
    for (const { target } of this.sections) {
      this.observer.observe(target)
    }
    this.reach()
    this.mark()
  }

  /**
   * The set changed: watch it, and measure it.
   *
   * Both, for the reason the tab strip records: the host renders before its
   * links have anything to point at, so the first measurement finds nothing,
   * and without a second one at `slotchange` the mark stays unplaced for the
   * life of the page.
   */
  private readonly handleSlotChange = (): void => {
    this.watch()
    this.indicator.place()
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('click', this.handleClick)
    document.removeEventListener('scroll', this.handleScroll, true)
    if (this.frame !== 0) {
      globalThis.cancelAnimationFrame(this.frame)
      this.frame = 0
    }
    this.observer?.disconnect()
    this.observer = undefined
    /* The landing timer holds a closure over this element for 1.2 seconds after
       it leaves the document and then touches it, which on a route change is a
       write to a tree nobody is looking at. */
    clearTimeout(this.landed)
    this.landed = undefined
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('click', this.handleClick)
    /* The document in capture rather than the window: an element's `scroll`
       does not bubble, so a panel scrolling never reached a window listener,
       and capture on the document hears every scroller and the page alike. */
    document.addEventListener('scroll', this.handleScroll, {
      capture: true,
      passive: true,
    })
    /* The observer is rebuilt on reconnection. `firstUpdated` runs once for
     * the life of the element and `disconnectedCallback` runs every time it
     * moves, so without this an outline moved in the DOM, which a framework does
     * on any reorder, comes back permanently frozen: `aria-current` and
     * `current` stop for the rest of the page's life with nothing to say why.
     * Guarded on `hasUpdated`, because the first connection happens before the
     * first render and there is nothing to watch yet. */
    if (this.hasUpdated) {
      this.watch()
    }
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.watch()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    /* The reading line moved, so where the reader is may have changed without
       the page having moved at all. Nothing else would notice: the observer
       fires on sections crossing the viewport, and this changes what crossing
       means rather than whether anything did. */
    if (changed.has('offset')) {
      this.reach()
      this.mark()
    }
    /* Try again while there is nothing being watched. Cheap: `watch` returns on
       the first line once it has something, and this is the only path back for
       a nav whose sections had not rendered when it first looked. */
    if (!this.observer) {
      this.watch()
    }
    /* After the render that applied the new `aria-current`, not inside `mark()`
       beside the attribute write. The current link is styled differently, and
       on a narrow column the extra weight is enough to rewrap it, so measuring
       before the style lands measures the wrong height. */
    this.indicator.place()
  }

  protected override render(): TemplateResult {
    return html`<nav part="nav" aria-label=${this.label}>
      <slot @slotchange=${this.handleSlotChange}></slot>
      <span part="indicator" aria-hidden="true"></span>
    </nav>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-outline': HelixHeadlessOutline
  }
}
