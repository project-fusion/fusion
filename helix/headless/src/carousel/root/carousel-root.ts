import {
  ChildrenController,
  capturePointer,
  customElement,
  fillTemplate,
  HelixActivateEvent,
  HelixElement,
  HelixSelectEvent,
  hostAria,
  inlineStep,
  isRtl,
  requestChange,
} from '@fusion.dev/helix-core'
import { caretLeft, caretRight, play, stop } from '@fusion.dev/helix-icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'
import { stepStop, stopFor, stopsOf } from '../stops.js'

/**
 * `per-view` as the two things it can be: a count, or the word that is not one.
 *
 * Lit's number converter answers `NaN` for a word, and `NaN` is what the clamp
 * reads as one across, so under `type: Number` a fitted carousel would quietly
 * be a plain one. A converter and not a bare string property, because every
 * other value this takes is a number and a consumer reading `perView` back
 * should get one.
 *
 * Out here rather than inside the decorator's options, where `helix component`
 * reads a property's declaration up to the first closing paren and an arrow
 * function's would be it.
 */
const COUNT_OR_AUTO = {
  fromAttribute: (value: string | null): number | 'auto' | undefined => {
    if (value === null) {
      return undefined
    }
    return value === 'auto' ? 'auto' : Number(value)
  },
  toAttribute: (value: number | 'auto' | undefined): string | null =>
    value === undefined ? null : String(value),
}

/** The named slots for the arrows' glyphs, which are not slides. */
const ICON_SLOTS = ['previous-icon', 'next-icon'] as const

/** How far a mouse moves, in pixels, before a press on the track is a drag. */
const DRAG_SLOP = 4

