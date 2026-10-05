import type { ReactiveController, ReactiveControllerHost } from 'lit'
import { inlineStep } from '../../utils/inline-step/inline-step.js'
import { isRtl } from '../../utils/is-rtl/is-rtl.js'

/**
 * The id every chart puts on its plot, and the boundary a bubble is kept inside.
 *
 * **A name six templates and two files have to agree on is a name that will
 * stop agreeing**, which is `PALETTE`'s argument and it holds harder here: the
 * failure is silent. `within` resolves by id, so a plot renamed on one side
 * returns null, the boundary falls back to the viewport, and the bubble goes
 * back to hanging past the drawing with nothing reported anywhere. The plot is
 * also what takes focus, and this controller finds it by the same id.
 *
 * Fixed rather than generated: it is scoped to one chart's shadow root, where
 * it is the only one. Declared here, beside the keys that read it, and
 * re-exported from `drawTooltip`'s module, where it was first declared.
 */
export const CHART_PLOT = 'helix-chart-plot'

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
  /**
   * The positions of the cells in a row that hold numbers, which the series
   * keys move through. Absent, a reading is one series.
   */
  readonly plottedColumns?: number[]
  /**
   * The palette slot for a cell, or `undefined` for a column no series was
   * drawn from, such as a scatter's measure across.
   */
  seriesOf?(cell: number): number | undefined
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
 *
 * **The keyboard moves the same reading, which is what makes it the reading
 * and not the pointer's.** A chart's plot takes focus (`tabindex="0"` on the
 * element carrying `CHART_PLOT`), and while it has it the arrow keys walk the
 * readings, Home and End go to the first and the last, and the other pair of
 * arrows walks the series within a reading. Escape puts the bubble away, as it
 * does a tooltip. The tooltip follows because it already follows `at`, and the
 * chart's readout, a polite live region `drawTooltip` renders, says the
 * reading in words. It speaks only for a key: a pointer crossing a chart is a
 * sighted reader looking, and a region speaking on every slot it crossed would
 * talk over everything else on the page.
 *
 * No peer charting library ships this, which is the reason it is spelled out
 * rather than assumed: the table beside the chart has every number, and this
 * is for a reader who wants the picture's own order, a reading at a time.
 */
export class ChartPointerController implements ReactiveController {
  private host: ChartPointerHost
  private moved = false
  private plot: HTMLElement | undefined

  /** The reading under the pointer, or -1 when the pointer is elsewhere. */
  at = -1

  /**
   * How many readings stand in one column of the drawing, for a chart laid out
   * as a grid.
   *
   * `1` is a row of readings, which is every chart but a heatmap. A heatmap's
   * calendar week stands seven days to a column, so the up and down arrows move
   * a day and the across pair moves a week, which is where the eye goes.
   */
  grid = 1

  /** Whether the reading was last moved by a key, which is when the readout speaks. */
  keyed = false

