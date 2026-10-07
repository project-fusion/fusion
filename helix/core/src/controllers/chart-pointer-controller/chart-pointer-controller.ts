import type { ReactiveController, ReactiveControllerHost, ReactiveElement } from 'lit'
import type { ReadingDetail } from '../../events/details.js'
import { isRtl } from '../../utils/is-rtl/is-rtl.js'
import { formatWords } from '../../words/words.js'
import { stepReading } from './reading-step.js'

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
  /**
   * Whether the series drawn from the cell at this place in a row is shown,
   * which it is unless a legend hid it. Absent, every series is shown.
   *
   * The series keys pass over a hidden one, and the readout leaves it out.
   */
  showsColumn?(cell: number): boolean
  /**
   * Whether the reading at this place is shown, for a chart whose readings
   * a legend can hide: a ring's slices are its rows. Absent, every reading is
   * shown.
   *
   * The keys pass over a hidden reading, as they pass over a hidden series.
   */
  showsReading?(at: number): boolean
  /**
   * Where PageUp or PageDown goes from the reading at `at`, by place among the
   * readings, for a chart whose page is no fixed count: a calendar's month.
   * Undefined keeps the fixed page.
   */
  pageFrom?(at: number, forward: boolean): number | undefined
  /**
   * The words for where a reading stands among them, with `{position}` and
   * `{count}` to fill. Absent or empty, no position is said.
   */
  readonly positionLabel?: string
  /**
   * The locale the position's numbers are written in. Absent or empty reads
   * the nearest `lang`, then the runtime's own, as `wordsLocale` does.
   */
  readonly locale?: string
  /** The table's rows, whose headings name a reading in `onReading`. */
  readonly sourceRows?: ReadonlyArray<{ readonly label: string }>
  /** The heading of the column at this place in a row, which names a series in `onReading`. */
  columnName?(cell: number): string
}

