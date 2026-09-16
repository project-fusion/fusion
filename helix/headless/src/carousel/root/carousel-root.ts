import {
  customElement,
  HelixElement,
  HelixSelectEvent,
  hostAria,
  inlineStep,
  requestChange,
} from '@fusion.dev/helix-core'
import { caretLeft, caretRight, play, stop } from '@fusion.dev/helix-icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'

/**
 * @summary Shows one slide of several, with controls to move between them.
 *
 * @description
 * The track is a scroller with scroll snapping, so a drag, a trackpad swipe,
 * and the browser's own momentum all work without being reimplemented. The
 * controls scroll it; they do not drive a transform.
 *
 * Slides are the consumer's own elements, and nothing is written onto them. The
 * component renders a pane per slide carrying `role="group"`,
 * `aria-roledescription="slide"` and a name reading its position in the set,
 * and assigns the slide into it: a screen-reader user hears where they are, and
 * a slide that is itself a link is still a link. See `assign`.
 *
 * **Rotation stops on focus and on hover, and once stopped it stays stopped.**
 * The APG is explicit: rotation must not resume unless the reader asks for it,
 * so hovering away does not start it again. The control names the action it
 * performs, and it is first in the tab order.
 *
 * @since 0.1.0
 * @status experimental
 * @category layout
 * @aliases Slider, Gallery, Slideshow
 * @documentation https://fusion.dev/helix/components/carousel
 *
 * @slot - The slides.
 *
 * @event {HelixSelectEvent} helix-select - Fired when the slide in view changes, with its index. Cancelable: refusing it takes the decision and nothing moves.
 *
 * @csspart controls - The row of controls.
 * @csspart indicator - One of them, and a way to reach that slide.
 * @csspart indicator-current - The one for the slide showing, beside `indicator`.
 * @csspart indicators - The row of controls saying where the reader is.
 * @csspart next - The control that moves to the next slide.
 * @csspart next-mark - The glyph on the next control.
 * @csspart previous - The control that moves to the previous slide.
 * @csspart previous-mark - The glyph on the previous control.
 * @csspart rotation - The control that stops and starts rotation.
 * @csspart rotation-mark - The glyph on the play and pause control.
 * @csspart slide - The pane one slide is shown in, and the box the track snaps to.
 * @csspart track - The scroller the slides sit in.
 *
 * @cssproperty --carousel-gap - Space between slides. A sheet sets it and the component measures the run with it.
 * @cssproperty --carousel-pane - The size one pane is laid out at. A sheet sets it and the component measures the run with it.
 * @cssproperty --carousel-run-end - How far short of a whole pixel the run ends, on the last slide alone, for a sheet to take up as `margin-inline-end`. See `runEnd`.
 */
@customElement('helix-headless-carousel')
export class HelixHeadlessCarousel extends HelixElement {
  /**
   * Manual, so each slide can be wrapped without its markup being touched.
   *
   * A slide has to be a `group` carrying `aria-roledescription="slide"` and a
   * position in the run, and those are the component's facts rather than the
   * consumer's element's. Writing them on is what a React consumer's hydration
   * reports and does not patch up, and on a slide that is itself a link it also
   * takes the link's role away. Assigning into a pane the component rendered
   * says the same thing to a screen reader and leaves the consumer's element
   * exactly as it was served. `Chat` and `DataTable` wrap their children the
   * same way and for the first of those two reasons.
   */
  static override shadowRootOptions: ShadowRootInit = {
    ...HelixElement.shadowRootOptions,
    slotAssignment: 'manual',
  }

  /**
   * Whether the carousel advances on its own.
   */
  @property({ type: Boolean })
  autoplay = false

  /**
   * The slide in view, counted from zero.
   *
   * Reading gives the real slide, in either mode. Writing sets it, the way a
   * script assigning to a native control does. Which mode the carousel is in is
   * read once, at the first update, from whether anything had declared an
   * `index` by then: declared, and the consumer owns it and the carousel only
   * announces where it would have gone; not declared, and the carousel owns it
   * and `default-index` says where it starts.
   *
   * The same contract the four mixins carry, written out here rather than
   * extracted, because a slide is addressed by position and every one of those
   * mixins is keyed by a name. One consumer is not a mixin: if a second numeric
   * state turns up, this is what it is extracted from.
   */
  @property({ type: Number })
  get index(): number {
    return this.indexState ?? this.defaultIndex
  }

