import type { ReactiveController, ReactiveControllerHost } from 'lit'

/** What the controller needs of its host, which is a Lit element and a count. */
export interface ChartPointerHost extends ReactiveControllerHost, HTMLElement {
  /**
   * How many readings there are, so the pointer has something to land on.
   */
  readonly readings: number
  /**
   * Where the chart drew itself, which is where the plot is looked for.
   */
  readonly renderRoot: DocumentFragment | HTMLElement
}

/**
 * Which reading a pointer is nearest, for a chart that draws no markers.
 *
 * **The anchor is a position and not an element, and that is the whole reason
 * this exists.** A bar and a donut slice are elements a tooltip could be hung
 * on; a line is one `<path>` for a whole series, because
 * `preserveAspectRatio="none"` turns a circle into an ellipse and there is no
 * vector-effect that answers for a shape, so `LineChart` deliberately draws no
 * per-reading marker. Anchoring per datum works for two charts of four and
 * cannot be extended to the third, so the resolution is arithmetic instead.
 *
 * **It maps along one axis only.** The nearest reading to a pointer is decided
 * by x alone in a vertical chart, whatever y is doing, because a reader moving
 * across a chart is asking about a column of it rather than about a point. A
 * true nearest-point search would make a two-series chart answer differently
 * depending on which line the pointer drifted toward, which is a tooltip that
 * changes its mind while the reader holds still.
 *
 * **Coarse pointers get nothing.** A touch has no hover, so a tooltip driven by
 * one appears where a finger already covers it and stays after the finger
 * lifts. The table underneath is the readable version and is what a phone
 * should be given, so this listens for `pointermove` and ignores anything whose
 * `pointerType` is not fine.
 */
export class ChartPointerController implements ReactiveController {
  #host: ChartPointerHost
  #moved = false
  #plot: HTMLElement | undefined

  /** The reading under the pointer, or -1 when the pointer is elsewhere. */
  at = -1

  /**
   * Whether the pointer's x is what decides the reading.
   *
   * True for anything laid out along an axis. **A donut turns it off**, and
   * that is the whole reason this is a flag rather than an assumption: its
   * slices are real elements, so the reading under the pointer is the one the
   * pointer is actually over, and mapping x across a ring would answer with
   * whichever slice happened to share a horizontal position. Off, the chart
   * calls `set` from its own hover and everything downstream is unchanged.
   */
  tracks = true

  constructor(host: ChartPointerHost) {
    this.#host = host
    host.addController(this)
  }

  hostConnected(): void {
    this.#host.addEventListener('pointermove', this.#move)
    this.#host.addEventListener('pointerleave', this.#leave)
  }

  hostDisconnected(): void {
    this.#host.removeEventListener('pointermove', this.#move)
    this.#host.removeEventListener('pointerleave', this.#leave)
    this.at = -1
  }

  /**
   * Tells the tooltip its anchor moved, which nothing else would.
   *
   * The mark the tooltip is hung on is one element the chart walks from reading
   * to reading with an inline style, and Floating UI's `autoUpdate` watches
   * scrolling, resizing and layout shift. Moving an absolutely positioned
   * element by writing `inset` is none of the three, so the bubble is placed
   * once on open and then stays where the first reading was while the mark
   * travels out from under it.
   *
   * Here rather than in the chart because the reading is this controller's, and
   * after the update rather than in `set` because the mark is still at the old
   * position until the render that follows.
   */
  hostUpdated(): void {
    if (!this.#moved) {
      return
    }
    this.#moved = false
    this.#host.renderRoot
      .querySelector<HTMLElement & { reposition?: () => void }>('[part="tooltip-anchor"]')
      ?.reposition?.()
  }

  /**
   * The box the readings are laid out in, which is the plot and not the host.
   *
   * The host also holds the row of labels, so measuring against it would map
   * the pointer over a box taller than the drawing. Width is what this uses and
   * the two agree on width today, which is exactly the kind of coincidence that
   * stops being true the first time a chart grows an axis down its side.
   */
  #box(): DOMRect | undefined {
    this.#plot ??= this.#host.renderRoot.querySelector<HTMLElement>('[part="plot"]') ?? undefined
    return this.#plot?.getBoundingClientRect()
  }

  /** Puts the pointer on a reading, for a chart that resolves it some other way. */
  set(at: number): void {
    if (at !== this.at) {
      this.at = at
      this.#moved = true
      this.#host.requestUpdate()
    }
  }

  readonly #move = (event: PointerEvent): void => {
    if (!this.tracks || (event.pointerType !== 'mouse' && event.pointerType !== 'pen')) {
      return
    }
    const box = this.#box()
    const count = this.#host.readings
    if (!box || box.width === 0 || count === 0) {
      return
    }
    /* The same slot arithmetic the charts draw with: reading `i` sits in the
       middle of the `i`th of `count` equal slots, so the nearest is the slot
       the pointer is in. Rounding a proportion of `count - 1` instead puts the
       boundaries half a slot off and the first and last reading get half the
       catchment of the others. */
    const slot = Math.floor(((event.clientX - box.left) / box.width) * count)
    const next = Math.min(Math.max(slot, 0), count - 1)
    if (next !== this.at) {
      this.at = next
      this.#moved = true
      this.#host.requestUpdate()
    }
  }

  readonly #leave = (): void => {
    if (this.at !== -1) {
      this.at = -1
      this.#host.requestUpdate()
    }
  }
}