/** What `onReading` is told: the reading moved, or it was pressed. */
export type ReadingHeard = 'change' | 'press'

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
 * **A touch has no hover, so it moves nothing by passing over.** A tooltip
 * driven by a finger dragging across would appear under the finger. So this
 * listens for `pointermove` and ignores anything whose `pointerType` is not
 * fine. **A tap is the touch reader's hover**, for a chart that hears its
 * readings through `onReading`: it shows the reading tapped, as Chart.js does,
 * and keeps it until a tap lands elsewhere, outside the chart or on another
 * reading. A drag that scrolls the page is no tap and shows nothing.
 *
 * **The keyboard moves the same reading, which is what makes it the reading
 * and not the pointer's.** A chart's plot takes focus (`tabindex="0"` on the
 * element carrying `CHART_PLOT`), and while it has it the arrow keys walk the
 * readings, Home and End go to the first and the last, PageUp and PageDown
 * move a page of readings, and the other pair of arrows walks the series
 * within a reading. Escape puts the bubble away, as it
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

  /**
   * Hears the reading: `change` each time it moves or is put away, and
   * `press` when it is clicked, tapped, or pressed with Enter or Space.
   *
   * Set by a chart that sends `helix-reading-change` and
   * `helix-reading-press`, which it does from here so the event classes are
   * constructed in the chart that declares them. A chart that hears its
   * readings also shows one on a tap.
   */
  onReading: ((heard: ReadingHeard, detail: ReadingDetail) => void) | undefined

  /** What last moved the reading, which `onReading` is told. */
  private by: ReadingDetail['pointerType'] = 'mouse'

  /** The reading and the series `onReading` was last told of. */
  private said = { at: -1, series: -1 }

  /** Whether a tap shows the reading, which stays until a tap lands elsewhere. */
  private tapped = false

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
    this.host.addEventListener('pointerup', this.tap)
    this.host.addEventListener('click', this.press)
  }

  hostDisconnected(): void {
    this.host.removeEventListener('pointermove', this.move)
    this.host.removeEventListener('pointerleave', this.leave)
    this.host.removeEventListener('keydown', this.key)
    this.host.removeEventListener('focusin', this.arrive)
    this.host.removeEventListener('focusout', this.depart)
    this.host.removeEventListener('pointerup', this.tap)
    this.host.removeEventListener('click', this.press)
    this.untap()
    this.at = -1
    this.series = -1
    this.keyed = false
    this.said = { at: -1, series: -1 }
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

  /**
   * Whether the series drawn from the cell at this place in a row is shown.
   *
   * The readout asks, so a reading said whole leaves out what a legend hid,
   * as the drawing does.
   */
  shows(cell: number): boolean {
    return this.host.showsColumn?.(cell) !== false
  }

  /**
   * How far PageUp and PageDown move: four columns of a grid, which is four
   * weeks of a calendar heatmap, a month near enough; and a tenth of the
   * readings otherwise, at least one.
   */
  private page(count: number): number {
    return this.grid > 1 ? this.grid * 4 : Math.max(1, Math.round(count / 10))
  }

  /**
   * Where the reading stands among the shown readings, in the host's
   * `positionLabel`, such as "2 of 12". Empty with no reading, and where the
   * host gives no words.
   *
   * Counted among the shown readings, so a slice a legend hid is not one of
   * the count.
   */
  get position(): string {
    const words = this.host.positionLabel ?? ''
    const shown = this.shown()
    const place = shown.indexOf(this.at)
    if (words === '' || place < 0) {
      return ''
    }
    /* Through the words registry, so a host that declares `positionLabel` a
       word speaks the page's language, and the numbers go in as numbers, so a
       plural form can be picked and the digits are the locale's. */
    return formatWords(this.host as ChartPointerHost & ReactiveElement, 'positionLabel', {
      count: shown.length,
      position: place + 1,
    })
  }

  /**
   * The cells a series key can rest on: every column a series was drawn
   * from, and is still drawn from.
   */
  private columns(): number[] {
    const host = this.host
    return (host.plottedColumns ?? []).filter(
      (one) => (host.seriesOf === undefined || host.seriesOf(one) !== undefined) && this.shows(one),
    )
  }

  /**
   * The readings the keys walk, by place: every one, less those a legend hid.
   *
   * The keys step through this list, so a hidden
   * slice is passed over as if it were not in the table, which is how the
   * ring draws it.
   */
  private shown(): number[] {
    const host = this.host
    const all = Array.from({ length: host.readings }, (_, at) => at)
    return host.showsReading === undefined
      ? all
      : all.filter((at) => host.showsReading?.(at) !== false)
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
    this.announce()
    if (!this.moved) {
      return
    }
    this.moved = false
    this.host.renderRoot
      .querySelector<HTMLElement & { reposition?: () => void }>('[part="tooltip-anchor"]')
      ?.reposition?.()
  }

  /**
   * Tells `onReading` the reading moved, once for each move.
   *
   * After the update, from `hostUpdated`, so a listener reading the chart
   * finds it already showing the reading it was told of.
   */
  private announce(): void {
    if (!this.onReading || (this.at === this.said.at && this.series === this.said.series)) {
      return
    }
    this.said = { at: this.at, series: this.series }
    this.onReading('change', this.detail())
  }

  /** The reading as `onReading` is told it. */
  private detail(): ReadingDetail {
    const at = this.at
    const column = this.column
    return {
      index: at,
      label: at < 0 ? '' : (this.host.sourceRows?.[at]?.label ?? ''),
      pointerType: this.keyed ? 'keyboard' : this.by,
      series: at < 0 || column === undefined ? '' : (this.host.columnName?.(column) ?? ''),
    }
  }

  /**
   * Shows the reading at `at` for a tap, and keeps it until a tap lands
   * outside the chart. Public for a chart that finds the reading under a
   * finger itself, a scatter's nearest point.
   */
  tapTo(at: number): void {
    if (at < 0) {
      return
    }
    this.by = 'touch'
    if (!this.tapped) {
      this.tapped = true
      this.host.ownerDocument.addEventListener('pointerdown', this.away, true)
    }
    if (at !== this.at || this.keyed) {
      this.at = at
      this.keyed = false
      this.series = -1
      this.moved = true
      this.host.requestUpdate()
    }
  }

  /** Stops waiting for a tap elsewhere. */
  private untap(): void {
    if (this.tapped) {
      this.tapped = false
      this.host.ownerDocument.removeEventListener('pointerdown', this.away, true)
    }
  }

  /** A press outside the chart puts a tapped reading away. */
  private readonly away = (event: Event): void => {
    if (!event.composedPath().includes(this.host)) {
      this.clear()
    }
  }

  private readonly tap = (event: PointerEvent): void => {
    if (event.pointerType !== 'touch' || !this.onReading || this.axis === 'none') {
      return
    }
    const at = this.resolve(event)
    if (at !== undefined) {
      this.tapTo(at)
    }
  }

  /**
   * Tells `onReading` a reading was clicked or tapped, where the press landed
   * on the plot and a reading is shown.
   */
  private readonly press = (event: MouseEvent): void => {
    if (!this.onReading || this.at < 0) {
      return
    }
    const onPlot = event
      .composedPath()
      .some(
        (node) =>
          node instanceof Element &&
          node.id === CHART_PLOT &&
          node.getRootNode() === this.host.renderRoot,
      )
    if (!onPlot) {
      return
    }
    const type = (event as PointerEvent).pointerType
    this.onReading('press', {
      ...this.detail(),
      pointerType: type === 'touch' || type === 'pen' || type === 'mouse' ? type : this.by,
    })
  }

  /**
   * The box the readings are laid out in, which is the plot and not the host.
   *
   * Found by its part, or by the id every chart gives its plot, which is how
   * a sparkline's drawing, whose part is `svg`, is found.
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
      this.plot =
        this.host.renderRoot.querySelector<HTMLElement>(`[part="plot"], #${CHART_PLOT}`) ??
        undefined
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
    this.untap()
    this.by = 'mouse'
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

  /** Puts the reading away, as Escape and leaving the plot both do. */
  private clear(): void {
    this.untap()
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
    const shown = this.shown()
    const count = shown.length
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
    /* A press of the reading the keys rest on, for a chart that hears one. */
    if ((event.key === 'Enter' || event.key === ' ') && this.onReading) {
      if (this.at >= 0) {
        event.preventDefault()
        this.onReading('press', { ...this.detail(), pointerType: 'keyboard' })
      }
      return
    }
    /* A page the host measures itself, such as a month of days, where it
       measures one from here. */
    const paged =
      (event.key === 'PageDown' || event.key === 'PageUp') && this.at >= 0
        ? this.host.pageFrom?.(this.at, event.key === 'PageDown')
        : undefined
    if (paged !== undefined && shown.includes(paged)) {
      event.preventDefault()
      if (paged !== this.at) {
        this.at = paged
        this.keyed = true
        this.moved = true
        this.host.requestUpdate()
      }
      return
    }
    /* Stepped by place among the shown readings, so a hidden one is never
       landed on, and turned back into the reading's own place after. */
    const next = stepReading(
      event.key,
      { at: shown.indexOf(this.at), series: this.series },
      {
        axis: this.axis,
        count,
        grid: this.grid,
        page: this.page(count),
        rtl: isRtl(this.host),
        series: this.columns().length,
      },
    )
    if (next === undefined) {
      return
    }
    const at = shown[next.at] ?? -1
    const { series } = next
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
    const first = this.shown()[0]
    if (!visible || first === undefined) {
      return
    }
    this.at = first
    this.keyed = true
    this.moved = true
    this.host.requestUpdate()
  }

  private readonly depart = (event: FocusEvent): void => {
    if (this.fromPlot(event) && this.keyed) {
      this.clear()
    }
  }

  /**
   * The reading a pointer is over, by the slot it is in along `axis`, or
   * `undefined` with nothing to measure.
   */
  private resolve(event: PointerEvent): number | undefined {
    const box = this.box()
    const count = this.host.readings
    const along = this.axis === 'block' ? box?.height : box?.width
    if (!box || !along || count === 0) {
      return undefined
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
    return Math.min(Math.max(slot, 0), count - 1)
  }

  private readonly move = (event: PointerEvent): void => {
    if (this.axis === 'none' || !this.accepts(event)) {
      return
    }
    const next = this.resolve(event)
    if (next === undefined) {
      return
    }
    this.untap()
    this.by = event.pointerType === 'pen' ? 'pen' : 'mouse'
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
    if (this.at !== -1 && !this.keyed && !this.tapped) {
      this.at = -1
      this.host.requestUpdate()
    }
  }
}