  set index(next: number) {
    const previous = this.index
    this.indexState = next
    this.requestUpdate('index', previous)
  }

  /**
   * Whether the previous and next controls are shown.
   *
   * `auto`, which is the resting behavior and what an absent attribute means,
   * shows them wherever the pointer can hover and hides them where it cannot.
   * `always` keeps them on every device, and `none` never renders them at all.
   *
   * **Pointer and not width, which is the distinction this exists to make.** A
   * 375px window on a desktop still has a mouse and still wants the arrows; a
   * tablet at 1024 has neither. `.claude/rules/helix.md` forbids a component
   * asking about the viewport, because the viewport is not the component's box,
   * and that objection does not reach `hover` and `pointer`: those describe the
   * input device, and the answer is the same whether this carousel is 300px in
   * a sidebar or runs the width of the page.
   *
   * **Safe to hide because the arrows are not the keyboard's way in.** The
   * indicators carry a roving `tabindex` and handle the arrow keys, so every
   * slide is still reachable with the controls gone. Hiding a control that was
   * the only route to something would be a different change under this name.
   *
   * **The rotation control is never hidden by this**, which is a decision
   * rather than a limit of scope: content that moves on its own has to offer a
   * way to stop it, so an autoplaying carousel keeps its pause control on a
   * touch device exactly as it does on a desktop.
   */
  @property({ reflect: true })
  controls?: 'always' | 'auto' | 'none'

  /**
   * Slide to start on, where nothing declared one.
   */
  @property({ attribute: 'default-index', type: Number })
  defaultIndex = 0

  /**
   * How long each slide is held, in milliseconds.
   */
  @property({ type: Number })
  interval = 5000

  /** The slide in view, whoever set it, and `undefined` until somebody has. */
  private indexState: number | undefined = undefined

  /** How many panes were drawn at the last update, to scroll when the first are. */
  private scrolledFor = 0

  /**
   * Accessible name for the carousel.
   */
  @property()
  label = 'Carousel'

  /**
   * Whether moving past either end wraps to the other.
   */
  @property({ type: Boolean })
  loop = false

  /**
   * Which way the track runs.
   *
   * Behavior rather than presentation, which is why it is here: the scroll
   * position and the nearest-slide arithmetic are both single-axis, and a
   * styled-tier attribute cannot change which one they read. Two sites branch
   * on it, `scrollTo` and the drag settle, and nothing else in the component
   * knows about the axis at all.
   *
   * A vertical track needs a height, which a horizontal one does not: width
   * comes from the page and height does not, so the styled tier gives it
   * `--carousel-block-size` and a consumer sets that to whatever the slides
   * want.
   */
  @property({ reflect: true })
  orientation?: 'horizontal' | 'vertical'

  /**
   * Whether rotation is running.
   *
   * Absent until autoplay starts it.
   */
  @state()
  private rotating = false

  private timer: ReturnType<typeof setInterval> | undefined

  /**
   * How many slides are shown across the track at once. Absent shows one.
   *
   * **Here rather than on the styled tier, because it decides how many places
   * the track can stop.** From the stylesheet it looks like a width, one rule
   * per value setting a custom property that the slides divide the track by.
   * But a carousel showing four of six slides has three positions, not six, and
   * everything that counts positions is in this file. Declared up there, `goTo`
   * clamps to the last *slide*, so three of the six indicators point at an
   * offset the track has already reached: pressing next walks the dots to the
   * end while the slides stop moving a third of the way through.
   *
   * No default, because it reflects. A reflected property with a value writes
   * its attribute on upgrade, and the host then carries something a consumer's
   * server markup never had, which React reports as a mismatch. The one-across
   * case is the absent attribute, and the styles read it that way.
   */
  @property({ attribute: 'per-view', reflect: true, type: Number })
  perView?: number

  /**
   * How many distinct views the track holds, which is what the indicators count.
   *
   * A window of `perView` slides sliding one at a time over `n` of them stops
   * `n - perView + 1` times, so six slides four across is three: 0 to 3, 1 to 4,
   * 2 to 5. One at minimum, since a carousel showing everything it has still
   * has the one place to be.
   */
  get positions(): number {
    const across = Math.max(1, Math.floor(this.perView ?? 1))
    return Math.max(1, this.slides.length - across + 1)
  }

