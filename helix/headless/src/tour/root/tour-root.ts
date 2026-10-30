import {
  auditName,
  controlsIn,
  customElement,
  deepActiveElement,
  deepContains,
  formatWords,
  HelixActivateEvent,
  HelixBeforeActivateEvent,
  HelixCompleteEvent,
  HelixElement,
  hostAria,
  inlineStep,
  internalsOf,
  keyClaimed,
  MixinControllerOpen,
  numberConverter,
  requestChange,
  whenHydrated,
  words,
} from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property, queryAssignedElements, state } from 'lit/decorators.js'
import { stopBefore } from '../back.js'
import { HelixTourStatusEvent } from '../events/index.js'
import type { HelixHeadlessTourStop } from '../stop/tour-stop.js'
import { onPage, waitFor } from '../wait.js'

/**
 * @summary A guided tour of an interface, one stop at a time.
 *
 * @description
 * The root holds the order of the stops: which stop is current, what Next and
 * Back do, and when the tour is finished. Each stop holds its target, and you
 * write all the text.
 *
 * **The spotlight is a shadow.** The scrim is a box the size of the current
 * target with a very large `box-shadow` spread, and the shadow paints the
 * darkness. A `clip-path` on a full-screen scrim breaks as soon as an element
 * between the scrim and the viewport is transformed.
 *
 * The root measures the target's position in the browser. Nothing is measured
 * on the server, because a tour starts only on request.
 *
 * `open`, `default-open`, `helix-before-open`, `helix-before-close` and
 * `toggle` work as they do on `Dialog`. Setting `open` starts the run, and
 * `skip()` and `requestOpen(false)` end it early.
 *
 * The box the light falls on is on the `spotlight` part as
 * `--tour-spotlight-x`, `--tour-spotlight-y`, `--tour-spotlight-width` and
 * `--tour-spotlight-height`, for a sheet that draws its own light, such as a
 * ring around the target.
 *
 * Each stop is told its place in the run, from `progress-label`, such as "2 of
 * 5". It describes the stop's panel, so a screen reader says it at every stop,
 * and `progress` draws it in the panel as well. A dialog or a floating stop,
 * which has nothing to light, is shown over the `backdrop` part. At a `wait`
 * stop the run waits for that stop's target to be on the page, and moves on by
 * itself.
 *
 * **Focus follows the run.** Opening moves focus to the first stop's panel,
 * and moving on from a control in a stop moves it to the next one. Ending the
 * tour puts focus back on the element that had it when the tour opened, unless
 * you have moved it somewhere else on the page. A stop does not trap focus, so
 * you can still `Tab` out to the element it describes.
 *
 * **The target is scrolled into view** before its stop is shown, by the
 * least distance that brings it on screen, so the stop that points at it is
 * on screen too.
 *
 * **A stop's `effect` runs as the tour reaches it**, before it is shown, and
 * the stop waits for a promise it returns, with `:state(preparing)` on the
 * tour meanwhile. A function it returns runs when the tour leaves the stop.
 *
 * **A press outside the current stop and its target does nothing by
 * default**, so a reader can use the page the tour is describing. Set
 * `outside-press="close"` to end the tour on one, through `helix-before-close`
 * as Skip does, or `outside-press="block"` to refuse it, so the stop and its
 * target are all a pointer can reach while the tour runs, as Zag's
 * `preventInteraction` does.
 *
 * **Keyboard.** Focus is on the current stop's panel, which is not in the
 * `Tab` order itself.
 *
 * | Key | What it does |
 * |---|---|
 * | Right | Goes to the next stop. On the last stop it does nothing, and Next finishes the tour. |
 * | Left | Goes back to the previous stop. |
 * | Escape | Skips the tour, and puts focus back where it was when the tour opened. |
 * | Tab, Shift+Tab | Moves through the controls in the stop, and on out to the page. A stop does not trap focus. |
 * | Enter, Space | On Back, Next, or Skip, presses it. |
 *
 * The arrow that points the way the line runs goes on, and the other goes
 * back, so on a right-to-left page Left goes on and Right goes back. A text field in a stop keeps
 * its own arrows.
 *
 * The tour is a region named by `label` while it runs. A development build
 * warns when a tour opens with no `label`.
 *
 * @since 0.1.0
 * @status stable
 * @category overlays
 * @aliases Coachmark, Product tour, Walkthrough, Onboarding
 * @documentation https://fusion.dev/helix/components/tour
 *
 * @slot - The stops, in the order they are shown.
 *
 * @event {HelixActivateEvent} helix-activate - Fired after the current stop changes, with the new index.
 * @event {HelixBeforeActivateEvent} helix-before-activate - Fired before the current stop changes, with the new index. Cancelable: call `preventDefault()` to stay on the current stop.
 * @event {HelixBeforeCloseEvent} helix-before-close - Fired before the user ends the tour early. Cancelable: call `preventDefault()` to keep the tour open.
 * @event {HelixBeforeOpenEvent} helix-before-open - Fired before `requestOpen(true)` starts the tour. Cancelable: call `preventDefault()` to keep it closed.
 * @event {HelixCompleteEvent} helix-complete - Fired when the last stop is
 * finished.
 * @event {HelixTourAskEvent} helix-tour-ask - Fired when a stop's control is pressed to move the tour. The stop sends it, and the tour handles it.
 * @event {HelixTourStatusEvent} helix-tour-status - Fired when the tour starts waiting at a `wait` stop, is skipped, or is completed, with the stop's index and `detail.status` saying which.
 * @event {ToggleEvent} toggle - Sent when the tour starts or ends, with `newState` and `oldState`.
 *
 * @csspart backdrop - Behind a dialog or a floating stop, which lights nothing. It draws no box until you give it one.
 * @csspart spotlight - The box over the current target. It also draws the dimmed area around the target.
 *
 * @cssproperty --tour-spotlight-height - The lit box's height, in pixels, padding included. Written on the spotlight while it lights a target.
 * @cssproperty --tour-spotlight-width - The lit box's width, in pixels, padding included. Written on the spotlight while it lights a target.
 * @cssproperty --tour-spotlight-x - The lit box's left edge, from the window's left edge, in pixels. Written on the spotlight while it lights a target.
 * @cssproperty --tour-spotlight-y - The lit box's top edge, from the window's top edge, in pixels. Written on the spotlight while it lights a target.
 *
 * @cssstate open - While the tour is running.
 * @cssstate preparing - While the tour waits for the current stop's `effect` before showing the stop.
 * @cssstate waiting - While the tour waits at a `wait` stop for its target to be on the page.
 */
