import { customElement, HelixElement, IndicatorController } from '@helix-io/core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'

/**
 * @summary Links to the headings on this page, marking the one being read.
 *
 * @description
 * A table of contents, named for the job. Three of the obvious names are taken
 * by things that are not this: `Outline` is a CSS property and the focus ring's
 * whole vocabulary, `Contents` is `display: contents` and the `content` part
 * half this library renders, and `TableOfContents` would sit beside `Table` and
 * `TableColumn` and read as a third part of that family. `Outline` sits beside
 * `Navigation`, which is the same job at the other scale: one navigates a site, the
 * other navigates a document.
 *
 * **The links are the consumer's own anchors**, the same as `Navigation`. A router
 * renders its own `<a>` and cannot render one inside this shadow root, and the
 * hrefs are fragments the page already knows.
 *
 * **What is current is decided by position, not by intersection.** The obvious
 * build is an `IntersectionObserver` with a thin band near the top of the
 * window, and it fails in both directions: with headings far apart nothing is
 * in the band and the marker goes out entirely, and with headings close
 * together several are and it flickers between them. So the observer is only
 * the *trigger*, and the answer is computed from where the headings actually
 * are: the current section is the last one whose top has passed the reading
 * line, or the first heading before any of them has.
 *
 * That rule is what a reader means. Two headings on screen at once are not
 * ambiguous to a person: they are reading under the upper one.
 *
 * **`aria-current="location"`, and it is written onto the consumer's anchor.**
 * This library does not normally write to light-DOM children, because an
 * attribute added after upgrade is one a server's markup never had. It is right
 * here for the reason `Carousel` names its slides: what is current is derived
 * from scroll position, so no server could have rendered it and there is
 * nothing for hydration to disagree with. `location` rather than `page`, which
 * is what `Navigation` uses: `page` means this is the page, and every one of these
 * is the same page.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Table of contents, On this page, Outline
 * @documentation https://helix.fusion.dev/components/outline
 *
 * @slot - The links, as anchors with fragment hrefs.
 *
 * @csspart nav - The navigation landmark.
 * @csspart indicator - The mark that travels to the section being read.
 */
@customElement('helix-base-outline')
export class HelixBaseOutline extends HelixElement {
  /* The mark. Vertical, which the controller needs no telling about: it writes
     all four values and the stylesheet uses the two it cares about. */
  private readonly indicator = new IndicatorController(this, {
    active: () => this.links.find((link) => link.hasAttribute('aria-current')),
    indicator: () => this.renderRoot?.querySelector<HTMLElement>('[part="indicator"]'),
    surface: () => this.renderRoot?.querySelector<HTMLElement>('[part="nav"]'),
  })

  /** Accessible name for the navigation. */
  @property()
  label = 'On this page'

  /**
   * How far below the top of the window a heading counts as reached, in pixels.
   *
   * The reading line. A page with a sticky masthead sets this to its height, or
   * a little more: without it the current section changes as a heading slides
   * under the chrome rather than as it reaches the top of what can be seen.
   */
  @property({ type: Number })
  offset = 0

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

  /** What `current` reports, which only `mark` writes. */
  @state()
  private reading = ''

  private observer: IntersectionObserver | undefined

  private resize: ResizeObserver | undefined

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
      return target ? [{ link, target }] : []
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
    const sections = this.sections
    if (sections.length === 0) {
      return
    }
    const passed = sections.filter(
      ({ target }) => target.getBoundingClientRect().top - this.offset <= 1,
    )
    const active = passed.at(-1) ?? sections[0]
    for (const { link, target } of sections) {
      if (target === active?.target) {
        link.setAttribute('aria-current', 'location')
      } else {
        link.removeAttribute('aria-current')
      }
    }
    this.reading = active?.target.id ?? ''
  }

  /**
   * Gives every section the same reading line the marker uses.
   *
   * `offset` described where the top of the readable area is and was read by
   * exactly one thing, the marker. Click a link and the browser put the heading
   * against the very top of the window, underneath the sticky masthead whose
   * height the consumer had just finished measuring for us. So the component
   * knew about the chrome when deciding what you were reading and forgot about
   * it when taking you somewhere, which is the same number meaning two things.
   *
   * `scroll-margin-block-start` rather than an interception, because it is the
   * property the platform provides for exactly this and the UA honours it on
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
    if (this.behavior === 'auto' || event.defaultPrevented || event.button !== 0) {
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
   * cheap and keeps the marker honest without a scroll listener.
   */
  private watch(): void {
    this.observer?.disconnect()
    /* Nothing to watch yet is not nothing to watch ever.
     *
     * This returned when no href resolved at first update, having already
     * disconnected the observer, and only `slotchange` ever called it again: a
     * page whose sections arrive after the nav does, which is every page that
     * renders its content asynchronously, left the component dead for good. The
     * observer is left disconnected either way, so re-running is the whole of
     * the fix, and `updated` re-runs it while there is nothing to watch. */
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
    this.observer?.disconnect()
    this.observer = undefined
    this.resize?.disconnect()
    this.resize = undefined
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('click', this.handleClick)
    /* Both observers are rebuilt on reconnection, and neither was.
     *
     * They were created in `firstUpdated`, which runs once for the life of the
     * element, and torn down in `disconnectedCallback`, which runs every time it
     * moves. So a outline moved in the DOM, which a framework does on any
     * reorder, came back permanently frozen: `aria-current`, `current` and the
     * travelling mark all stopped for the rest of the page's life with nothing
     * to say why. Guarded on `hasUpdated`, because the first connection happens
     * before the first render and there is nothing to watch yet. */
    if (this.hasUpdated) {
      this.watch()
      this.resize = new ResizeObserver(() => this.indicator.place())
      this.resize.observe(this)
    }
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.watch()
    /* The links are text in a column, so anything that changes the column's
       width rewraps them and moves every one below. Nothing else would notice:
       the intersection observer watches the sections, and a resize moves the
       links without moving the page. */
    this.resize = new ResizeObserver(() => this.indicator.place())
    this.resize.observe(this)
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
    'helix-base-outline': HelixBaseOutline
  }
}