  /**
   * The panes rendered for the slides, in order. Empty until the first render.
   *
   * One per slide, and the box the track actually lays out: the slide itself is
   * assigned into it and takes its size from it, so every offset the scroller
   * is asked about is a pane's. Read fresh rather than cached, because a slide
   * arriving or leaving re-renders the run.
   */
  private get panes(): HTMLElement[] {
    return [...(this.renderRoot?.querySelectorAll?.<HTMLElement>('[part="slide"]') ?? [])]
  }

  /** The slides, in light-DOM order. Empty on the server, which has no tree. */
  get slides(): HTMLElement[] {
    /* `knownChildren`, because `render` reads this to count the indicators: on
       a server `children` is undefined and a spread of it kills every carousel
       SSR pass, and while hydrating what one sent the render has to be its.

       Empty is also the honest answer rather than damage control. The
       indicators are one per position and a position is counted from the
       children, which the server cannot see, so they arrive with the upgrade.
       Nothing moves when they do: the tags are hidden until they are
       defined, and after hydration the update that follows counts them. */
    return this.knownChildren.filter((child): child is HTMLElement => child instanceof HTMLElement)
  }

  /**
   * The arrows move between indicators, which is the tablist pattern.
   *
   * One tab stop for the set and the arrows within it, so a reader does not
   * have to press Tab once per slide to get past a carousel of twelve. Moving
   * changes the slide, because an indicator that could be focused without
   * selecting would leave the highlight and the slide disagreeing with nothing
   * on screen saying which is which.
   *
   * Along the line, so on a right-to-left page, where the first indicator is on
   * the right, the left arrow is the one that moves on.
   */
  private readonly handleIndicatorKeydown = (event: KeyboardEvent): void => {
    const step = inlineStep(this, event.key)
    if (step === 0) {
      return
    }
    event.preventDefault()
    this.goTo(this.index + step)
    this.updateComplete.then(() => {
      this.renderRoot.querySelector<HTMLElement>('[part~="indicator-current"]')?.focus()
    })
  }

  /** Moves to a slide, wrapping only where `loop` says to. */
  goTo(index: number): void {
    if (this.slides.length === 0) {
      return
    }
    /* Positions, not slides. The last place a four-across track of six can stop
       is the third, and clamping to the sixth gave three indices that all
       scrolled to the same clamped offset. */
    const count = this.positions
    const next = this.loop ? (index + count) % count : Math.min(Math.max(index, 0), count - 1)
    if (next === this.index) {
      return
    }
    requestChange({
      apply: (value) => {
        const previous = this.index
        this.indexState = value
        this.requestUpdate('index', previous)
      },
      event: (value) => new HelixSelectEvent({ value: String(value) }),
      host: this,
      next,
    })
  }

  /**
   * The leading padding the track keeps for a slide to draw its own edge in.
   *
   * A styled track carries one so a slide's shadow and focus ring have
   * somewhere to go: a scroll container clips at its padding box, and a slide
   * flush against that edge loses whatever it paints outside itself. The
   * headless tier has no stylesheet and so no padding, and this reads zero
   * there, which is why both tiers can share the arithmetic below.
   *
   * Physical sides rather than logical, to match the physical `offsetLeft` and
   * `offsetTop` it is subtracted from. The bleed is one length on all four
   * sides, so the two agree whatever the writing mode; if that stops being
   * true, this is the method that has to know.
   */
  private bleed(track: HTMLElement): number {
    const style = getComputedStyle(track)
    const read = Number.parseFloat(
      this.orientation === 'vertical' ? style.paddingTop : style.paddingLeft,
    )
    /* Zero where there is no number to read, which is a harness rather than a
       browser. happy-dom resolves nothing out of an adopted stylesheet and
       returns `''` for every side of this, so `parseFloat` gives `NaN`, and a
       `NaN` distance loses every comparison it is in: the nearest-slide search
       below picked nothing and a reader's drag stopped moving the index at all.
       Three specs caught it. A browser always answers with a used length, so
       this arm is only ever the harness, and zero is the right answer there,
       nothing being laid out or clipped in the first place. */
    return Number.isNaN(read) ? 0 : read
  }