/*
 * **On `MixinControllerOpen`, where it once kept an `open` of its own.** That
 * one reflected, which `CONVENTIONS.md` refuses for state, and the tour wrote it
 * back to false on skip and on finish, so a server-rendered `open` came back
 * from the client as an attribute nobody wrote. The mixin keeps `open` off the
 * host and gives the tour the same `default-open`, before events, `toggle` and
 * `:state(open)` as the other families that open. Finishing is still a report,
 * so it assigns `open` rather than asking: `helix-complete` is sent, and no
 * `helix-before-close`.
 */
@customElement('helix-headless-tour')
export class HelixHeadlessTour extends MixinControllerOpen(HelixElement) {
  /**
   * The key this family's words are registered under, its styled tag:
   * `registerWords('de', { 'helix-tour': { progressLabel: '{index} von {count}' } })`.
   * A stop's own words are under `helix-tour-stop`.
   */
  static words = 'helix-tour'

  /**
   * Label for the control that goes back, passed to every stop.
   */
  @property({ attribute: 'back-label' })
  backLabel = ''

  /**
   * The stop to start on, when nothing else sets one.
   */
  @property({ attribute: 'default-index', converter: numberConverter('default-index', 0) })
  defaultIndex = 0

  /**
   * Label for the control that goes on from the last stop.
   */
  @property({ attribute: 'done-label' })
  doneLabel = ''

  /** The stop being shown, whoever set it, and `undefined` until somebody has. */
  private indexState: number | undefined = undefined