  /**
   * The series the keyboard is reading within a reading, as its place among
   * the plotted columns, or -1 while the whole reading is read.
   */
  series = -1

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
    this.host.addEventListener('keydown', this.key)
    this.host.addEventListener('focusin', this.arrive)
    this.host.addEventListener('focusout', this.depart)
  }

  hostDisconnected(): void {
    this.host.removeEventListener('pointermove', this.move)
    this.host.removeEventListener('pointerleave', this.leave)
    this.host.removeEventListener('keydown', this.key)
    this.host.removeEventListener('focusin', this.arrive)
    this.host.removeEventListener('focusout', this.depart)
    this.at = -1
    this.series = -1
    this.keyed = false
  }

  /**
   * The cell of the reading the series keys rest on, by its place in the row,
   * or `undefined` while the whole reading is read.
   *
   * The tooltip marks this cell and the readout says it alone. A place in the
   * row and not a series depth, because a row holds columns nothing was drawn
   * from, and the bubble lists every one of them.
   */
  get column(): number | undefined {
    return this.series < 0 ? undefined : this.columns()[this.series]
  }

  /** The cells a series key can rest on: every column a series was drawn from. */
  private columns(): number[] {
    const host = this.host
    const all = host.plottedColumns ?? []
    return host.seriesOf === undefined
      ? all
      : all.filter((one) => host.seriesOf?.(one) !== undefined)
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
      this.keyed = false
      this.moved = true
      this.host.requestUpdate()
    }
  }

  /**
   * Whether an event came from the plot itself, which is the one element in
   * the chart the keys are for.
   *
   * By the id every chart gives its plot, asked of the first node on the
   * event's path: a key pressed in a donut's middle, which a consumer can fill
   * with a link, is that link's and not the chart's.
   */
  private fromPlot(event: Event): boolean {
    const target = event.composedPath()[0]
    return (
      target instanceof Element &&
      target.id === CHART_PLOT &&
      target.getRootNode() === this.host.renderRoot
    )
  }

  /**
   * Which way a key moves along the readings: `1`, `-1`, or `0` for a key that
   * moves something else.
   *
   * Along the inline axis, the arrows that point along the line of text, asked
   * through `inlineStep` so the right arrow moves back on a right-to-left page,
   * where the drawing is turned. Down the box on a chart whose readings run
   * down it. A grid moves a whole column across, and a reading up or down.
   */
  private along(key: string): number {
    if (this.axis === 'block') {
      const down = key === 'ArrowDown' ? 1 : key === 'ArrowUp' ? -1 : 0
      return down !== 0 || this.columns().length > 1 ? down : inlineStep(this.host, key)
    }
    const across = inlineStep(this.host, key)
    if (across !== 0) {
      return across * Math.max(1, this.grid)
    }
    if (this.grid > 1 || this.columns().length < 2) {
      return key === 'ArrowDown' ? 1 : key === 'ArrowUp' ? -1 : 0
    }
    return 0
  }

  /**
   * Which way a key moves among the series of a reading: the pair of arrows
   * that does not walk the readings, and only where a reading holds two or
   * more. Down the bubble's list for the arrow pointing down or along the line.
   */
  private among(key: string): number {
    if (this.grid > 1 || this.columns().length < 2) {
      return 0
    }
    if (this.axis === 'block') {
      return inlineStep(this.host, key)
    }
    return key === 'ArrowDown' ? 1 : key === 'ArrowUp' ? -1 : 0
  }

  /** Puts the reading away, as Escape and leaving the plot both do. */
  private clear(): void {
    const was = this.at
    this.at = -1
    this.series = -1
    this.keyed = false
    if (was !== -1) {
      this.host.requestUpdate()
    }
  }

  private readonly key = (event: KeyboardEvent): void => {
    if (!this.fromPlot(event) || event.altKey || event.ctrlKey || event.metaKey) {
      return
    }
    const count = this.host.readings
    if (count === 0) {
      return
    }
    if (event.key === 'Escape') {
      if (this.at >= 0) {
        event.preventDefault()
        this.clear()
      }
      return
    }
    const last = count - 1
    const along = this.along(event.key)
    const among = this.among(event.key)
    let at = this.at
    let series = this.series
    if (event.key === 'Home') {
      at = 0
    } else if (event.key === 'End') {
      at = last
    } else if (along !== 0) {
      /* From nowhere, the first reading for a key moving on and the last for
         one moving back, so either arrow starts somewhere a reader expects. */
      at = at < 0 ? (along > 0 ? 0 : last) : Math.min(Math.max(at + along, 0), last)
    } else if (among !== 0) {
      at = Math.max(at, 0)
      series = Math.min(Math.max(series + among, -1), this.columns().length - 1)
    } else {
      return
    }
    event.preventDefault()
    if (at === this.at && series === this.series && this.keyed) {
      return
    }
    this.at = at
    this.series = series
    this.keyed = true
    this.moved = true
    this.host.requestUpdate()
  }

  /**
   * Shows the first reading when the plot is reached from the keyboard, so the
   * bubble and the readout say where the reader has arrived.
   *
   * A pointer pressing the plot focuses it too, and is left alone: the
   * pointer is already showing a reading, and `:focus-visible` is how the
   * platform says which of the two arrived.
   */
  private readonly arrive = (event: FocusEvent): void => {
    if (!this.fromPlot(event) || this.at >= 0) {
      return
    }
    const plot = event.composedPath()[0] as Element
    let visible = true
    try {
      visible = plot.matches(':focus-visible')
    } catch {
      /* A selector the engine does not know: take it as the keyboard, which
         is the reader this is for. */
    }
    if (!visible || this.host.readings === 0) {
      return
    }
    this.at = 0
    this.keyed = true
    this.moved = true
    this.host.requestUpdate()
  }

  private readonly depart = (event: FocusEvent): void => {
    if (this.fromPlot(event) && this.keyed) {
      this.clear()
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
      this.keyed = false
      this.series = -1
      this.moved = true
      this.host.requestUpdate()
    }
  }

  /* A reading the keyboard chose stays when the pointer leaves, so a reader who
     nudged the mouse while reading by key does not lose their place. */
  private readonly leave = (): void => {
    if (this.at !== -1 && !this.keyed) {
      this.at = -1
      this.host.requestUpdate()
    }
  }
}
