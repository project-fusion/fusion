import {
  customElement,
  HelixBeforeActivateEvent,
  HelixBeforeCloseEvent,
  HelixCompleteEvent,
  HelixElement,
  hostAria,
  requestChange,
} from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property, queryAssignedElements, state } from 'lit/decorators.js'
import type { HelixHeadlessTourStop } from '../stop/tour-stop.js'

/**
 * @summary A guided run through an interface, one stop at a time.
 *
 * @description
 * The root owns the order and nothing else. Which stop is current, what Next
 * and Back mean, when the run is finished; the stops own where they point, and
 * the consumer owns every word.
 *
 * **The spotlight is a shadow, not a hole.** The scrim is a box the size of the
 * current target with an enormous spread on its `box-shadow`, so the darkness
 * is what the shadow paints. A `clip-path` on a full-screen scrim needs the
 * viewport in the same coordinate space as the cut, which stops being true the
 * moment anything between them is transformed.
 *
 * **It measures, and the target is an element elsewhere on the page whose
 * position nothing can know statically.** Nothing is measured on the server and
 * nothing needs to be: a tour starts when a reader asks for it.
 *
 * @since 0.1.0
 * @status experimental
 * @category overlays
 * @aliases Coachmark, Product tour, Walkthrough, Onboarding
 * @documentation https://helix.fusion.dev/components/tour
 *
 * @slot - The stops, in the order they should be visited.
 *
 * @event {HelixBeforeActivateEvent} helix-before-activate - Fired before the current stop moves, carrying the new index. Cancelable: refusing it takes the decision and nothing moves.
 * @event {HelixBeforeCloseEvent} helix-before-close - Fired before the reader leaves early. Cancelable: refusing it takes the decision and nothing moves.
 * @event {HelixCompleteEvent} helix-complete - Fired when the last stop is
 * finished.
 * @event {HelixTourAskEvent} helix-tour-ask - A stop's own controls asking the tour to move, dispatched by the stop and heard here because the tour is what moves.
 * @event {Event} toggle - Says the state moved, carrying `newState` and `oldState`.
 *
 * @csspart spotlight - The box over the current target, which paints the scrim.
 */
@customElement('helix-headless-tour')
export class HelixHeadlessTour extends HelixElement {
  /**
   * Label for the control that goes back, handed to every stop.
   */
  @property({ attribute: 'back-label' })
  backLabel = ''

  /**
   * Which stop the reader is on.
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
   * Stop to start on, where nothing declared one.
   */
  @property({ attribute: 'default-index', type: Number })
  defaultIndex = 0

  /** The stop being shown, whoever set it, and `undefined` until somebody has. */
  private indexState: number | undefined = undefined

  /**
   * Label for the control that goes on from the last stop.
   */
  @property({ attribute: 'done-label' })
  doneLabel = ''

  /**
   * Accessible name for the run, such as "Getting started".
   */
  @property()
  label = ''

  /**
   * Label for the control that goes on.
   */
  @property({ attribute: 'next-label' })
  nextLabel = ''

  /**
   * Whether the tour is running.
   */
  @property({ reflect: true, type: Boolean })
  open = false

  /**
   * Label for the control that leaves the tour.
   */
  @property({ attribute: 'skip-label' })
  skipLabel = ''

  /**
   * Space left around the target when it is lit, in pixels.
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

  /** The stops, in the order they were written. */
  get stops(): HelixHeadlessTourStop[] {
    return (this.assigned ?? []).filter(
      (one): one is HelixHeadlessTourStop => (one as HelixHeadlessTourStop).current !== undefined,
    )
  }

  /** How many stops there are. */
  get length(): number {
    return this.stops.length
  }

  /** Goes on, and finishes the run on the last stop. */
  next(): void {
    if (this.index >= this.length - 1) {
      this.finish()
      return
    }
    this.move(this.index + 1)
  }

  /** Goes back, and does nothing on the first stop. */
  back(): void {
    if (this.index <= 0) {
      return
    }
    this.move(this.index - 1)
  }

  /**
   * Leaves the run early, which is a close rather than a completion.
   *
   * Announced before it is applied, and cancelable because of it: writing
   * `open` first and dispatching after leaves a consumer calling
   * `preventDefault` refusing something that has already happened.
   */
  skip(): void {
    const event = new HelixBeforeCloseEvent()
    this.dispatchEvent(event)
    if (event.defaultPrevented) {
      return
    }
    this.open = false
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
    requestChange({
      apply: (value) => {
        this.index = value
      },
      event: (value) => new HelixBeforeActivateEvent({ value: String(value) }),
      host: this,
      next: to,
    })
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
    if (this.open && event.key === 'Escape') {
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
    this.ownerDocument.addEventListener('keydown', this.handleKeydown)
    globalThis.addEventListener('resize', this.handleViewport, { passive: true })
    globalThis.addEventListener('scroll', this.handleViewport, { capture: true, passive: true })
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('helix-tour-ask', this.handleAsk)
    this.ownerDocument.removeEventListener('keydown', this.handleKeydown)
    globalThis.removeEventListener('resize', this.handleViewport)
    globalThis.removeEventListener('scroll', this.handleViewport, { capture: true })
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    hostAria(this.internals, { label: this.label, role: 'region' })
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.settle()
    this.light()
  }

  /**
   * Tells each stop where it is in the run.
   *
   * Written onto the stops, which is the one outward write in this family and
   * is argued for on the class above. The labels go with it, and only where the
   * root was given one, so a stop keeps its own default unless somebody has
   * localised the tour.
   */
  private settle(): void {
    const stops = this.stops
    const at = Math.max(0, Math.min(this.index, stops.length - 1))
    stops.forEach((stop, index) => {
      stop.current = this.open && index === at
      stop.first = index === 0
      stop.last = index === stops.length - 1
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
  }

  /** Reads the current target's box, which is where the light falls. */
  private light(): void {
    const stops = this.stops
    const target = this.open
      ? stops[Math.max(0, Math.min(this.index, stops.length - 1))]?.target
      : undefined
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

  protected override render(): TemplateResult {
    const spot = this.spot
    return html`${
      spot === undefined
        ? ''
        : html`<div
            part="spotlight"
            aria-hidden="true"
            style=${`inset-block-start: ${spot.top}px; inset-inline-start: ${spot.left}px; block-size: ${spot.height}px; inline-size: ${spot.width}px`}
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