  /**
   * The index of the stop being shown.
   *
   * **Moved through `requestChange`, never by assignment from `move`.** That
   * announces first and applies only if nobody refused, and refusing is how a
   * consumer takes the decision; writing the property and then announcing puts
   * `preventDefault` after the move it is refusing.
   *
   * The shape is `Carousel`'s, which is the nearest thing in the library: a
   * `default-index` for markup that only seeds and a held state that is
   * `undefined` until somebody sets one.
   */
  @property({ converter: numberConverter('index', undefined) })
  get index(): number {
    return this.indexState ?? this.defaultIndex
  }

  set index(next: number) {
    const previous = this.index
    this.indexState = next
    this.requestUpdate('index', previous)
  }

  /**
   * The tour's name, read by screen readers, such as "Getting started".
   */
  @property()
  label = ''

  /**
   * Label for the control that goes on.
   */
  @property({ attribute: 'next-label' })
  nextLabel = ''

  /**
   * What a press outside the current stop and its target does while the tour
   * runs. Unset, nothing: the page stays usable. `close` ends the tour, as
   * Skip does, and `block` refuses the press.
   */
  @property({ attribute: 'outside-press' })
  outsidePress?: 'block' | 'close'

  /**
   * Draws each stop's place in the run in its panel, as well as saying it.
   */
  @property({ type: Boolean })
  progress = false

  /**
   * Each stop's place in the run, with `{index}` and `{count}` filled in and
   * written in the locale. Translate it with the rest of your text.
   */
  @words
  @property({ attribute: 'progress-label' })
  progressLabel = '{index} of {count}'

  /**
   * Label for the control that leaves the tour.
   */
  @property({ attribute: 'skip-label' })
  skipLabel = ''

  /**
   * The space around the target inside the spotlight, in pixels.
   */
  @property({
    attribute: 'spotlight-padding',
    converter: numberConverter('spotlight-padding', 8, 'pixels'),
  })
  spotlightPadding = 8

  @queryAssignedElements({ flatten: true })
  private assigned!: HTMLElement[]

  /**
   * Where the light falls, read from the current target.
   */
  @state()
  private spot: { height: number; left: number; top: number; width: number } | undefined

  /**
   * Watches the lit target's own box, which moves the light without this
   * element updating or the window changing: a label whose font arrives late,
   * words a page rewrites. Measured on a server's page, the spotlight sat two
   * pixels inside each side of a button that widened once its font loaded.
   */
  private sizer: ResizeObserver | undefined = undefined

  /** What `sizer` is watching, so a render that changed nothing re-observes nothing. */
  private sized: Element | undefined = undefined

  /** The stops, in source order. */
  get stops(): HelixHeadlessTourStop[] {
    return (this.assigned ?? []).filter(
      (one): one is HelixHeadlessTourStop => (one as HelixHeadlessTourStop).current !== undefined,
    )
  }

  /** How many stops there are. */
  get length(): number {
    return this.stops.length
  }

  /** Goes to the next stop, and finishes the tour on the last stop. */
  next(): void {
    if (this.index >= this.length - 1) {
      this.finish()
      return
    }
    this.move(this.index + 1)
  }

  /**
   * Goes to the previous stop, passing over a `wait` stop, which shows nothing.
   * It does nothing on the first stop, or where only `wait` stops come before.
   */
  back(): void {
    const to = stopBefore(
      this.stops.map((stop) => stop.type),
      this.index,
    )
    if (to !== undefined) {
      this.move(to)
    }
  }

  /**
   * Ends the tour early, as a close. `helix-complete` is not fired.
   *
   * Announced before it is applied, and cancelable because of it: writing
   * `open` first and dispatching after leaves a consumer calling
   * `preventDefault` refusing something that has already happened.
   */
  skip(): void {
    const at = this.index
    if (this.open && this.requestOpen(false)) {
      this.dispatchEvent(new HelixTourStatusEvent({ index: at, status: 'skipped' }))
    }
  }

  /* Announced before it closes, and not cancelable, which is the difference
     from `skip`. `HelixCompleteEvent` is `cancelable: false` by construction:
     leaving early is a request a consumer may refuse, and having reached the
     end is something that has already happened. What ordering still buys is a
     listener that reads `open` and sees the tour as it was when it finished. */
  private finish(): void {
    this.dispatchEvent(new HelixCompleteEvent({ value: String(this.index) }))
    this.dispatchEvent(new HelixTourStatusEvent({ index: this.index, status: 'completed' }))
    this.open = false
  }

