import {
  customElement,
  elementById,
  HelixActivateEvent,
  HelixElement,
  IndicatorController,
  plainClick,
  reflectElements,
  scrollItemIntoView,
  scrollingAncestor,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { type Branch, levelOf, nest } from '../levels.js'

/** Whether an element is a link to a fragment on this page. */
const isFragment = (element: Element): element is HTMLAnchorElement =>
  element instanceof HTMLAnchorElement && element.getAttribute('href')?.startsWith('#') === true

/**
 * @summary Links to the headings on the page, with the section in view marked.
 *
 * @description
 * Outline is a table of contents for a document. `Navigation` does the same job
 * for a site.
 *
 * The links are your own anchors. A router renders its own `<a>` and cannot
 * render one inside the outline's shadow root, and the hrefs are fragments on
 * the same page.
 *
 * Write the anchors flat, with `data-level` for their depth, or nested in
 * lists, `<ul><li><a>`. A screen reader hears the levels either way: the
 * outline puts a flat run into lists inside list items of its own, nested by
 * `data-level`, and leaves the links where they are. A link without
 * `data-level` is at the top level.
 *
 * A heading slotted into `heading` names the navigation, in place of `label`.
 *
 * In a contents rail with a scrollbar of its own, `follow` keeps the link of
 * the section in view showing as the reader scrolls the page.
 *
 * **Keyboard.** The links are your anchors, in the tab order as you wrote
 * them, so the outline adds no keys of its own: Tab moves through the links
 * and Enter follows one. Following a link moves focus to its section, so the
 * next Tab goes on from the heading, also with `behavior` set.
 *
 * **What a screen reader hears.** A navigation landmark named by `label`, "On
 * this page", or by the slotted heading. The links are lists, nested by level,
 * so a reader hears how many links a level holds and where each one is. The
 * link to the section in view carries `aria-current="location"`, read as
 * "current location", and it moves as the page scrolls without announcing,
 * which would interrupt the reading it follows.
 *
 * The current section is decided by the headings' positions. An
 * `IntersectionObserver` with a band near the top fails both ways: when
 * headings are far apart, none is in the band and no section is marked, and
 * when they are close together, several are in the band at once.
 *
 * @since 0.1.0
 * @status stable
 * @category navigation
 * @aliases Table of contents, On this page, Outline
 * @documentation https://fusion.dev/helix/components/outline
 *
 * @slot - The links, as anchors with fragment hrefs, or lists holding them.
 * @slot heading - A heading above the links, such as "On this page". It names the navigation.
 *
 * @event {HelixActivateEvent} helix-activate - Fired when the section in view changes, with its id as the value. It reports the scroll position and cannot be prevented.
 *
 * @csspart heading - The box holding the `heading` slot, above the navigation.
 * @csspart indicator - The mark that moves to the section in view.
 * @csspart nav - The navigation landmark.
 */
@customElement('helix-headless-outline')
export class HelixHeadlessOutline extends HelixElement {
  /**
   * Manual, so each link in a flat run can be put in a list item of its own.
   *
   * The list items are slots, which lay out as nothing at all, so each link is
   * still laid out as a child of the navigation exactly where it was, and the
   * consumer's markup is not touched. A run holding anything but links, a
   * `<ul>` among them, goes to one plain slot as before.
   */
  static override shadowRootOptions: ShadowRootInit = {
    ...HelixElement.shadowRootOptions,
    slotAssignment: 'manual',
  }

  /* The mark. Vertical, which the controller needs no telling about: it writes
     all four values and the stylesheet uses the two it cares about. */
  private readonly indicator = new IndicatorController(this, {
    active: () => this.links.find((link) => link.hasAttribute('aria-current')),
    indicator: () => this.partNamed('indicator'),
    surface: () => this.partNamed('nav'),
  })

  /**
   * How the page scrolls to a section when its link is clicked.
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
   * Keeps the link of the section in view in view itself, in an outline
   * longer than the box it scrolls in, such as a contents rail with a
   * scrollbar of its own. Only that box moves: never the page, and never the
   * box the sections scroll in.
   */
  @property({ type: Boolean })
  follow = false

  /**
   * The navigation's name, read by screen readers. A heading in the `heading`
   * slot names it in place of this.
   */
  @property()
  label = 'On this page'

  /**
   * How far below the top of the scroll container a heading counts as reached,
   * in pixels. The scroll container is the window or the panel the sections
   * scroll in.
   *
   * The reading line. A page with a sticky masthead sets this to its height, or
   * a little more: without it the current section changes as a heading slides
   * under the chrome rather than as it reaches the top of what can be seen.
   */
  @property({ type: Number })
  offset = 0

  /**
   * The id of the section in view, or empty before anything is measured.
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
   *
   * **A field, not state.** Nothing renders it: the links carry `aria-current`
   * and the mark is placed by measuring them, so a render on its change drew
   * the same template again. It also made the first measurement, which can only
   * happen after the first render, schedule a second one from `firstUpdated`.
   */
  private reading = ''

  private observer: IntersectionObserver | undefined

  /**
   * Watches the children, which a manual root is not told about: a link
   * arriving, leaving or changing its level changes the lists drawn for them.
   */
  private childWatch: MutationObserver | undefined

  /**
   * The links, in document order. Empty on the server, which has no tree.
   *
   * **Anchors inside what is slotted count too.** A contents list is written
   * `<ul><li><a>` more often than as a run of anchors, and reading only the
   * anchors assigned to the slot found no sections in it: nothing was marked,
   * nothing was announced, and nothing said why.
   */
  private get links(): HTMLAnchorElement[] {
    const slots = [
      ...(this.renderRoot?.querySelectorAll?.<HTMLSlotElement>(
        'slot[data-link], nav > slot:not([role])',
      ) ?? []),
    ]
    return slots
      .flatMap((slot) => slot.assignedElements({ flatten: true }))
      .flatMap((element) =>
        isFragment(element)
          ? [element]
          : [...element.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')].filter(isFragment),
      )
  }

  /** The children that are the content, which is all of them but the heading. */
  private get content(): Element[] {
    return this.knownChildren.filter((child) => child.slot !== 'heading')
  }

  /**
   * The links of a flat run, which the render puts into lists, or `undefined`
   * where the content is anything else.
   *
   * Anything else is a list a consumer wrote, which already has its levels, a
   * slot forwarded from a component around this one, or a server's render and
   * the hydration of one, which cannot know the children. A root a server sent
   * routes by name, so it keeps the plain slot after hydration too.
   */
  private get run(): HTMLAnchorElement[] | undefined {
    const content = this.content
    if (this.assignsByName || content.length === 0 || !content.every(isFragment)) {
      return undefined
    }
    return content
  }

  /**
   * What each link points at, paired with the link, skipping anything missing.
   *
   * The fragment is decoded first because these are `href`s and not ids. The
   * lookup is the tree's alone: this intercepts no press, so it has no
   * navigation to agree with, and a section it cannot see is one it is not
   * describing.
   */
  private get sections(): { link: HTMLAnchorElement; target: Element }[] {
    return this.links.flatMap((link) => {
      const id = decodeURIComponent(link.getAttribute('href')?.slice(1) ?? '')
      const target = elementById(this, id)
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
      /* And move the mark to it. Measured straight after the write, which is
       * after the style lands: a bounding box is read from a resolved style,
       * so a current link set in heavier weight and rewrapped onto a second
       * line is measured at the height it now has. */
      this.indicator.place()
      if (this.follow && active) {
        this.reveal(active.link)
      }
      this.dispatchEvent(new HelixActivateEvent({ value: next }))
    }
  }

  /**
   * Scrolls the box the links scroll in to show `link`, under `follow`.
   *
   * The nearest box above the link that scrolls, and only where it is the
   * rail's own: the page, the box the sections scroll in, or a box holding it
   * would move the reading under the reader, which is the scroll this marks.
   */
  private reveal(link: HTMLElement): void {
    const sections = this.scroller
    const node = scrollingAncestor(link, { axis: 'y', overflowing: true, stop: this.page })
    if (node && node !== sections && !node.contains(sections)) {
      scrollItemIntoView(link, { scroller: node })
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
    const first = this.sections[0]?.target as HTMLElement | undefined
    return (first && scrollingAncestor(first, { axis: 'y', overflowing: true })) || this.page
  }

  /** The frame a mark is already scheduled for, so a scroll asks for one. */
  private frame = 0

  /** Where a click said to go, while the page is still on its way there. */
  private landing: { link: HTMLAnchorElement; target: Element } | undefined

  /** The guard behind `scrollend`, in case it never comes. */
  private landed: ReturnType<typeof setTimeout> | undefined

  /** What `scrollend` calls when the scroll a click started lands, while it is awaited. */
  private arrive: (() => void) | undefined

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
    if (event.defaultPrevented || !plainClick(event)) {
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
    this.unland()
    const arrive = (): void => {
      this.unland()
      this.landing = undefined
      this.mark()
    }
    /* On the document in capture, like the scroll listener, so a panel's
       scroll ending lands here as the window's does. */
    this.arrive = arrive
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
    this.childWatch?.disconnect()
    this.childWatch = undefined
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
       write to a tree nobody is looking at. The listener beside it held it
       until the next page scrolled, or for good where there is no `scrollend`. */
    this.unland()
  }

  /**
   * Stops waiting for a scroll to land, both halves of the wait.
   *
   * The `scrollend` listener is on the document, so it is taken off as well as
   * the timer: left on, every click that did not wait for the last landing
   * added one more.
   */
  private unland(): void {
    clearTimeout(this.landed)
    this.landed = undefined
    if (this.arrive) {
      document.removeEventListener('scrollend', this.arrive, true)
      this.arrive = undefined
    }
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.childWatch = new MutationObserver(() => this.requestUpdate())
    this.childWatch.observe(this, {
      attributeFilter: ['data-level', 'href', 'slot'],
      childList: true,
      subtree: true,
    })
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
    this.finishHydration()
  }

  /**
   * Puts each child in its slot, on a root this element made.
   *
   * A link of a flat run goes to the slot inside its list item, and anything
   * else, with the text between, to the plain slot. A root a server sent
   * routes by name and needs none of it.
   */
  private assign(): void {
    if (this.assignsByName) {
      return
    }
    const root = this.renderRoot as ShadowRoot | undefined
    const heading = root?.querySelector?.<HTMLSlotElement>('slot[name="heading"]')
    heading?.assign?.(...this.knownChildren.filter((child) => child.slot === 'heading'))
    const run = this.run
    if (run) {
      for (const slot of root?.querySelectorAll?.<HTMLSlotElement>('slot[data-link]') ?? []) {
        const link = run[Number(slot.dataset.link)]
        if (link) {
          slot.assign(link)
        }
      }
      return
    }
    const plain = root?.querySelector?.<HTMLSlotElement>('nav > slot:not([role])')
    plain?.assign?.(
      ...[...this.childNodes].filter((node): node is Element | Text =>
        node instanceof Element ? node.slot !== 'heading' : node instanceof Text,
      ),
    )
  }

  /** Whether the heading is what names the navigation. */
  private namedByHeading = false

  /**
   * Names the navigation by what is in the `heading` slot, in place of `label`.
   *
   * An element reference, because the heading is in the light DOM and the
   * `<nav>` in this shadow root, which an IDREF cannot cross. A browser without
   * element reflection keeps `label`.
   */
  private readonly nameByHeading = (): void => {
    const slot = this.renderRoot?.querySelector?.<HTMLSlotElement>('slot[name="heading"]')
    this.namedByHeading = reflectElements(
      this.partNamed('nav'),
      'ariaLabelledByElements',
      slot?.assignedElements({ flatten: true }) ?? [],
      this.namedByHeading,
    )
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.assign()
    this.nameByHeading()
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
    /* A new `offset` or `label` can move or rewrap the links without changing
       which one is current, so the mark is measured again after any render. */
    this.indicator.place()
  }

  protected override render(): TemplateResult {
    const run = this.run
    return html`<div part="heading"><slot name="heading" @slotchange=${this.nameByHeading}></slot></div>
      <nav part="nav" aria-label=${this.label} @slotchange=${this.handleSlotChange}>
      ${run ? this.renderList(nest(run.map((link) => levelOf(link.getAttribute('data-level'))))) : html`<slot></slot>`}
      <span part="indicator" aria-hidden="true"></span>
    </nav>`
  }

  /**
   * A list for a run of links, with a list item for each, nested by level.
   *
   * **Slots, because a slot lays out as nothing.** A list and its items drawn
   * as boxes would put each link inside an item, out of the navigation's own
   * flex column, and every outline styled against that column would move. A
   * slot is `display: contents`, keeps a role it is given, and shows its
   * children while nothing is assigned to it, so the items nest in the
   * accessibility tree and nowhere else. Measured in Chromium: every link at the
   * same box with and without the lists, and each item at the level its
   * nesting gives it.
   */
  protected renderList(branches: Branch[]): TemplateResult {
    return html`<slot role="list"
      >${branches.map(
        (branch) =>
          html`<slot role="listitem"
            ><slot data-link=${branch.index}></slot
            >${branch.children.length > 0 ? this.renderList(branch.children) : nothing}</slot
          >`,
      )}</slot
    >`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-outline': HelixHeadlessOutline
  }
}
