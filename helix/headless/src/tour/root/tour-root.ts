import {
  controlsIn,
  customElement,
  deepActiveElement,
  deepContains,
  fillTemplate,
  HelixActivateEvent,
  HelixBeforeActivateEvent,
  HelixCompleteEvent,
  HelixElement,
  hostAria,
  MixinControllerOpen,
  requestChange,
  whenHydrated,
} from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property, queryAssignedElements, state } from 'lit/decorators.js'
import { stopBefore } from '../back.js'
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
   * Label for the control that goes back, passed to every stop.
   */
  @property({ attribute: 'back-label' })
  backLabel = ''

  /**
   * The stop to start on, when nothing else sets one.
   */
  @property({ attribute: 'default-index', type: Number })
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
   * Draws each stop's place in the run in its panel, as well as saying it.
   */
  @property({ type: Boolean })
  progress = false

  /**
   * Each stop's place in the run, with `{index}` and `{count}` filled in.
   * Translate it with the rest of your text.
   */
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
  @property({ attribute: 'spotlight-padding', type: Number })
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
    this.requestOpen(false)
  }

  /* Announced before it closes, and not cancelable, which is the difference
     from `skip`. `HelixCompleteEvent` is `cancelable: false` by construction:
     leaving early is a request a consumer may refuse, and having reached the
     end is something that has already happened. What ordering still buys is a
     listener that reads `open` and sees the tour as it was when it finished. */
  private finish(): void {
    this.dispatchEvent(new HelixCompleteEvent({ value: String(this.index) }))
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
    document.addEventListener('keydown', this.handleKeydown)
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
    document.removeEventListener('keydown', this.handleKeydown)
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
    hostAria(this.internals, {
      label: this.open ? this.label : '',
      role: this.open ? 'region' : '',
    })
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.settle()
    this.light()
    this.follow(changed)
    this.wait()
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
        stop.current = this.open && index === at
        stop.first = index === 0
        stop.last = index === stops.length - 1
        stop.position = fillTemplate(this.progressLabel, {
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
    return this.open && stop?.type === undefined ? stop?.target : undefined
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
    const stop = this.open ? this.current : undefined
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
      <slot></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-tour': HelixHeadlessTour
  }
}