  /* The one path every stateful change in the library goes through: it
     announces, then applies where nothing refused. */
  private move(to: number): void {
    const moved = requestChange({
      apply: (value) => {
        this.index = value
      },
      event: (value) => new HelixBeforeActivateEvent({ value: String(value) }),
      host: this,
      next: to,
    })
    /* The notification after the request, as every other set sends one: a
       consumer following the tour heard only the proposal, and had no event
       for a move nobody refused. */
    if (moved) {
      this.dispatchEvent(new HelixActivateEvent({ value: String(this.index) }))
    }
  }

  private readonly handleAsk = (event: Event): void => {
    const what = (event as CustomEvent<{ what: string }>).detail?.what
    if (what === 'next') {
      this.next()
    } else if (what === 'back') {
      this.back()
    } else if (what === 'skip') {
      this.skip()
    }
  }

  /**
   * The arrow along the line, from inside a stop: on, or back.
   *
   * A move and never a finish, so a reader walking the stops with the arrows
   * cannot end the tour by going one too far; that is Next on the last stop.
   */
  private readonly handleArrows = (event: KeyboardEvent): void => {
    if (!this.open || keyClaimed(event) || event.altKey || event.ctrlKey || event.metaKey) {
      return
    }
    const along = inlineStep(this, event.key)
    if (along === 1 && this.index < this.length - 1) {
      event.preventDefault()
      this.next()
    } else if (along === -1 && this.canGoBack) {
      event.preventDefault()
      this.back()
    }
  }