  /**
   * Where a slide's leading edge sits, in the scroller's own coordinates.
   *
   * **Both directions go through here, because they have to agree.** The
   * offsets are measured to the track's *border* box and `scrollTop` and
   * `scrollLeft` are measured from its content box, so the two differ by the
   * bleed: sending the carousel to a slide and reading back which slide it is
   * on used the same expression, and correcting one of them alone put a drag
   * one position off what the arrows did.
   *
   * Unsubtracted, the leading slide's own offset *is* the bleed, so scrolling
   * to index 0 put its edge back on the clip edge. Measured on the insights
   * carousel: `scrollLeft` resting at 4 against a 4px bleed, the first card
   * shaved, and no scrolling done to cause it.
   *
   * **On a right-to-left track the leading edge is the right one**, and
   * `scrollLeft` counts down from zero as the track moves on. Measured from the
   * left, a carousel showing one slide at a time happened to come out right,
   * each slide a whole track to the left of the one before it; one showing
   * three put every one of the first few slides at a positive offset the
   * scroller cannot reach, so it clamped to zero and the next arrow moved the
   * dots and not the slides. Measured in Chromium on the several-across
   * example: three presses of next, `index` at 2 and `scrollLeft` still at 0.
   */
  private edgeOf(slide: HTMLElement, track: HTMLElement, bleed: number): number {
    if (this.orientation === 'vertical') {
      return slide.offsetTop - track.offsetTop - bleed
    }
    if (getComputedStyle(track).direction === 'rtl') {
      return slide.offsetLeft + slide.offsetWidth - (track.offsetLeft + track.offsetWidth) + bleed
    }
    return slide.offsetLeft - track.offsetLeft - bleed
  }

  private scrollToIndex(): void {
    /* The pane, not the slide inside it. The pane is the flex item the track
       lays out and the box carrying `scroll-snap-align`, so it is what the
       scroller's offsets are about; the slide is its content and, before the
       assignment lands, is not in the track's layout at all. */
    const slide = this.panes[this.index]
    const track = this.partNamed('track')
    if (!slide || !track) {
      return
    }
    const vertical = this.orientation === 'vertical'
    const target = this.edgeOf(slide, track, this.bleed(track))

    /* Already there, and saying so rather than asking anyway.
     *
     * This is every index change that came *from* the track: a drag settles,
     * the index follows it, and this would then send the scroller where it
     * already is. No scroll runs, so no `scrollend` arrives, and a claim staked
     * here would be cleared by the reader's *next* drag rather than by its own
     * scroll, swallowing it. A pixel of slack, because a snapped offset is
     * fractional and an exact comparison never holds. */
    const at: ScrollToOptions = vertical ? { top: target } : { left: target }
    if (Math.abs(target - (vertical ? track.scrollTop : track.scrollLeft)) < 1) {
      /* **Unless a scroll of ours is still on its way somewhere else.** Where
         the track is and where it is going differ until that scroll arrives,
         and two presses inside one frame leave the first one's smooth scroll
         not yet moved: the second found the track already at its slide, asked
         nothing, and the first carried on. Measured in Chromium on the events
         example, next then previous: the index said the first slide and the
         track came to rest on the second. An instant scroll to here replaces
         the one in flight, and the claim goes with it rather than waiting on a
         `scrollend` a scroll that moved nothing need not send. Chromium does
         send one, and it then finds the track on the index's own slide, which
         reads as nothing to do. */
      if (this.settling) {
        track.scrollTo({ behavior: 'instant', ...at })
        this.settling = false
      }
      return
    }

    /* The preference is read here, because this is where the motion is.
     *
     * `scroll-behavior: auto` in a reduce block does nothing: it restates the
     * initial value, and the scroll that actually animates is this call, which
     * names `smooth` outright and overrides the property either way. */
    const still = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    /* The scroll about to run is ours, so the `scrollend` it produces is not a
       reader saying where they went. See `handleScroll`. */
    this.settling = true
    track.scrollTo({ behavior: still ? 'instant' : 'smooth', ...at })
  }

  /**
   * Whether the scroll now settling is one this component asked for.
   *
   * Cleared by the first `scrollend` after it is set, and by a reader taking
   * hold of the track. The second half is not belt and braces: a `scrollTo`
   * whose target is already the scroll position fires no `scrollend` at all,
   * and the clamped end of a `per-view` track is exactly that case. Measured:
   * clicking past the last reachable slide moves `index` and produces no
   * `scrollend`, so a flag that only a `scrollend` could clear would stay set
   * and swallow the reader's next drag.
   */
  private settling = false

  /* A reader's own input on the track ends our claim on the next `scrollend`,
     whatever became of the scroll we issued. */
  private readonly handleTake = (): void => {
    this.settling = false
  }