/**
 * @summary Shows one slide of several, with controls to move between them.
 *
 * @description
 * The track is a scroll container with scroll snapping, so dragging, trackpad
 * swipes, and the browser's momentum scrolling all work. The controls scroll
 * the track.
 *
 * Slides are your own elements, and the carousel writes nothing onto them. It
 * renders a pane for each slide with `role="group"`,
 * `aria-roledescription="slide"`, and a name that gives the slide's position in
 * the set, and assigns the slide into it. A screen reader announces the
 * position, and a slide that is a link stays a link. See `assign`.
 *
 * **Rotation stops on focus and on hover, and stays stopped** until the user
 * starts it again, as the APG requires. The rotation control is labeled with
 * the action it performs and is first in the tab order. Rotation goes on from
 * the last slide to the first, with or without `loop`, which is about the
 * reader's own moves.
 *
 * A move the reader makes is announced, the slide's position read from a
 * polite live region. While the carousel rotates the region is off, so a
 * screen reader is not interrupted every few seconds.
 *
 * **Keyboard.** The indicators are one tab stop.
 *
 * | Key | What it does |
 * |---|---|
 * | Tab | Moves through the rotation control, Previous, Next, the slides' own links and buttons, and the indicators, in that order. |
 * | Enter, Space | Presses the control or the indicator that has focus. |
 * | Right, Left | On an indicator, moves to the next or the previous slide and its indicator. Left moves on, on a right-to-left page. |
 * | Down, Up | The same, on a vertical carousel. |
 * | Home, End | On an indicator, moves to the first or the last slide. |
 *
 * Without `loop`, Previous on the first slide and Next on the last are marked
 * `aria-disabled`, and keep focus.
 *
 * **What a screen reader hears.** The carousel is a group named by `label`,
 * announced as `role-label` ("carousel"). Each slide is a group announced as
 * `slide-role-label` ("slide") and named by `slide-label` ("2 of 5"). After a
 * move by a control, an indicator, a key, or a drag, the `live` part says the
 * slide's name politely. While the carousel rotates the region is off.
 *
 * **`slides-per-move` moves several slides at a time.** With `per-view="3"`
 * and `slides-per-move="3"`, Next shows the next three, there is one
 * indicator for each stop, and the track snaps only at the stops. The last
 * stop is always the end of the run, so a run that does not divide evenly
 * ends on its last slides. Unset moves one slide.
 *
 * **`mouse-drag` lets a mouse drag the track**, which otherwise only a touch
 * screen, a trackpad, or the scroll wheel moves. The drag follows the pointer
 * with snapping off and settles on the nearest slide when it is let go, and
 * that move is announced and refusable like a press of Next. A link in a slide
 * is not followed at the end of a drag.
 *
 * The glyphs on Previous and Next can be replaced by slotting an icon of your
 * own into `previous-icon` and `next-icon`.
 *
 * @since 0.1.0
 * @status stable
 * @category layout
 * @aliases Slider, Gallery, Slideshow
 * @documentation https://fusion.dev/helix/components/carousel
 *
 * @slot - The slides.
 * @slot next-icon - The glyph on the control that moves to the next slide. Defaults to a caret.
 * @slot previous-icon - The glyph on the control that moves to the previous slide. Defaults to a caret.
 *
 * @event {HelixActivateEvent} helix-activate - Fired after the slide in view changes, with the new index as a string in `detail.value`.
 * @event {HelixSelectEvent} helix-select - Fired before the slide in view changes, with the requested index. Cancelable: cancel it to keep the current slide. Nothing moves, and a drag returns to the slide the index still holds. See `handleScroll`.
 *
 * @csspart controls - The row of controls.
 * @csspart indicator - One indicator. Pressing it moves to its slide.
 * @csspart indicator-current - The indicator for the slide in view, alongside `indicator`.
 * @csspart indicators - The row of indicators that shows which slide is in view.
 * @csspart live - The region that announces the slide a move lands on. Visually hidden in the styled tier.
 * @csspart next - The control that moves to the next slide.
 * @csspart next-mark - The glyph on the next control.
 * @csspart previous - The control that moves to the previous slide.
 * @csspart previous-mark - The glyph on the previous control.
 * @csspart rotation - The control that stops and starts rotation.
 * @csspart rotation-mark - The glyph on the play and pause control.
 * @csspart slide - The pane one slide is shown in, and the box the track snaps to.
 * @csspart track - The scroller the slides sit in.
 *
 * @cssproperty --carousel-gap - Space between slides. Your stylesheet sets it, and the component uses it to measure the run.
 * @cssproperty --carousel-pane - The size of one pane. Your stylesheet sets it, and the component uses it to measure the run.
 * @cssproperty --carousel-per-view - How many slides go across. The component writes it onto the track, so your stylesheet divides the track by the same number the component counts positions from. Read this property to follow `per-view`, because attribute selectors cannot cover every possible count. Under `per-view="auto"` the component writes nothing and your stylesheet declares it, so the same name works in both modes. See `perView`.
 * @cssproperty --carousel-run-end - How far short of a whole pixel the run ends, set on the last slide only. Your stylesheet applies it as `margin-inline-end`. See `runEnd`.
 * @cssproperty --carousel-slide-min - The narrowest a slide may be. `per-view="auto"` uses it to fit slides into the track. It must be a length, because the stylesheet divides by it. When unset, it is the whole track, which shows one slide across.
 *
 * @cssstate dragging - While a mouse drags the track, under `mouse-drag`.
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
   * The slide to start on, used until `index` is set.
   */
  @property({ attribute: 'default-index', type: Number })
  defaultIndex = 0

  /**
   * The slide in view, counted from zero.
   *
   * Reading gives the real slide. Writing always applies, the way a script
   * assigning to a native control does, and is a seed and a correction rather
   * than a claim of ownership: a consumer who wants the decision refuses the
   * `helix-select`. `default-index` is where the carousel starts until
   * something moves it.
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
   * The name of each indicator, with `{index}` filled in.
   *
   * **Every word the carousel speaks is a property**, so a page in another
   * language hears its own: only `label` was, and the controls around it
   * read out in English.
   */
  @property({ attribute: 'indicator-label' })
  indicatorLabel = 'Slide {index}'

  /**
   * The name of the row of indicators, with the carousel's `{label}` filled in.
   */
  @property({ attribute: 'indicators-label' })
  indicatorsLabel = '{label} slides'

  /**
   * How long each slide is held, in milliseconds.
   */
  @property({ type: Number })
  interval = 5000

  /** The slide in view, whoever set it, and `undefined` until somebody has. */
  private indexState: number | undefined = undefined

  /** How many panes were drawn at the last update, to scroll when the first are. */
  private scrolledFor = 0

  /** What the live region says: the position of the slide the last move landed on. */
  private said = ''

  /**
   * The carousel's name, read by screen readers.
   */
  @property()
  label = 'Carousel'

  /**
   * Whether moving past either end wraps to the other.
   */
  @property({ type: Boolean })
  loop = false

  /**
   * Whether a mouse can drag the track from slide to slide.
   *
   * Off unless asked for, because a press on a slide is then the start of a
   * drag, and text in a slide can no longer be selected with the mouse. A drag
   * of a few pixels or less is still a press.
   */
  @property({ attribute: 'mouse-drag', reflect: true, type: Boolean })
  mouseDrag = false

  /**
   * The name of the control that moves to the next slide.
   */
  @property({ attribute: 'next-label' })
  nextLabel = 'Next slide'

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
   * **The number is published to the styles rather than enumerated by them**,
   * as `--carousel-per-view` on the track, which is what keeps a width and a
   * count from disagreeing. A sheet can only name a value it wrote a rule for,
   * so a sheet enumerating `per-view="2"` through `5` is a ceiling of five, and
   * above it the pane falls back to one across while this file goes on counting
   * positions. Measured in Chromium over eight slides against such a sheet, six
   * across gave three dots, a pane taking the whole track and five slides
   * reachable only by dragging. Published from here there is no ceiling to
   * exceed, and every sheet reads the same declaration. `runEnd` publishes its
   * correction the same way and for the same reason.
   *
   * **On the track and not on the host.** A custom property on the host is a
   * reflected attribute by another name: it would arrive on upgrade, and a
   * consumer's server markup never had it. Inside the component's own shadow
   * root it serializes with the rest of the template on the server, and the
   * track's own declaration beats anything a consumer inherits in, so the
   * attribute is the one answer to how wide a pane is.
   *
   * A value the track cannot honor is taken to the nearest one it can, by
   * `across`, and both tiers read that rather than this.
   *
   * **`auto` fits as many as the track can hold**, at `--carousel-slide-min`
   * apiece, and nothing is written onto the track: the count is the sheet's,
   * and the sheet's alone, because it is the one number here CSS can work out
   * for itself. Everything it takes is a length the sheet already has, so the
   * panes are laid out at their final width by the first rule that runs, on a
   * server's markup as on the client's, and no script is waited on. That is the
   * whole reason a declared count was ever the only option: a carousel that
   * asks how wide its container is can only ask on the client, so the panes go
   * down at one width and move to another when the answer arrives. Written
   * inline the count would outrank the sheet that computes it, which is why an
   * `auto` track is handed nothing. A count stays for the design that calls for
   * exactly three.
   *
   * A sheet says how it divides, and the `auto` example here carries the same
   * three lines for a consumer writing their own.
   *
   * **A value rather than the resting behavior**, which is what the
   * responsiveness policy asks of every axis that a box decides: a splitter
   * turns on `orientation="auto"` and a plain one does not turn at all. Fitting
   * changes what the carousel *does*, since how many are across is how many
   * places the track can stop, so a carousel that had not asked for it would
   * find its position count moving with the window.
   *
   * No default, because it reflects. A reflected property with a value writes
   * its attribute on upgrade, and the host then carries something a consumer's
   * server markup never had, which React reports as a mismatch. The one-across
   * case is the absent attribute, and the styles read it that way.
   */
  @property({ attribute: 'per-view', converter: COUNT_OR_AUTO, reflect: true })
  perView?: number | 'auto'

  /**
   * The name of the control that moves to the previous slide.
   */
  @property({ attribute: 'previous-label' })
  previousLabel = 'Previous slide'

  /**
   * The word screen readers announce in place of the carousel's role, set as
   * `aria-roledescription`. Translate it with the rest of your text, or empty
   * it to leave the role as `group`.
   */
  @property({ attribute: 'role-label' })
  roleLabel = 'carousel'

  /**
   * The name of each slide, with `{index}` and `{count}` filled in.
   */
  @property({ attribute: 'slide-label' })
  slideLabel = '{index} of {count}'

  /**
   * The word screen readers announce in place of a slide's role, set as
   * `aria-roledescription`. Translate it with the rest of your text.
   */
  @property({ attribute: 'slide-role-label' })
  slideRoleLabel = 'slide'

  /**
   * How many slides Previous, Next, the indicators, rotation, and a drag move
   * at a time. Unset moves one. The track stops at every `slides-per-move`th
   * position from the first, and at the last.
   */
  @property({ attribute: 'slides-per-move', type: Number })
  slidesPerMove?: number

  /**
   * The name of the rotation control while rotation is stopped.
   */
  @property({ attribute: 'start-label' })
  startLabel = 'Start slide rotation'

  /**
   * The name of the rotation control while rotation is running.
   */
  @property({ attribute: 'stop-label' })
  stopLabel = 'Stop slide rotation'

  /**
   * A declared `perView` as both tiers use it: a whole number, one at least.
   *
   * **The clamp is here because the arithmetic is here**, and the two readers
   * of this number have to be given the same one. A fraction is floored, since
   * a position is a whole slide along: one and a half across leaves a last
   * position the track runs out before reaching, which is the fault `goTo`
   * already carries a comment about. Zero and a negative divide the track into
   * nothing and into a pane facing the wrong way, and a non-numeric attribute
   * parses to `NaN`, which `Math.max` propagates: it counted `NaN` positions,
   * drew no indicators at all and left `index` at `NaN`. All of them read as
   * one across, which is what a carousel with nothing sayable asked for.
   *
   * **A vertical `auto` is one of them.** Fitting divides the room the page
   * gave the track, and a vertical track's room is a height the consumer chose
   * with `--carousel-block-size`: there is nothing there to fit against that
   * they did not already decide, so the count is theirs to state. It also
   * cannot be had cheaply, the block axis wanting `container-type: size`, which
   * lays a track out as empty wherever its height is not definite.
   *
   * Not clamped to the number of slides. Six across four slides is four panes
   * at a sixth of the track each and the one place to stand, which is what was
   * asked for as nearly as it can be had, and the slide count is a fact the
   * server does not have: clamping to it would draw one width there and another
   * on upgrade.
   */
  private get clamped(): number {
    const asked = this.perView ?? 1
    return typeof asked === 'number' && Number.isFinite(asked) ? Math.max(1, Math.floor(asked)) : 1
  }

  /** Whether the track is fitting slides to its own box rather than to a count. */
  private get fits(): boolean {
    return this.perView === 'auto' && this.orientation !== 'vertical'
  }

  /**
   * How many slides go across, and `undefined` while a fitted track is unlaid.
   *
   * **Undefined is the honest answer and the indicators read it as one**, which
   * is the whole of how a fitted carousel keeps from drawing a run of dots at
   * one length and correcting it at another. The count a fitted track goes
   * across is whatever its box resolved to, so nothing knows it until there is
   * a box: not the server, which has no layout, and not the render that draws
   * the panes, layout being what follows a render rather than what precedes it.
   * The dots wait for it, which costs them nothing, because a server serves no
   * indicators for any carousel, `slides` being empty there.
   *
   * Measured 16 Sep 2026 in Chromium 151.0.7922.34 and WebKit 26.5, recording
   * every run of dots a carousel has from the upgrade on: a fitted one goes
   * none, then five, and never another number; a declared one goes straight to
   * six. What a reader can see is the run missing, never the run wrong.
   */
  private get across(): number | undefined {
    return this.fits ? this.fitted : this.clamped
  }

  /**
   * How many distinct views the track holds, which is what the indicators count.
   *
   * A window of `perView` slides sliding one at a time over `n` of them stops
   * `n - perView + 1` times, so six slides four across is three: 0 to 3, 1 to 4,
   * 2 to 5. One at minimum, since a carousel showing everything it has still
   * has the one place to be.
   *
   * One across until a fitted track has been laid out, which is the same answer
   * a carousel that has never been told anything gives, and the dots are
   * withheld rather than counted from it. See `across`.
   */
  get positions(): number {
    return Math.max(1, this.slides.length - (this.across ?? 1) + 1)
  }

  /** The positions the track stops at, `slides-per-move` apart, and the last. See `stopsOf`. */
  private get stops(): number[] {
    return stopsOf(this.positions, this.slidesPerMove)
  }

  /**
   * How many slides the box turned out to hold, from the pane it laid out.
   *
   * **The measurement asks what happened rather than what was asked for**, and
   * that is why it is the pane's width and not the count in the declaration.
   * The sheet divides the track by `--carousel-per-view`, which under `auto` is
   * arithmetic rather than a number, and a consumer's own sheet may divide it
   * some other way entirely or grow the panes to fill a track holding
   * everything it has. Reading the box back gets the same answer as the
   * declaration wherever the two agree and the true one wherever they do not,
   * so a width and a count cannot disagree in either direction.
   *
   * The sheet's own arithmetic run backward, on the lengths that were actually
   * used: a gap added to the room, divided by a pane and a gap. Rounded,
   * because the pane a sheet lays out is a sixty-fourth off its exact share by
   * design and the quotient lands a ten-thousandth off a whole number.
   *
   * Undefined where there is nothing to measure, which is a harness rather than
   * a browser: happy-dom lays nothing out and reports zero for every box, and a
   * count taken from zeros would be a number with no layout behind it.
   */
  private measure(): number | undefined {
    const track = this.partNamed('track')
    const pane = this.panes[0]?.getBoundingClientRect().width
    if (!track || pane === undefined) {
      return undefined
    }
    const asked = Number.parseFloat(getComputedStyle(track).columnGap)
    const gap = Number.isNaN(asked) ? 0 : asked
    const room = track.clientWidth - 2 * this.bleed(track)
    if (pane <= 0 || room <= 0) {
      return undefined
    }
    return Math.max(1, Math.round((room + gap) / (pane + gap)))
  }

  /**
   * Takes the reading, and puts the index back inside what it leaves.
   *
   * **A fitted carousel's last position moves with the window**, which a
   * declared one's never does: eight slides at one across has eight places to
   * stand and four across has five, so a track widened while the reader sits on
   * the last of them is a track resting somewhere it can no longer be. See
   * `holdIndex` for why the correction is not a request.
   *
   * Only on a change, so the observer's own re-render cannot feed itself.
   */
  private readonly readFit = (): void => {
    const fitted = this.measure()
    if (fitted === undefined || fitted === this.fitted) {
      return
    }
    this.fitted = fitted
    this.holdIndex()
  }

  /**
   * Puts the index back on the last place the track can stand, where fewer
   * places are left than it counted.
   *
   * **Written, with no request.** Nobody asked for this move: a slide was
   * removed, the window widened, or `per-view` went up. It went out as a
   * cancelable `helix-select`, which a consumer reading the event as a reader's
   * request had no reason to expect, and refusing it left the index past the
   * last slide, with no current indicator and no tab stop, and asked again on
   * every update. An index that cannot be refused is not a request.
   */
  private holdIndex(): void {
    const last = this.positions - 1
    if (this.slides.length > 0 && this.index > last) {
      const previous = this.index
      this.indexState = Math.max(0, last)
      this.requestUpdate('index', previous)
    }
  }

  /**
   * The count handed to the styles, and nothing at all where they work it out.
   *
   * A declared count is this file's: it decides how many places the track can
   * stop, so the number the panes are divided by has to be the number the
   * positions were counted from, and writing it on the track inside the
   * component's own shadow root is what keeps a sheet from having to enumerate
   * the values it will answer for.
   *
   * A fitted one is the sheet's, and handing it anything would take it back: an
   * inline declaration outranks every rule short of `!important`, so a track
   * told `1` here could never be told three by the rule that fits it. The
   * absence is not a gap either, because the rule that computes the count
   * declares it on this same element, which beats anything a consumer inherits
   * in exactly as the inline one did.
   */
  private handed(): string | typeof nothing {
    return this.fits ? nothing : `--carousel-per-view: ${this.clamped}`
  }

  /**
   * The track's inline style: the count above, and snapping off while a mouse
   * drags it.
   *
   * **Inline, because the drag does not work without it.** A track that snaps
   * puts every scroll the drag asks for back on the nearest slide, so the
   * slides jump from one to the next under the pointer. A stylesheet cannot be
   * relied on to turn snapping off, since the headless tier has none, so the
   * component says it for the length of the drag and no longer.
   *
   * **And `!important`, because a document rule beats a shadow root's inline
   * style.** The style attribute is in the shadow tree's context, and a
   * consumer's `::part(track)` rule is in the document's, which wins every
   * normal declaration. Measured in Chromium on a headless track snapping from
   * the document: the inline `none` was there and the computed value stayed
   * `x mandatory`, and the drag never moved the track. An important
   * declaration sorts the other way, the inner context first.
   */
  private trackStyle(): string | typeof nothing {
    const handed = this.handed()
    if (!this.dragging) {
      return handed
    }
    const off = 'scroll-snap-type: none !important'
    return handed === nothing ? off : `${handed}; ${off}`
  }

  /** What the box resolved to, and `undefined` until it has been laid out. */
  @state()
  private fitted: number | undefined

  /** Watches the pane a fitted track laid out, while `auto` is what was asked. */
  private sizes: ResizeObserver | undefined

  /** The pane being watched, so a re-rendered run moves the watch with it. */
  private watched: HTMLElement | undefined

  /**
   * Starts or stops watching, according to what the count was asked to be.
   *
   * **The pane and not the track, because both questions move it.** A narrower
   * track divides into a narrower pane, and so does a slide arriving or leaving
   * where the panes grow to fill a track holding everything it has. A watch on
   * the track answers the first and sleeps through the second.
   *
   * **An observation is delivered after layout and inside the same rendering
   * step**, and the update it asks for is a microtask on the end of it, so the
   * dots are added to a frame that has not been painted. Taking the reading
   * from `updated` instead would be the same arithmetic one Lit warning
   * earlier, and the warning is about the right thing: a render that has to
   * read layout is a render that has to run twice.
   *
   * Called from `connectedCallback`, `firstUpdated` and `updated`, so a
   * consumer switching to `auto` after mount is watched, one switching away
   * stops being, and a carousel moved in the DOM is watched again. Observing is
   * what asks for the first reading, so the watch is rebuilt rather than kept
   * across a mode change.
   */
  private watchPane(): void {
    if (!this.fits || typeof ResizeObserver === 'undefined') {
      this.sizes?.disconnect()
      this.sizes = undefined
      this.watched = undefined
      return
    }
    this.sizes ??= new ResizeObserver(this.readFit)
    const pane = this.panes[0]
    if (pane === this.watched) {
      return
    }
    if (this.watched) {
      this.sizes.unobserve(this.watched)
    }
    this.watched = pane
    if (pane) {
      this.sizes.observe(pane)
    }
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
    return this.knownChildren.filter(
      (child): child is HTMLElement =>
        child instanceof HTMLElement && !(ICON_SLOTS as readonly string[]).includes(child.slot),
    )
  }

  /** What a consumer slotted into one of the arrows' glyph slots. */
  private iconsFor(name: (typeof ICON_SLOTS)[number]): Element[] {
    return this.knownChildren.filter((child) => child.slot === name)
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
    const vertical = this.orientation === 'vertical'
    const step = vertical
      ? event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowUp'
          ? -1
          : 0
      : inlineStep(this, event.key)
    let to: number
    if (event.key === 'Home') {
      to = 0
    } else if (event.key === 'End') {
      to = this.positions - 1
    } else if (step === 0) {
      return
    } else {
      to = this.move(step)
    }
    event.preventDefault()
    this.goTo(to)
    this.updateComplete.then(() => {
      this.renderRoot.querySelector<HTMLElement>('[part~="indicator-current"]')?.focus()
    })
  }

  /**
   * Puts a requested slide in view, and says so.
   *
   * `helix-activate` is the notification after `helix-select`, the one Tour
   * and Tabs send once a different member is current. A clamp in `holdIndex`
   * sends neither, being a correction rather than a move anybody asked for.
   */
  private applyIndex(value: number): void {
    const previous = this.index
    this.indexState = value
    this.requestUpdate('index', previous)
    this.dispatchEvent(new HelixActivateEvent({ value: String(value) }))
  }

  /**
   * The position one stop forward or back lands on, wrapping where `loop`
   * says so.
   */
  private move(step: number): number {
    return stepStop(this.stops, this.index, step < 0 ? -1 : 1, this.loop)
  }

  /** Moves to a slide. It wraps past either end only when `loop` is set. */
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
      apply: (value) => this.applyIndex(value),
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
   * `offsetTop` it is subtracted from.
   *
   * **The side read is the side the track scrolls on, and not one side standing
   * for four.** They are one length on a track laid out at the defaults and
   * stop being one the moment a consumer raises `--carousel-bleed`, which the
   * hook exists to invite: a slide on `--helix-shadow-lg` reaches 44px and is
   * told to ask for it. So a horizontal track's room is its inline padding and
   * a vertical one's is its block padding, and each sheet puts the bleed where
   * the scroller clips. Reading one side for both would have a vertical track
   * measuring a length nothing on its axis was laid out with.
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
    if (isRtl(track)) {
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

  /** Whether a mouse is dragging the track. */
  @state()
  private dragging = false

  /** A mouse pressed on the track under `mouse-drag`, from where it pressed. */
  private pull: { left: number; top: number; x: number; y: number } | undefined

  /** Takes the press, and under `mouse-drag` the start of a drag. */
  private readonly handlePress = (event: PointerEvent): void => {
    this.handleTake()
    const track = this.partNamed('track')
    if (!this.mouseDrag || event.pointerType !== 'mouse' || event.button !== 0 || !track) {
      return
    }
    this.pull = { left: track.scrollLeft, top: track.scrollTop, x: event.clientX, y: event.clientY }
  }

  /**
   * Moves the track with the pointer.
   *
   * Not until the pointer has moved a few pixels, so a press on a link or a
   * button in a slide stays a press. Instant scrolls, since a smooth one would
   * trail the pointer.
   */
  private readonly handlePull = (event: PointerEvent): void => {
    const pull = this.pull
    const track = this.partNamed('track')
    if (!pull || !track) {
      return
    }
    /* Let go off the track before it was a drag, where no release reached it. */
    if ((event.buttons & 1) === 0) {
      this.pull = undefined
      return
    }
    const across = event.clientX - pull.x
    const down = event.clientY - pull.y
    if (!this.dragging) {
      if (Math.hypot(across, down) < DRAG_SLOP) {
        return
      }
      this.dragging = true
      track.style.setProperty('scroll-snap-type', 'none', 'important')
      capturePointer(track, event.pointerId)
    }
    track.scrollTo(
      this.orientation === 'vertical'
        ? { behavior: 'instant', top: pull.top - down }
        : { behavior: 'instant', left: pull.left - across },
    )
  }

  /**
   * Lets go of the track, and settles on the slide nearest to where it was let
   * go.
   *
   * Through the same request as a press of Next, so the move is refusable,
   * sends `helix-activate`, and is announced. A refusal, or a drag that ends on
   * the slide it began on, goes back to that slide once snapping is on again.
   */
  private readonly handleLetGo = (): void => {
    if (!this.pull) {
      return
    }
    this.pull = undefined
    if (!this.dragging) {
      return
    }
    this.swallowClick()
    const nearest = this.nearest()
    this.dragging = false
    this.showing = undefined
    const moved =
      nearest !== undefined &&
      nearest !== this.index &&
      requestChange({
        apply: (value) => this.applyIndex(value),
        event: (value) => new HelixSelectEvent({ value: String(value) }),
        host: this,
        next: nearest,
      })
    if (!moved) {
      this.updateComplete.then(() => this.scrollToIndex())
    }
  }

  /**
   * Keeps the click that ends a drag from following a link in the slide.
   *
   * Once, in capture on the track, and given up a moment later where no click
   * comes, which is a drag let go off the track.
   */
  private swallowClick(): void {
    const track = this.partNamed('track')
    if (!track) {
      return
    }
    const swallow = (event: Event): void => {
      event.preventDefault()
      event.stopPropagation()
    }
    track.addEventListener('click', swallow, { capture: true, once: true })
    setTimeout(() => track.removeEventListener('click', swallow, { capture: true }))
  }

  /** Keeps a mouse drag from picking up a link or an image under `mouse-drag`. */
  private readonly handleDragStart = (event: DragEvent): void => {
    if (this.mouseDrag) {
      event.preventDefault()
    }
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
    /* Round to the first slide after the last, `loop` or not. Without it,
       rotation stopped on the last slide while its control still said it was
       running and the timer went on firing at nothing. */
    this.timer = setInterval(
      () => this.goTo(this.index >= this.positions - 1 ? 0 : this.move(1)),
      this.interval,
    )
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
    /* The stops only, where `slides-per-move` leaves some positions out. */
    return this.stops.reduce(
      (best, index) => {
        const slide = this.panes[index]
        const distance = slide
          ? Math.abs(this.edgeOf(slide, track, bleed) - at)
          : Number.POSITIVE_INFINITY
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
    /* A mouse drag scrolls the track itself, one instant scroll per move, and
       each can end in a `scrollend`. The drag settles when it is let go. */
    if (this.dragging) {
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
    if (nearest === this.index) {
      return
    }
    /* Through the same door as every other index change, and that is a
       correction. This announced after the fact on the argument that a reader
       has already dragged the track here, so there was nothing to refuse and
       `preventDefault()` could not un-drag it. The first half is true and the
       second is not: the track is ours to scroll, so a refusal is honored by
       putting it back on the slide the index still holds, which is exactly what
       `scrollToIndex` does. Left as it was, this was the one place in the
       library dispatching a cancelable event that nothing read. */
    const applied = requestChange({
      apply: (value) => this.applyIndex(value),
      event: (value) => new HelixSelectEvent({ value: String(value) }),
      host: this,
      next: nearest,
    })
    if (!applied) {
      this.scrollToIndex()
    }
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
   * one does. `Chat` watches for the same reason, through the same core
   * controller.
   */
  protected readonly childWatch = new ChildrenController(this)

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('focusin', this.pause)
    this.addEventListener('pointerenter', this.pause)
    /* A move in the DOM runs this and schedules no update, so a watch dropped on
       the way out is only rebuilt here. The panes outlive the move, being in the
       shadow root, so there is one to watch already. */
    this.watchPane()
    /* And the rotation, which the disconnect cleared and only `updated`
       restarts: a carousel moved in the DOM kept showing pause over slides that
       had stopped. From the state, so rotation the reader stopped stays
       stopped. */
    if (this.hasUpdated) {
      this.runTimer()
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    if (this.scrollFrame) {
      cancelAnimationFrame(this.scrollFrame)
      this.scrollFrame = 0
    }
    this.removeEventListener('focusin', this.pause)
    this.removeEventListener('pointerenter', this.pause)
    this.sizes?.disconnect()
    this.sizes = undefined
    this.watched = undefined
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
      /* Not on the first render, which is the carousel arriving. */
      if (this.hasUpdated) {
        this.said = fillTemplate(this.slideLabel, {
          count: this.slides.length,
          index: this.index + 1,
        })
      }
    }
    /* A count that has been asked for again has not been answered again. The
       watch is rebuilt in `updated` and the reading arrives with it, and until
       it does the dots are absent rather than left on the last box's number. */
    if (changed.has('perView')) {
      this.fitted = undefined
    }
    hostAria(this.internals, { label: this.label, role: 'group' })
    // Announced as a carousel rather than as a bare group, so a reader knows
    // what the controls beside it are for. In the page's language, from
    // `roleLabel`, and with no role description where that is empty.
    this.internals.ariaRoleDescription = this.roleLabel || null
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.watchPane()
    this.finishHydration()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    /* The track follows `index`, whoever moved it.
     *
     * Not from inside `goTo`'s apply callback, which is not the only path here:
     * a plain `carousel.index = 2` reaches no apply at all, and a refused
     * `helix-select` reaches none either. */
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
    /* Back inside the run of places to stand, when there are fewer of them.
     *
     * The indicators carry a roving tab stop keyed on `index`, so a carousel
     * whose slides are removed under it is left with no tab stop, no current
     * dot and a focus restore pointing at nothing. In `updated` rather than
     * `willUpdate` because `slides` is empty on the server, and through `goTo`
     * so a controlled consumer is told rather than overwritten.
     *
     * **Positions and not slides, which is the same correction `readFit`
     * makes and the reason the two are one line apart in what they say.** How
     * many places the track can stop is `slides - across + 1`, so raising
     * `per-view` takes places away exactly as widening a fitted track does:
     * six slides at one across is six places, and at four across it is three.
     * Measured under `per-view` raised from 1 to 4 with the reader on the
     * sixth slide: three dots drawn, `index` left at 5, no current dot and no
     * tab stop anywhere in the row, which is this comment's own fault arrived
     * at from the other side. Clamping to the slide count could not see it,
     * and could not see a slide removed under a declared count either, where
     * six slides three across falling to four leaves two places and an index
     * of 3 inside the slides and outside the run. */
    this.holdIndex()
    this.watchPane()
    this.assign()
    this.toggleState('dragging', this.dragging)
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
    /* The glyphs, which a manual root does not route by their `slot` either. */
    for (const name of ICON_SLOTS) {
      this.renderRoot
        ?.querySelector?.<HTMLSlotElement>(`slot[name="${name}"]`)
        ?.assign?.(...this.iconsFor(name))
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
   * So a sheet shipped beside the component could correct its own run and a
   * consumer writing their own several-across sheet could not: measured in
   * Chromium at three across, an uncorrected track rested at 451 against -450
   * where a corrected one rested on one number both ways. Published from here,
   * one declaration reading this gets every sheet to the same place.
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

  /**
   * Whether Previous or Next has nowhere to go, which is only at an end and
   * without `loop`.
   *
   * Said with `aria-disabled` and not `disabled`, so a reader who pressed Next
   * onto the last slide keeps focus on the control they are on. Not on the
   * server, which knows no slides and so no ends.
   */
  private atEnd(side: 'end' | 'start'): boolean {
    if (this.loop || this.slides.length < 2) {
      return false
    }
    return side === 'start' ? this.index <= 0 : this.index >= this.positions - 1
  }

  /**
   * The glyph on Previous: the `previous-icon` slot, holding a caret until
   * something is slotted. A tier above overrides this to draw its own caret.
   */
  protected renderPreviousMark(): TemplateResult {
    return html`<slot name="previous-icon"
      ><svg part="previous-mark" data-mirror fill="currentColor" viewBox=${caretLeft.viewBox} aria-hidden="true">
        ${unsafeSVG(caretLeft.content)}
      </svg></slot
    >`
  }

  /**
   * The glyph on Next: the `next-icon` slot, holding a caret until something
   * is slotted. A tier above overrides this to draw its own caret.
   */
  protected renderNextMark(): TemplateResult {
    return html`<slot name="next-icon"
      ><svg part="next-mark" data-mirror fill="currentColor" viewBox=${caretRight.viewBox} aria-hidden="true">
        ${unsafeSVG(caretRight.content)}
      </svg></slot
    >`
  }

  /**
   * A pane's own declarations: the last pane's `runEnd`, and no snap point on
   * a pane the track does not stop at under `slides-per-move`, so a swipe
   * settles on a stop as the controls do.
   */
  private paneStyle(
    index: number,
    last: number,
    stops: readonly number[],
  ): string | typeof nothing {
    const declared = [
      index === last ? this.runEnd() : nothing,
      /* Important, as the drag's own `scroll-snap-type` is: a document
         `::part(slide)` rule outranks a shadow root's inline declaration, and
         the stops are the carousel's to say. */
      (this.slidesPerMove ?? 1) > 1 && !stops.includes(index)
        ? 'scroll-snap-align: none !important'
        : nothing,
    ].filter((one): one is string => one !== nothing)
    return declared.length > 0 ? declared.join('; ') : nothing
  }

  protected override render(): TemplateResult {
    const rotating = this.rotating
    const last = this.slides.length - 1
    const stops = this.stops
    const place = stopFor(stops, this.index)
    const showing = stopFor(stops, this.showing ?? this.index)

    return html`<div part="controls">
        ${
          this.autoplay
            ? html`<button
                part="rotation"
                type="button"
                aria-label=${rotating ? this.stopLabel : this.startLabel}
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
                  aria-label=${this.previousLabel}
                  aria-disabled=${this.atEnd('start') ? 'true' : nothing}
                  @click=${() => this.goTo(this.move(-1))}
                >
                  ${this.renderPreviousMark()}
                </button>
                <button
                  part="next"
                  type="button"
                  aria-label=${this.nextLabel}
                  aria-disabled=${this.atEnd('end') ? 'true' : nothing}
                  @click=${() => this.goTo(this.move(1))}
                >
                  ${this.renderNextMark()}
                </button>`
        }
      </div>
      <div
        data-scroller
        part="track"
        style=${this.trackStyle()}
        @scroll=${this.handleTrackScroll}
        @scrollend=${this.handleScroll}
        @pointerdown=${this.handlePress}
        @pointermove=${this.handlePull}
        @pointerup=${this.handleLetGo}
        @pointercancel=${this.handleLetGo}
        @lostpointercapture=${this.handleLetGo}
        @dragstart=${this.handleDragStart}
        @touchstart=${this.handleTake}
        @wheel=${this.handleTake}
      >
        ${this.slides.map(
          (_, index) => html`<div
            part="slide"
            role="group"
            aria-roledescription=${this.slideRoleLabel || nothing}
            aria-label=${fillTemplate(this.slideLabel, { count: this.slides.length, index: index + 1 })}
            style=${this.paneStyle(index, last, stops)}
          >
            <slot
              name=${this.assignsByName ? `slide-${index + 1}` : nothing}
              @slotchange=${() => this.requestUpdate()}
            ></slot>
          </div>`,
        )}
      </div>
      ${
        /* The slide a move lands on, said politely, and nothing while the
           carousel rotates: a region announcing every few seconds talks over
           whatever else a reader is listening to. */
        ''
      }<span part="live" aria-live=${rotating ? 'off' : 'polite'}>${this.said}</span>
      ${
        /* A count nobody has yet is not a run of one, so a fitted track serves
           no dots until its box has been laid out and measured. Drawn from a
           guess and corrected a frame later, the run would change length under
           the reader, which is the jump fitting in the sheet exists to avoid,
           and the roving tab stop and every `aria-label` in the row would move
           with it. */
        this.slides.length > 1 && this.across !== undefined
          ? html`<div part="indicators" role="group" aria-label=${fillTemplate(this.indicatorsLabel, { label: this.label })}>
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
              ${stops.map((stop, at) => {
                const current = at === showing
                return html`<button
                  part="indicator${current ? ' indicator-current' : ''}"
                  type="button"
                  aria-label=${fillTemplate(this.indicatorLabel, { index: at + 1 })}
                  aria-current=${at === place ? 'true' : nothing}
                  tabindex=${at === place ? '0' : '-1'}
                  ?data-current=${current}
                  @keydown=${this.handleIndicatorKeydown}
                  @click=${() => this.goTo(stop)}
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