  /** Whether `back()` would move, there being a stop that shows before this one. */
  private get canGoBack(): boolean {
    return (
      stopBefore(
        this.stops.map((stop) => stop.type),
        this.index,
      ) !== undefined
    )
  }

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    /* Not an Escape something inside a stop already answered: a menu or a
       select closing itself is the press, and the tour ending with it was two
       things shut by one key. */
    if (this.open && event.key === 'Escape' && !event.defaultPrevented) {
      event.preventDefault()
      this.skip()
    }
  }

  /* On the window, because the scrim is fixed and a scroll or a resize moves
     the target out from under it. Passive: neither handler cancels anything. */
  private readonly handleViewport = (): void => {
    this.light()
  }

  override connectedCallback(): void {
    super.connectedCallback()
    /* On the host, not on the slot the stops are assigned to.
       The event is composed and bubbles, so in a browser it reaches either. It
       does not reach the slot under `bun test`: happy-dom does not propagate
       events through slot assignment, so a listener bound there hears nothing
       and every spec about pressing Next passes for the wrong reason or fails
       for a reason that is not the component's. `Megamenu` moved its own
       listener to the host for exactly this. */
    this.addEventListener('helix-tour-ask', this.handleAsk)
    this.addEventListener('keydown', this.handleArrows)
    document.addEventListener('keydown', this.handleKeydown)
    document.addEventListener('pointerdown', this.handleOutside, true)
    document.addEventListener('click', this.handleOutside, true)
    window.addEventListener('resize', this.handleViewport, { passive: true })
    window.addEventListener('scroll', this.handleViewport, { capture: true, passive: true })
    /* Moved rather than new, so the watch torn down on disconnect comes back:
       nothing else updates a tour that was only reordered. Never before the
       first update, whose render on a server's page has to be the server's. */
    if (this.hasUpdated) {
      this.watch(this.lit)
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('helix-tour-ask', this.handleAsk)
    this.removeEventListener('keydown', this.handleArrows)
    document.removeEventListener('keydown', this.handleKeydown)
    document.removeEventListener('pointerdown', this.handleOutside, true)
    document.removeEventListener('click', this.handleOutside, true)
    this.enter(undefined)
    window.removeEventListener('resize', this.handleViewport)
    window.removeEventListener('scroll', this.handleViewport, { capture: true })
    this.sizer?.disconnect()
    this.sized = undefined
    this.unwait?.()
    this.unwait = undefined
    this.waiting = undefined
    this.toggleState('waiting', false)
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    /* A landmark only while there is something in it. A closed tour on every
       page that carries one put an empty "Getting started" in landmark
       navigation. */
    hostAria(internalsOf(this), {
      label: this.open ? this.label : '',
      role: this.open ? 'region' : '',
    })
  }

  /**
   * Answers a press outside the current stop and its target, as
   * `outside-press` asks. A press on the tour's own parts, the stop or the
   * target is the reader using the tour.
   */
  private readonly handleOutside = (event: Event): void => {
    const mode = this.outsidePress
    if (!this.open || !mode) {
      return
    }
    const path = event.composedPath()
    const stop = this.current
    const target = stop?.type === undefined ? stop?.target : undefined
    if (path.includes(this) || (target && path.includes(target))) {
      return
    }
    if (mode === 'block') {
      event.preventDefault()
      event.stopPropagation()
    } else if (event.type === 'pointerdown') {
      this.skip()
    }
  }

  /** The stop whose `effect` has run, and the function to run on leaving it. */
  private entered: { leave?: () => void; stop: HelixHeadlessTourStop } | undefined

  /** The stop held back while its `effect` settles. */
  private preparing: HelixHeadlessTourStop | undefined

  /**
   * Runs the current stop's `effect` as the tour reaches it, and the last
   * one's leaving function as it leaves, and holds the stop back while a
   * promise settles.
   */
  private enter(stop: HelixHeadlessTourStop | undefined): void {
    if (stop === this.entered?.stop) {
      return
    }
    const left = this.entered
    this.entered = stop ? { stop } : undefined
    left?.leave?.()
    this.preparing = undefined
    this.toggleState('preparing', false)
    const effect = stop?.effect
    if (!stop || !effect) {
      return
    }
    const ran = effect({
      index: this.index,
      next: () => this.next(),
      skip: () => this.skip(),
      target: stop.target,
    })
    const keep = (leave: unknown): void => {
      if (typeof leave !== 'function') {
        return
      }
      if (this.entered?.stop === stop) {
        this.entered.leave = leave as () => void
      } else {
        ;(leave as () => void)()
      }
    }
    if (typeof (ran as Promise<unknown> | undefined)?.then !== 'function') {
      keep(ran)
      return
    }
    this.preparing = stop
    this.toggleState('preparing', true)
    /* A refused promise still shows the stop: the stop is what the reader
       asked for, and a page that failed to prepare it has said so itself. */
    void (ran as Promise<unknown>)
      .then(keep, () => undefined)
      .then(() => {
        if (this.preparing !== stop) {
          return
        }
        this.preparing = undefined
        this.toggleState('preparing', false)
        this.requestUpdate()
        void this.updateComplete.then(() => {
          /* Where the reader still is where the move left them: on the page's
           body, in the tour, or on the control that opened it. */
          const active = deepActiveElement()
          const waiting =
            active === null ||
            active === document.body ||
            active === this.returnFocus ||
            deepContains(this, active)
          if (waiting) {
            this.focusCurrent()
          }
        })
      })
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.enter(this.open ? this.current : undefined)
    this.reveal()
    this.settle()
    this.light()
    if (changed.has('open') && this.open) {
      auditName(
        this,
        () => null,
        'tour',
        () => this.label !== '',
      )
    }
    this.follow(changed)
    this.wait()
  }

  /** The target last scrolled into view, so a render that moved nothing scrolls nothing. */
  private revealed: HTMLElement | undefined

  /**
   * Scrolls the current target into view, by the least distance that brings
   * it on screen, before its stop is shown beside it. Zag's tour does the same.
   * A target already on screen does not move.
   */
  private reveal(): void {
    const target = this.lit ?? undefined
    if (target === this.revealed) {
      return
    }
    this.revealed = target
    target?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
  }

  /** Where focus was when the tour opened, to give it back when it ends. */
  private returnFocus: HTMLElement | undefined

  /** Whether `follow` has seen the first update. */
  private followed = false

  /**
   * Moves focus with the run.
   *
   * Opening takes it to the current stop. Moving takes it to the new stop when
   * it was in the tour, which is where a reader pressing Next is, and leaves it
   * where it is otherwise. Closing gives it back to where it was before, again
   * only when it was in the tour: a reader who moved to the target has chosen
   * where to be.
   */
  private follow(changed: PropertyValues): void {
    /* Never on the first update: a tour served open has not been opened by
       anybody, and taking focus as the page loads would move a reader who has
       not asked for anything. */
    if (!this.followed) {
      this.followed = true
      return
    }
    const opened = changed.has('open') && this.open && changed.get('open') === false
    const closed = changed.has('open') && !this.open && changed.get('open') === true
    const active = deepActiveElement()
    const inside =
      active === null ||
      active === document.body ||
      deepContains(this, active) ||
      (this.parked !== undefined && active === this.parked)
    if (opened || closed || changed.has('index')) {
      this.parked = undefined
    }
    if (opened) {
      if (active instanceof HTMLElement && !deepContains(this, active)) {
        this.returnFocus = active
      }
      this.focusCurrent()
    } else if (closed) {
      const back = this.returnFocus
      this.returnFocus = undefined
      if (inside && back?.isConnected) {
        back.focus()
      }
    } else if (this.open && changed.has('index') && inside) {
      this.focusCurrent()
    }
  }

  /**
   * Where focus was put while a `wait` stop waits, so the move on from it still
   * counts as a move from inside the tour while focus has stayed there.
   */
  private parked: HTMLElement | undefined

  /**
   * Focuses the current stop's panel once the stop has shown it.
   *
   * A `wait` stop shows no panel, and focus would fall to the body. It goes to
   * the target of the stop before instead, which is usually the control the
   * reader is asked to use, such as the button that opens the menu the stop
   * waits for. Where that target holds no control, it goes back to where it
   * was when the tour opened.
   */
  private focusCurrent(): void {
    const stops = this.stops
    const at = Math.max(0, Math.min(this.index, stops.length - 1))
    const stop = stops[at]
    if (!stop) {
      return
    }
    if (stop.type === 'wait') {
      const before = stopBefore(
        stops.map((one) => one.type),
        at,
      )
      const target = before === undefined ? undefined : stops[before]?.target
      const park = (target ? controlsIn([target])[0] : undefined) ?? this.returnFocus
      if (park?.isConnected) {
        park.focus()
        this.parked = park
      }
      return
    }
    void stop.updateComplete.then(() => {
      if (this.open && stop.current) {
        stop.focus()
      }
    })
  }

  /**
   * Tells each stop where it is in the run.
   *
   * Written onto the stops, which is the one outward write in this family and
   * is argued for on the class above. The labels go with it, and only where the
   * root was given one, so a stop keeps its own default unless somebody has
   * localized the tour.
   */
  private settle(): void {
    const stops = this.stops
    const at = Math.max(0, Math.min(this.index, stops.length - 1))
    /* Not into a stop still hydrating what a server sent: see `whenHydrated`. */
    stops.forEach((stop, index) => {
      whenHydrated(stop, () => {
        stop.current = this.open && index === at && this.preparing !== stop
        stop.first = index === 0
        stop.last = index === stops.length - 1
        stop.position = formatWords(this, 'progressLabel', {
          count: stops.length,
          index: index + 1,
        })
        stop.progress = this.progress
        if (this.backLabel !== '') {
          stop.backLabel = this.backLabel
        }
        if (this.nextLabel !== '') {
          stop.nextLabel = this.nextLabel
        }
        if (this.doneLabel !== '') {
          stop.doneLabel = this.doneLabel
        }
        if (this.skipLabel !== '') {
          stop.skipLabel = this.skipLabel
        }
      })
    })
  }

  /** The current stop's target while the run is open, which is what the light falls on. */
  private get lit(): HTMLElement | null | undefined {
    const stop = this.current
    /* A bubble only: a dialog and a floating stop point at nothing, and a wait
       stop shows nothing. */
    return this.open && stop?.type === undefined && this.preparing !== stop
      ? stop?.target
      : undefined
  }

  /** The stop being shown, or nothing where there are no stops. */
  private get current(): HelixHeadlessTourStop | undefined {
    const stops = this.stops
    return stops[Math.max(0, Math.min(this.index, stops.length - 1))]
  }

  /** Stops waiting, where a `wait` stop is waiting. */
  private unwait: (() => void) | undefined

  /** The `wait` stop being waited on, so a render that changed nothing starts nothing. */
  private waiting: HelixHeadlessTourStop | undefined

  /**
   * Waits at a `wait` stop for its target to be on the page, then moves on.
   *
   * On the stop's own root, which is where its `for` resolves.
   */
  private wait(): void {
    const stop = this.open ? this.current : undefined
    const next = stop?.type === 'wait' ? stop : undefined
    if (next === this.waiting) {
      return
    }
    this.unwait?.()
    this.unwait = undefined
    this.waiting = next
    this.toggleState('waiting', next !== undefined)
    if (!next) {
      return
    }
    this.dispatchEvent(new HelixTourStatusEvent({ index: this.index, status: 'waiting' }))
    this.unwait = waitFor(
      next.getRootNode(),
      () => onPage(next.target),
      () => {
        this.waiting = undefined
        this.unwait = undefined
        this.toggleState('waiting', false)
        /* A microtask on, so the move is an update of its own, after the one
           that found the target. */
        queueMicrotask(() => {
          if (this.open && this.current === next) {
            this.next()
          }
        })
      },
    )
  }

  /**
   * Whether the current stop is shown over the backdrop: a dialog or a floating
   * stop, or one with no target, which have nothing to light. Read with the
   * light, after the stops are known, since the first render cannot know them.
   */
  @state()
  private veiled = false

  /** Reads the current target's box, which is where the light falls. */
  private light(): void {
    const shown = this.current
    const stop = this.open && this.preparing !== shown ? shown : undefined
    const veiled =
      stop !== undefined && stop.type !== 'wait' && (stop.type !== undefined || !stop.target)
    if (veiled !== this.veiled) {
      this.veiled = veiled
    }
    const target = this.lit
    this.watch(target)
    if (!target || typeof target.getBoundingClientRect !== 'function') {
      this.spot = undefined
      return
    }
    const box = target.getBoundingClientRect()
    const pad = this.spotlightPadding
    const next = {
      height: box.height + pad * 2,
      left: box.left - pad,
      top: box.top - pad,
      width: box.width + pad * 2,
    }
    const same =
      this.spot !== undefined &&
      this.spot.top === next.top &&
      this.spot.left === next.left &&
      this.spot.width === next.width &&
      this.spot.height === next.height
    if (!same) {
      this.spot = next
    }
  }

  /** Keeps `sizer` on the lit target, and on nothing once there is none. */
  private watch(target: Element | null | undefined): void {
    const next = target ?? undefined
    if (next === this.sized || typeof ResizeObserver === 'undefined') {
      return
    }
    this.sizer ??= new ResizeObserver(() => this.light())
    this.sizer.disconnect()
    if (next) {
      this.sizer.observe(next)
    }
    this.sized = next
  }

  /* A stop added or taken away while the tour runs changes every stop's
     place, such as "2 of 5", and which one is last. Nothing else updates the
     tour then: the stops are read from the slot, which is not a property. */
  private readonly handleSlotChange = (): void => {
    this.requestUpdate()
  }

  protected override render(): TemplateResult {
    const spot = this.spot
    /* `left` and `top`, physical because the box is: it is the target's
       `getBoundingClientRect`, measured from the viewport's left edge in either
       direction. As `inset-inline-start` it was the right edge on a
       right-to-left page, so the light fell on the mirror of its target and
       the stop beside it pointed into the dark. */
    return html`${this.veiled ? html`<div part="backdrop" aria-hidden="true"></div>` : ''}${
      spot === undefined
        ? ''
        : html`<div
            part="spotlight"
            aria-hidden="true"
            style=${`left: ${spot.left}px; top: ${spot.top}px; block-size: ${spot.height}px; inline-size: ${spot.width}px; --tour-spotlight-x: ${spot.left}px; --tour-spotlight-y: ${spot.top}px; --tour-spotlight-width: ${spot.width}px; --tour-spotlight-height: ${spot.height}px`}
          ></div>`
    }
      <slot @slotchange=${this.handleSlotChange}></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-tour': HelixHeadlessTour
  }
}