  /**
   * Stops rotation for good.
   *
   * Hovering away or moving focus out does not start it again. The APG is
   * explicit that rotation resumes only when the reader asks for it, because a
   * carousel that starts moving again on its own is the thing the control
   * exists to escape.
   */
  private stop(): void {
    this.stopped = true
    this.rotating = false
  }

  private start(): void {
    this.stopped = false
    this.rotating = true
  }

  /**
   * Owns the timer, from the state rather than from the call site.
   *
   * Never hold the interval in `start()` and `stop()` and start one from
   * `connectedCallback`: a DOM move re-runs connect and restarts rotation the
   * reader stopped, and the server, which never runs connect at all, renders
   * the control saying the opposite of what it will do. The state is what is
   * declared and the timer follows it, which also means one place clears it.
   */
  private runTimer(): void {
    clearInterval(this.timer)
    this.timer = undefined
    if (!this.rotating || this.slides.length < 2) {
      return
    }
    this.timer = setInterval(() => this.goTo(this.index + 1), this.interval)
  }

  /**
   * The slide the track is nearest to, or undefined when there is no track.
   *
   * Shared by the two readers of the scroll position, which want the same
   * arithmetic and disagree about what to do with it: one commits where a drag
   * settled, the other follows it while it is still moving.
   *
   * Only the leading edges a window can actually rest on. Past the last
   * position every remaining slide is on screen already, and taking the nearest
   * of *those* to the scroller's edge reported a place the reader could not get
   * back to: dragged fully right, a four-across six reported the sixth slide
   * and the dots jumped to an indicator that no longer existed.
   */
  private nearest(): number | undefined {
    const track = this.partNamed('track')
    if (!track) {
      return undefined
    }
    const bleed = this.bleed(track)
    const at = this.orientation === 'vertical' ? track.scrollTop : track.scrollLeft
    return this.panes.slice(0, this.positions).reduce(
      (best, slide, index) => {
        const distance = Math.abs(this.edgeOf(slide, track, bleed) - at)
        return distance < best.distance ? { distance, index } : best
      },
      { distance: Number.POSITIVE_INFINITY, index: this.index },
    ).index
  }

  /**
   * Follows the track while a reader is still dragging it.
   *
   * **`scrollend` is the only honest place to commit an index and much too late
   * to show one.** It fires once momentum has fully settled, which on iOS is
   * most of a second after the finger has left the glass, so the dots sit on
   * the old slide for the whole of the coast and then jump.
   *
   * So showing and committing are separated. This moves the marker and nothing
   * else: no state is written and no event is dispatched, because neither is
   * true yet. A drag in flight is not a reader having chosen, `handleScroll`
   * still decides that, and a consumer holding `index` still hears once.
   *
   * **The marker only, and not `aria-current` or the roving `tabindex`.** Those
   * describe where the reader *is*, which is a question with one answer per
   * settled position; moving them every frame of a drag would churn the
   * accessibility tree to report a place nobody has arrived at.
   *
   * Coalesced to a frame, a scroll firing far more often than a screen
   * refreshes, and skipped while we are settling a scroll of our own: a click
   * has already moved the index and the track is following it, which is the
   * precedence `handleScroll` documents at length.
   */
  private readonly handleTrackScroll = (): void => {
    if (this.settling || this.scrollFrame) {
      return
    }
    this.scrollFrame = requestAnimationFrame(() => {
      this.scrollFrame = 0
      const nearest = this.nearest()
      if (nearest !== undefined && nearest !== this.showing) {
        this.showing = nearest
      }
    })
  }

  /**
   * Reads where a reader's drag settled, and only a reader's.
   *
   * **The scroll we issued ourselves ends with a `scrollend` too, and taking it
   * as a reading is what makes the dots jump back.** Run on every one, the
   * index a reader just chose is overwritten by whichever slide happened to be
   * nearest the leading edge when the animation finished. Any disagreement
   * there is enough: a snap settling a pixel short of a midpoint, a target
   * clamped by the scroller's own maximum, a fractional layout, or a smooth
   * scroll cut off by the next click. The component asked for slide four, the
   * pixels said three, and the pixels won.
   *
   * Which is the wrong precedence in one direction only. A drag is the reader
   * moving the track and the index has to follow it; a click is the reader
   * moving the index and the track has to follow *that*. One `scrollend` cannot
   * tell those apart, so the flag does.
   */
  private readonly handleScroll = (): void => {
    if (this.settling) {
      this.settling = false
      return
    }
    /* The marker goes back to following the committed index, whatever this
       reading turns out to be: the drag is over, so there is no longer a
       position of its own to show. */
    this.showing = undefined
    const nearest = this.nearest()
    if (nearest === undefined) {
      return
    }
    /* Announced after the fact, and deliberately, where `goTo` announces
       before. The reader has already dragged the track here: there is nothing
       to refuse, and `preventDefault()` could not un-drag it. This is the case
       the controlled-change helper's own documentation distinguishes, a native
       control that has already moved, and putting it on that path would offer a
       refusal that cannot be honored. */
    if (nearest === this.index) {
      return
    }
    this.indexState = nearest
    this.requestUpdate('index')
    this.dispatchEvent(new HelixSelectEvent({ value: String(nearest) }))
  }

