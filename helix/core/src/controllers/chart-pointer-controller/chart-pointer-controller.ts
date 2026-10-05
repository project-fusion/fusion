import type { ReactiveController, ReactiveControllerHost } from 'lit'
import { isRtl } from '../../utils/is-rtl/is-rtl.js'

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
  private host: ChartPointerHost
  private moved = false
  private plot: HTMLElement | undefined

  /** The reading under the pointer, or -1 when the pointer is elsewhere. */
  at = -1

  /**
   * Which axis the readings are laid out along.
   *
   * **An axis and not a boolean, because two of the four charts do not use x.**
   * A horizontal bar chart runs its categories *down* the box, so resolving
   * every reading from the pointer's x leaves a move from the first row to the
   * last never changing the answer: measured on four rows, all four reported
   * the third, which is the slot the middle of the box falls in. It looks like
   * a tooltip that will not follow and is a tooltip reading the wrong axis.
   *
   * `none` is the ring. Its slices are real elements at every angle, so the
   * reading under the pointer is the one the pointer is over, and arithmetic on
   * either axis would answer with whichever slice shared a coordinate: at three
   * o'clock and at nine o'clock, x alone gives the same slice for opposite
   * sides. The slices call `set` and this only holds the answer.
   */
  axis: 'block' | 'inline' | 'none' = 'inline'

  constructor(host: ChartPointerHost) {
    this.host = host
    host.addController(this)
  }

  hostConnected(): void {
    this.host.addEventListener('pointermove', this.move)
    this.host.addEventListener('pointerleave', this.leave)
  }

  hostDisconnected(): void {
    this.host.removeEventListener('pointermove', this.move)
    this.host.removeEventListener('pointerleave', this.leave)
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
    if (!this.moved) {
      return
    }
    this.moved = false
    this.host.renderRoot
      .querySelector<HTMLElement & { reposition?: () => void }>('[part="tooltip-anchor"]')
      ?.reposition?.()
  }

  /**
   * The box the readings are laid out in, which is the plot and not the host.
   *
   * The host also holds the row of labels, so measuring against it would map
   * the pointer over a box taller than the drawing. That mattered the moment a
   * chart started measuring down the box rather than across it, which is what
   * `axis` is for: on a horizontal bar chart the labels are beside the plot
   * rather than under it, and the host is wider than the drawing by exactly
   * their column.
   *
   * **Held only while it is still in the tree.** Every chart renders a
   * different template for its empty state, so the plot a pointer crossed
   * before the table filled is a node Lit has since replaced: held forever, it
   * measures a detached box and the tooltip never appears. Looked up again
   * whenever the held one has left, which is once per data arrival rather than
   * once per move.
   */
  private box(): DOMRect | undefined {
    if (!this.plot?.isConnected) {
      this.plot = this.host.renderRoot.querySelector<HTMLElement>('[part="plot"]') ?? undefined
    }
    return this.plot?.getBoundingClientRect()
  }

  /**
   * Whether the drawing is turned to run right to left, which it is on a
   * right-to-left page.
   *
   * `HelixElement` mirrors a drawing marked `data-mirror` there, so a reading
   * drawn at 10% of the plot's width stands 10% in from its right edge. What is
   * read against the drawing has to be read the same way: the pointer from the
   * plot's right, and a bubble beside a bar's far end on its left. Asked of the
   * host through `isRtl`, which is the one question the table and the splitter
   * ask for their own arrow keys.
   *
   * On the controller because it is what reads the pointer against the drawing,
   * and a chart deciding which side a bubble goes asks here rather than
   * repeating the question. Asked when needed rather than held, since a page
   * can change its direction without the chart updating.
   */
  get mirrored(): boolean {
    return isRtl(this.host)
  }

  /**
   * Whether a pointer event may move the reading, which only a mouse or a pen
   * may.
   *
   * Public for a chart that hears the pointer itself, a donut's slices and a
   * heatmap's cells, so the rule a coarse pointer gets is this one everywhere.
   * Heard unfiltered, a touch opened the bubble under the finger and left it
   * there after the finger lifted.
   */
  accepts(event: Event): boolean {
    const type = (event as PointerEvent).pointerType
    return type === 'mouse' || type === 'pen'
  }

  /** Puts the pointer on a reading, for a chart that resolves it some other way. */
  set(at: number): void {
    if (at !== this.at) {
      this.at = at
      this.moved = true
      this.host.requestUpdate()
    }
  }

  private readonly move = (event: PointerEvent): void => {
    if (this.axis === 'none' || !this.accepts(event)) {
      return
    }
    const box = this.box()
    const count = this.host.readings
    const along = this.axis === 'block' ? box?.height : box?.width
    if (!box || !along || count === 0) {
      return
    }
    /* The same slot arithmetic the charts draw with: reading `i` sits in the
       middle of the `i`th of `count` equal slots, so the nearest is the slot
       the pointer is in. Rounding a proportion of `count - 1` instead puts the
       boundaries half a slot off and the first and last reading get half the
       catchment of the others.

       From the right on a mirrored drawing, where the first slot is. Down the
       box is down in every direction, so the block axis never turns. */
    const from =
      this.axis === 'block'
        ? event.clientY - box.top
        : this.mirrored
          ? box.right - event.clientX
          : event.clientX - box.left
    const slot = Math.floor((from / along) * count)
    const next = Math.min(Math.max(slot, 0), count - 1)
    if (next !== this.at) {
      this.at = next
      this.moved = true
      this.host.requestUpdate()
    }
  }

  private readonly leave = (): void => {
    if (this.at !== -1) {
      this.at = -1
      this.host.requestUpdate()
    }
  }
}