  /**
   * Where the track is right now, while a drag is still running.
   *
   * Separate from `index`, which is where the reader has *arrived*. Undefined
   * whenever the two would agree, so the marker falls back to the committed
   * index the moment a drag settles and nothing has to keep them in step. See
   * `handleTrackScroll` for why they are not one value.
   */
  @state()
  private showing: number | undefined

  /** The pending frame for the above, so a burst of scrolls costs one reading. */
  private scrollFrame = 0

  /**
   * Whether the reader has stopped it, as opposed to something pausing it.
   *
   * The two were one flag and the difference matters: `focusin` bubbles, so
   * every focus move inside the carousel re-ran `stop()`, and a reader who
   * pressed Start had it undone by their very next Tab. Pausing on hover and on
   * focus is right; forgetting that the reader asked it to stop is not, and the
   * APG is explicit that rotation resumes only when the reader asks.
   */
  private stopped = false

  /**
   * Watches the light DOM for slides arriving and leaving.
   *
   * **A manually assigned slot does not announce them.** `slotchange` fires when
   * an assignment changes, and under `slotAssignment: 'manual'` the only thing
   * that changes an assignment is this component calling `assign`, so a slide
   * appended by a consumer would reach no slot, render nowhere and be counted by
   * nothing. A default slot needs no watcher, taking whatever is there; a manual
   * one does. `Chat` watches for the same reason.
   */
  private watcher: MutationObserver | undefined = undefined

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('focusin', this.pause)
    this.addEventListener('pointerenter', this.pause)
    this.watcher = new MutationObserver(() => this.requestUpdate())
    this.watcher.observe(this, { childList: true })
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    if (this.scrollFrame) {
      cancelAnimationFrame(this.scrollFrame)
      this.scrollFrame = 0
    }
    this.removeEventListener('focusin', this.pause)
    this.removeEventListener('pointerenter', this.pause)
    this.watcher?.disconnect()
    this.watcher = undefined
    clearInterval(this.timer)
    this.timer = undefined
  }

  /** Pauses without forgetting that the reader wanted it running. */
  private readonly pause = (): void => {
    if (!this.stopped) {
      this.rotating = false
    }
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    /* Seeded from the markup rather than started on connect, so the server and
       the client agree about whether it is running. A reader's stop survives a
       reconnection because `stopped` outlives it. */
    if (!this.hasUpdated) {
      this.rotating = this.autoplay
    }
    /* A move of the index is somewhere the reader arrived, so a drag still
       coasting has nothing left to show. Its `scrollend` would have cleared
       this, but the scroll that follows a press is ours, and ours is not read. */
    if (changed.has('index')) {
      this.showing = undefined
    }
    hostAria(this.internals, { label: this.label, role: 'group' })
    // Announced as a carousel rather than as a bare group, so a reader knows
    // what the controls beside it are for.
    this.internals.ariaRoleDescription = 'carousel'
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.finishHydration()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    /* The track follows `index`, whoever moved it.
     *
     * Not from inside `goTo`'s apply callback: that returns early in controlled
     * mode, so the dots update and the slides sit still, and it is not the only
     * path in either, a plain `carousel.index = 2` reaching no apply at all. */
    const count = this.slides.length
    /* And the first time there are panes to follow it to: a carousel whose
       slides arrived after its first render, which is every carousel that
       hydrated a server's markup, had an `index` and nothing to scroll to, and
       stayed on the first slide. Panes drawn, not slides known, because the
       render that hydrated drew none while the slides were already there. */
    const drawn = this.renderRoot.querySelectorAll('[part="slide"]').length
    if (changed.has('index') || (this.scrolledFor === 0 && drawn > 0)) {
      this.scrollToIndex()
    }
    this.scrolledFor = drawn
    this.runTimer()
    /* Back inside the set when the set shrinks.
     *
     * The indicators carry a roving tab stop keyed on `index`, so a carousel
     * whose slides are removed under it is left with no tab stop, no current
     * dot and a focus restore pointing at nothing. In `updated` rather than
     * `willUpdate` because `slides` is empty on the server, and through `goTo`
     * so a controlled consumer is told rather than overwritten. */
    if (count > 0 && this.index > count - 1) {
      this.goTo(count - 1)
    }
    this.assign()
  }

  /**
   * Puts each slide into the pane rendered for it.
   *
   * **The panes carry the ARIA and the consumer's element carries none**, which
   * is the whole reason this is a manual assignment rather than a plain slot.
   * The APG wants each slide to be a `group` with `aria-roledescription="slide"`
   * and a name saying where it sits in the run, and writing those onto the
   * elements a consumer wrote fails twice, only one of them about frameworks.
   *
   * **A React consumer's slides are nodes React is in the middle of hydrating.**
   * Attributes landing before React reaches them are a DOM it did not render,
   * which it reports as a mismatch and will not patch up: the ARIA survives and
   * the announcement is correct, so the console is the only tell. Deferring the
   * write does not help, a frame being a race rather than an ordering: measured
   * in Chromium on the landing page, a tab opened in the foreground still
   * reported the mismatch and a tab opened hidden did not, only because
   * `requestAnimationFrame` had not run there yet. `Chat`'s comment on
   * `shadowRootOptions` reaches the same conclusion.
   *
   * **And `role="group"` on a consumer's `<a href>` is not additive.** It
   * replaces the implicit link role, so six insight cards on the landing page
   * announced as groups and left the links list entirely. No amount of
   * deferring helps, because the write is the bug. A pane around the slide is
   * what the pattern actually asks for: a group holding a link, rather than a
   * link relabeled as a group.
   */
  private assign(): void {
    /* Hydrating a server's root, which routes by name: each slide is sent to
       the pane numbered for it, which the template names only on such a root. */
    if (this.assignsByName) {
      this.slides.forEach((slide, index) => {
        this.route(slide, `slide-${index + 1}`)
      })
      return
    }
    const panes = this.renderRoot?.querySelectorAll?.<HTMLSlotElement>('[part="slide"] slot')
    if (!panes) {
      return
    }
    /* Paired by position, and short-circuited by whichever ran out: a render
       and a child list can disagree for one update when children arrive after
       the template was built, and the mutation observer schedules the update
       that reconciles them. */
    this.slides.forEach((slide, index) => {
      panes[index]?.assign?.(slide)
    })
  }

  /**
   * How far short of a whole pixel the run of slides ends, for the last one.
   *
   * **The run has to end on a whole pixel, because a right-to-left track cannot
   * reach a fraction.** Three across 692 makes the run 450.66 longer than the
   * track. Chromium measures a right-to-left scroller from its far end and
   * floors that length, so the track stops at -450 where a left-to-right one
   * rounds to 451, and two thirds of a pixel of the slide before stays at the
   * leading edge. Ending on a whole pixel, the far end is one number both ways
   * and the last place rests on it in both, so a swipe to the end stops there
   * too.
   *
   * **Here rather than in a stylesheet, because the count is the component's.**
   * The arithmetic wants how many slides there are, and CSS can only ask
   * `sibling-count()`, which is Chromium-only, evaluates to 0 through
   * `::part()`, and needs a `:last-child` that `::part()` cannot carry either.
   * So the styled tier could correct its run and a consumer writing their own
   * several-across sheet could not: measured in Chromium at three across, the
   * headless tier rested at 451 against -450 while the styled tier rested at
   * one number both ways. Published from here, one declaration reading this
   * gets both tiers and any consumer to the same place.
   *
   * **WebKit takes the margin and does not need it**, which is the reason a
   * correction written in CSS looked like enough. It has no `sibling-count()`
   * at all, so nothing reached that engine, and its track rested on one number
   * both ways anyway. Measured with the margin in place, the same widths:
   * every resting place is the number it was without it.
   *
   * **On the last slide alone, which is what makes that one declaration
   * enough.** A sheet writes `margin-inline-end: var(--carousel-run-end, 0px)`
   * across every pane and the fallback answers on all but the last, so nothing
   * has to select a slide by its position in the run.
   *
   * **A sheet says how wide a pane is and how far apart they sit, and this
   * reads both back.** Set neither and the correction is invalid at
   * computed-value time, which is the fallback rather than a broken margin. The
   * percentage resolves where the value is used, on the last pane, so it is the
   * track's content box and not the track's own containing block: the width the
   * run is actually measured against.
   *
   * Horizontal only. A vertical track scrolls the other axis, `scrollTop`
   * counts up from zero whatever the writing mode, and there is no far end to
   * floor.
   */
  private runEnd(): string | typeof nothing {
    if (this.orientation === 'vertical') {
      return nothing
    }
    const run =
      `${this.slides.length} * (var(--carousel-pane) + var(--carousel-gap))` +
      ' - var(--carousel-gap) - 100%'
    return `--carousel-run-end: calc(round(${run}, 1px) - (${run}))`
  }

  protected override render(): TemplateResult {
    const rotating = this.rotating
    const last = this.slides.length - 1

    return html`<div part="controls">
        ${
          this.autoplay
            ? html`<button
                part="rotation"
                type="button"
                aria-label=${rotating ? 'Stop slide rotation' : 'Start slide rotation'}
                @click=${() => (rotating ? this.stop() : this.start())}
              >
                <svg part="rotation-mark"
                  fill="currentColor"
                  viewBox=${rotating ? stop.viewBox : play.viewBox}
                  aria-hidden="true"
                >
                  ${unsafeSVG(rotating ? stop.content : play.content)}
                </svg>
              </button>`
            : nothing
        }
        ${
          /* `none` takes them out of the tree rather than hiding them, so they
             leave the tab order with them. `auto` renders them and lets the
             stylesheet answer for the pointer, a question CSS can ask directly
             and this cannot without watching a media query from script. */
          this.controls === 'none'
            ? nothing
            : html`<button
                  part="previous"
                  type="button"
                  aria-label="Previous slide"
                  @click=${() => this.goTo(this.index - 1)}
                >
                  <svg part="previous-mark" data-mirror fill="currentColor" viewBox=${caretLeft.viewBox} aria-hidden="true">
                    ${unsafeSVG(caretLeft.content)}
                  </svg>
                </button>
                <button
                  part="next"
                  type="button"
                  aria-label="Next slide"
                  @click=${() => this.goTo(this.index + 1)}
                >
                  <svg part="next-mark" data-mirror fill="currentColor" viewBox=${caretRight.viewBox} aria-hidden="true">
                    ${unsafeSVG(caretRight.content)}
                  </svg>
                </button>`
        }
      </div>
      <div
        data-scroller
        part="track"
        @scroll=${this.handleTrackScroll}
        @scrollend=${this.handleScroll}
        @pointerdown=${this.handleTake}
        @touchstart=${this.handleTake}
        @wheel=${this.handleTake}
      >
        ${this.slides.map(
          (_, index) => html`<div
            part="slide"
            role="group"
            aria-roledescription="slide"
            aria-label=${`${index + 1} of ${this.slides.length}`}
            style=${index === last ? this.runEnd() : nothing}
          >
            <slot
              name=${this.assignsByName ? `slide-${index + 1}` : nothing}
              @slotchange=${() => this.requestUpdate()}
            ></slot>
          </div>`,
        )}
      </div>
      ${
        this.slides.length > 1
          ? html`<div part="indicators" role="group" aria-label=${`${this.label} slides`}>
              ${
                /* Plain buttons, not a half-built tablist.
                 *
                 * `role="tab"` in a `role="tablist"` promises tabpanels, and
                 * the slides are `role="group"`: the APG has two carousel
                 * patterns and taking the announcement of one over the
                 * structure of the other tells a reader to expect panels that
                 * do not exist. This is the basic pattern, buttons that move
                 * the carousel with the current one marked, and `aria-current`
                 * is the right word for "the one you are on" where nothing is
                 * being selected. */
                ''
              }
              ${Array.from({ length: this.positions }).map((_place, at) => {
                const current = at === (this.showing ?? this.index)
                return html`<button
                  part="indicator${current ? ' indicator-current' : ''}"
                  type="button"
                  aria-label=${`Slide ${at + 1}`}
                  aria-current=${at === this.index ? 'true' : nothing}
                  tabindex=${at === this.index ? '0' : '-1'}
                  ?data-current=${current}
                  @keydown=${this.handleIndicatorKeydown}
                  @click=${() => this.goTo(at)}
                ></button>`
              })}
            </div>`
          : nothing
      }`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-carousel': HelixHeadlessCarousel
  }
}
