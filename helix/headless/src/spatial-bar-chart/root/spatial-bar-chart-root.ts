import {
  AriaForwardController,
  type Camera,
  CHART_PLOT,
  customElement,
  drawTooltip,
  formatWords,
  HelixElement,
  HelixPlotChangeEvent,
  HelixPlotTurnEvent,
  HelixReadingChangeEvent,
  HelixReadingPressEvent,
  isRtl,
  MixinChartSource,
  MixinChartStatus,
  motionPaused,
  reducedMotion,
  shortNumber,
  spokenReading,
  words,
} from '@fusion.dev/helix-core'
import {
  html,
  nothing,
  type PropertyValues,
  type SVGTemplateResult,
  svg,
  type TemplateResult,
} from 'lit'
import { property, state } from 'lit/decorators.js'
import '../../tooltip/index.js'
import {
  boundsOf,
  boxView,
  DragTurn,
  drawBox,
  type Frame,
  SPATIAL_VIEW,
  TICK_SIZE,
  turned,
} from '../../spatial-scatter-chart/view.js'
import {
  type BarField,
  type BarLayout,
  barsDrawn,
  barsOf,
  climbing,
  type DrawnBar,
  floorOf,
  grownAt,
  growTime,
  heightened,
  namesOf,
  paintOrder,
  rowFits,
  tallestTimes,
  widthOf,
} from '../bars.js'

/**
 * The width a row's bars are asked to stand at, in pixels, or `undefined`:
 * the fallback's `column-gap`, which a block box lays nothing out with and
 * the browser resolves to pixels from any length. The styled tier sets it
 * from `--spatial-bar-chart-bar-size`.
 */
const barSizeOf = (style: CSSStyleDeclaration): number | undefined => {
  const size = Number.parseFloat(style.columnGap)
  return Number.isFinite(size) && size > 0 ? size : undefined
}

/**
 * How the names and the value take up the height of a sized row, in lines
 * of the box's font: the names under the floor, and the value over the bar.
 */
const WORD_LINES = 3.6

/** The most of a sized plot's height a `diagonal` row climbs across it. */
const CLIMB_SHARE = 0.25

/** The arrow keys that turn the view while Shift is held, and which way each turns it. */
const TURNS: Record<string, { across: number; up: number }> = {
  ArrowDown: { across: 0, up: -1 },
  ArrowLeft: { across: -1, up: 0 },
  ArrowRight: { across: 1, up: 0 },
  ArrowUp: { across: 0, up: 1 },
}

/** How many series colors the theme has, after which they come round again. */
const SERIES = 24

/**
 * A cell's `data-tone`, where it is a name a custom property can carry, or
 * `undefined`. The name is written into a `style` attribute, so anything but
 * letters, digits, and hyphens is refused.
 */
const toned = (tone: string | undefined): string | undefined =>
  tone && /^[a-z][a-z0-9-]*$/.test(tone) ? tone : undefined

/** The frame that holds `frame` and every one of `points`. */
const around = (frame: Frame, points: readonly { x: number; y: number }[]): Frame => {
  const xs = [frame.x, frame.x + frame.width, ...points.map((point) => point.x)]
  const ys = [frame.y, frame.y + frame.height, ...points.map((point) => point.y)]
  const [left, top] = [Math.min(...xs), Math.min(...ys)]
  return { height: Math.max(...ys) - top, width: Math.max(...xs) - left, x: left, y: top }
}

/**
 * @summary A bar chart drawn in three dimensions, each bar a block as tall as its value, for categories in one or more series.
 *
 * @description
 * A 3D bar chart reads its table as `Bar Chart` does: **each row is a
 * category, named by its label, and each numeric column a series**, named by
 * its heading. The bars stand on a grid of categories across and series in
 * depth, each as tall as its value from zero and colored by its series, so
 * one series is a single row of bars and several make a block of them.
 *
 * **A cell's `data-tone` colors its own bar and writes its value above it**,
 * such as `data-tone="primary"` on the one reading a chart is about, as on
 * `Bar Chart`. The value is the cell's own text. Without a tone, a bar takes
 * its series' color.
 *
 * **The flat `Bar Chart` is read more exactly.** Measured, a reader judges
 * a 3D bar's value less closely than a flat one's, and a bar can stand
 * behind another. Use this one where the shape across two sets of names
 * matters more than any one exact value, such as sales by region and by
 * quarter. The tooltip and the table carry the exact values, and a drag
 * turns the view to show a bar another hides.
 *
 * **Helix draws the frame, and the chart draws the bars in 3D itself, in
 * SVG**: a picture a print and a page without WebGL show too, which a drag
 * or Shift with an arrow turns. Put a box inside the chart, and
 * `connectSpatialBarChart` from `@fusion.dev/helix-plot`, given
 * `threeBarDriver` from `@fusion.dev/helix-plot/three`, draws the bars in it
 * with three.js, lit and in perspective.
 *
 * **The table is the reading.** Every number is in it, and screen readers
 * read it. The `summary` part names the number of bars, series, and
 * categories, and the range of values, and describes the plot.
 *
 * **The plot is read by key, across and in depth.** It takes focus, named by
 * `label` or the caption. The left and right arrows move from category to
 * category, the down and up arrows from series to series, and Home and End
 * go to the first and the last bar. The `live` part says the bar's category,
 * series, and value in words. Shift with an arrow turns the view, and
 * Escape lets the bar go.
 *
 * **A reading shows its row in a tooltip**, as on every chart: the bar a
 * mouse or a pen rests on, the bar tapped, or the one the keys move to.
 *
 * **Readings are sent as every chart sends them.** `helix-reading-change`
 * says each move of the reading, and `helix-reading-press` a bar clicked or
 * pressed with Enter or Space, each with the row of the table in `index`.
 *
 * **Keyboard.** The plot is one tab stop once it has readings.
 *
 * | Key | What it does |
 * |---|---|
 * | Tab | Moves focus to the plot. |
 * | Right, Left | Moves to the next or the previous category. |
 * | Down, Up | Moves to the next or the previous series. |
 * | Home, End | Moves to the first or the last bar. |
 * | Shift with an arrow | Turns the view across, or tilts it up and down. |
 * | Enter, Space | Presses the bar, which sends `helix-reading-press`. |
 * | Escape | Lets the bar go. |
 *
 * @since 0.199.0
 * @status experimental
 * @category charts
 * @aliases 3D bar chart, 3D column chart, Isometric bar chart, Isometric column chart, Bar chart in 3D
 * @documentation https://fusion.dev/helix/components/spatial-bar-chart
 *
 * @slot - The renderer's box, which the 3D drawing is made in.
 * @slot empty - Content shown when the table has no readings. Falls back to `empty-text`.
 * @slot loading - Content shown while `loading` is set and there are no readings yet. Falls back to `loading-text`.
 *
 * @event {HelixPlotChangeEvent} helix-plot-change - The bars or the bar the keys rest on changed, which the renderer is told. It stays on the chart.
 * @event {HelixPlotTurnEvent} helix-plot-turn - Shift with an arrow asked the view to turn, by a step across or up.
 * @event {HelixReadingChangeEvent} helix-reading-change - The reading moved, or was put away: `index` is the row, or `-1` for none, with its `label` and the `pointerType` that moved it.
 * @event {HelixReadingPressEvent} helix-reading-press - A bar was clicked or pressed with Enter or Space, with the same detail as `helix-reading-change`.
 *
 * @csspart axis-name - A measure's name, along its edge of the box, in the chart's own drawing.
 * @csspart bar - One bar, its faces in its series' color.
 * @csspart bar-active - The bar the pointer or the keys rest on. Set alongside `bar`.
 * @csspart drawing - The chart's own drawing in SVG: the box, its grid and names, and the bars.
 * @csspart empty - The words when the table has no readings: the `empty` slot, falling back to `empty-text`.
 * @csspart face - One face of a bar the view shows, shaded by which way it faces.
 * @csspart fallback - The box the chart's own drawing fills, shown until a renderer has drawn and where none is connected. Hidden from screen readers.
 * @csspart floor - One place on the floor of a `row`, under a bar or where one would stand, drawn as its outline.
 * @csspart glow - The outline of a bar whose cell names a tone, blurred by 8 CSS pixels and painted under the bar, with no fill until a stylesheet gives it one: a soft glow in the bar's tone.
 * @csspart grid - The box's edges and its grid, in the chart's own drawing.
 * @csspart live - The readout: a polite live region that says the bar the keys moved to. Hide it visually.
 * @csspart loading - The words while `loading` is set and there are no readings.
 * @csspart mark - The invisible point the tooltip is anchored to, where the renderer draws the reading.
 * @csspart plot - The box the drawing fills, which takes focus to be read by key. It is named by the host's `aria-labelledby` or `aria-label`, then by `label`, then by the caption of the table.
 * @csspart ring - The outline around the bar the pointer or the keys rest on, painted after it, so the bars in front of it cover it.
 * @csspart ring-behind - The same outline, faint and dashed, drawn over every bar, so the part of the bar the pointer or the keys rest on that others hide still shows.
 * @csspart sonify - The button that plays the chart as sound, under `sonify`.
 * @csspart summary - The number of bars, series, and categories, and the range of values, written as a sentence for screen readers, which describes the plot. Hide it visually.
 * @csspart table - The readings as a table, for a screen reader, rendered only where they were drawn from `data`, a page of them at a time past a few hundred. Hide it visually.
 * @csspart table-pages - Which readings a page of the `table` holds, and the buttons that show the previous and the next page, rendered only while it holds a page. Hide it visually.
 * @csspart tick - A category's or a series' name, or a value at a tick, along its edge of the box, or a category's name under its place in a `row`, in the chart's own drawing.
 * @csspart tooltip-anchor - The `Tooltip` element itself.
 * @csspart tooltip-arrow - The bubble's point, forwarded from `Tooltip`.
 * @csspart tooltip-arrow-bottom - The point while the bubble is below the reading, on its top edge. Set alongside `tooltip-arrow`.
 * @csspart tooltip-arrow-left - The point while the bubble is left of the reading, on its right edge. Set alongside `tooltip-arrow`.
 * @csspart tooltip-arrow-right - The point while the bubble is right of the reading, on its left edge. Set alongside `tooltip-arrow`.
 * @csspart tooltip-arrow-top - The point while the bubble is above the reading, on its bottom edge. Set alongside `tooltip-arrow`.
 * @csspart tooltip-cell - One column's name and value inside the tooltip.
 * @csspart tooltip-cell-current - The cell a chart's series keys rest on, which every chart's tooltip can mark. This chart marks none, since its readout says the measure. Set alongside `tooltip-cell`.
 * @csspart tooltip-label - The row's own name inside the tooltip.
 * @csspart tooltip-name - A column's name inside the tooltip.
 * @csspart tooltip-surface - The bubble, forwarded from `Tooltip`.
 * @csspart tooltip-surface-bottom - The bubble while it is below the reading. Set alongside `tooltip-surface`.
 * @csspart tooltip-surface-left - The bubble while it is left of the reading. Set alongside `tooltip-surface`.
 * @csspart tooltip-surface-right - The bubble while it is right of the reading. Set alongside `tooltip-surface`.
 * @csspart tooltip-surface-top - The bubble while it is above the reading. Set alongside `tooltip-surface`.
 * @csspart tooltip-value - A column's value inside the tooltip.
 * @csspart value - The value of a bar whose cell names a tone, written above it in the chart's own drawing.
 *
 * @cssproperty --spatial-bar-chart-shade -How far a bar's face turns from the light, from 0 for its top. The component writes it on each face, and the stylesheet that shades the face reads it.
 * @cssproperty --spatial-bar-chart-tone-accent - The color of a bar whose cell says `data-tone="accent"`.
 * @cssproperty --spatial-bar-chart-tone-danger - The color of a bar whose cell says `data-tone="danger"`.
 * @cssproperty --spatial-bar-chart-tone-info - The color of a bar whose cell says `data-tone="info"`.
 * @cssproperty --spatial-bar-chart-tone-muted - The color of a bar whose cell says `data-tone="muted"`.
 * @cssproperty --spatial-bar-chart-tone-primary - The color of a bar whose cell says `data-tone="primary"`. A tone with no property of its own falls back to the bar's series color, and the same holds for a name you define.
 * @cssproperty --spatial-bar-chart-tone-success - The color of a bar whose cell says `data-tone="success"`.
 * @cssproperty --spatial-bar-chart-tone-warning - The color of a bar whose cell says `data-tone="warning"`.
 *
 * @cssstate active - While a bar is shown, under the pointer or the keys.
 * @cssstate drawn - While a renderer has drawn the bars, and the chart's own drawing is hidden.
 * @cssstate empty - While the `empty` part stands in place of the readings.
 * @cssstate loading - While the `loading` part stands in place of the readings.
 */
@customElement('helix-headless-spatial-bar-chart')
export class HelixHeadlessSpatialBarChart extends MixinChartStatus(MixinChartSource(HelixElement)) {
  /**
   * The key this family's words are registered under, its styled tag:
   * `registerWords('de', { 'helix-spatial-bar-chart': { emptyText: 'Keine Werte' } })`.
   */
  static words = 'helix-spatial-bar-chart'

  /**
   * Grows the bars up from the floor the first time the chart comes into
   * view with readings, each category a little after the one before it, so
   * the drawing arrives the way a page's own picture does. The growth is
   * fast at first, slows to rest, and never passes a bar's value.
   *
   * Under `prefers-reduced-motion`, or where the page has paused its motion
   * through `pauseMotion` or `Motion Toggle`, the bars stand at their height
   * from the start. A later table draws its bars at their height at once.
   */
  @property({ reflect: true, type: Boolean })
  grow = false

  /**
   * Draws no box: no edges, grid, numbers, or names, and in a `row` no
   * floor, so the readings stand alone and fill the plot, as a picture on a
   * product's own page does. The
   * table, the summary, the tooltip, and the keys still carry every value,
   * and a renderer draws no box either.
   */
  @property({ attribute: 'no-box', reflect: true, type: Boolean })
  noBox = false

  /**
   * What the readout says for a place with no value. `{category}` and
   * `{series}` name the place.
   */
  @words
  @property({ attribute: 'open-label' })
  openLabel = '{category}, {series}: no value'

  /** The plot's name where the chart has none: no `aria-label`, `label`, or table caption. */
  @words
  @property({ attribute: 'plot-label' })
  plotLabel = '3D bar chart'

  /**
   * Stacks a category's series into one column, each block standing on the
   * ones before it, so the column is as tall as the category's total, as a
   * flat `Bar Chart` stacks them.
   *
   * Absent stands the series one behind another in depth. Stacked, every
   * series stands in the front row, so none hides another, and the parts of
   * one total read together. A negative reading hangs below zero on the
   * negatives before it. The scale fits the stacks.
   */
  @property({ reflect: true, type: Boolean })
  stacked = false

  /**
   * The `summary` part's sentence. `{count}`, `{series}`, and `{categories}`
   * are the number of bars, series, and categories, written in the locale,
   * and `{low}` and `{high}` the lowest and the highest value.
   */
  @words
  @property({ attribute: 'summary-label' })
  summaryLabel =
    '{count, plural, one {# bar} other {# bars}} in {series, plural, one {# series} other {# series}} over {categories, plural, one {# category} other {# categories}}, from {low} to {high}.'

  /**
   * How the bars stand.
   *
   * Unset, they stand on a grid of categories across and series in depth,
   * in a box the camera looks at from a corner, so the grid recedes at an
   * angle. `row` lays the categories in a straight line across the page and
   * turns each bar to the camera, showing its top and two sides, for one row
   * of readings in a small space such as a pane: turning the view turns each
   * bar where it stands, and the row stays level. It is the chart's own
   * drawing that lays the row: a renderer connected through
   * `@fusion.dev/helix-plot` stands the bars on the grid.
   *
   * `diagonal` is the same row climbing to the right as it recedes, each
   * place a step further back than the one before, as a row of days on a
   * product's page is drawn: the row rises one part in five across the page
   * from any turn, and its floor and names climb with it. A row whose bars
   * have a size climbs at most a quarter of the plot's height, so the bars
   * of a long row keep theirs.
   *
   * **A row draws its floor in place of a box**: each place as an outline a
   * little wider than its bar, and each category's name under it, as many
   * names as fit without touching. A name whose bar names a tone is written
   * first, in that tone. `no-box` leaves the floor and the names out.
   *
   * **A `column-gap` on the `fallback` part gives a row's bars one width**,
   * which the styled tier sets from `--spatial-bar-chart-bar-size`: one bar
   * stands as wide as each of twenty, the row is as long as its bars and
   * centered, the tallest bar stands as high as the plot has room for and
   * no taller than the row is long and a quarter again, so one bar stands
   * as a block, and `fits` says how many bars the plot holds, so a page
   * can give it the latest of a longer table. It is read when the plot's
   * size changes.
   */
  @property({ reflect: true })
  variant?: 'diagonal' | 'row'

  /** Whether a renderer has drawn the bars, which hides the chart's own drawing. */
  @state()
  private rendered = false

  /** Where the chart's own drawing is seen from, which a drag or Shift with an arrow turns. */
  @state()
  private camera: Camera = SPATIAL_VIEW

  /** A drag across the chart's own drawing, which turns its view. */
  private readonly drag = new DragTurn(
    (next) => {
      this.camera = next(this.camera)
    },
    () => this.requestUpdate(),
  )

  /** Where the renderer draws the reading, which the tooltip points at. */
  @state()
  private place: { x: number; y: number } | undefined

  /** The field last told, kept so a change of it can be told. */
  private last: BarField | undefined

  /** The bar the keys rested on last, so a change of it can be told. */
  private told = -1

  /**
   * The size of the box the chart's own drawing fills, its font size, and
   * the bar size the stylesheet asks for, in CSS pixels, once measured: the
   * names and values are written at that size whatever the drawing's scale.
   */
  @state()
  private room: { bar?: number; font: number; height: number; width: number } | undefined

  /** Measures the box the chart's own drawing fills. */
  private sizes: ResizeObserver | undefined

  /**
   * How far the bars have grown in: waiting to be seen, growing since a
   * moment, or `undefined` once they stand at their height. `grew` says the
   * first table has been drawn, so a later one is not grown again.
   */
  @state()
  private growth: { since?: number } | undefined

  private grew = false

  /** Watches for the chart to come into view, which starts the bars growing. */
  private seen: IntersectionObserver | undefined

  /** Carries a host `aria-labelledby` and `aria-describedby` to the plot. */
  protected readonly aria = new AriaForwardController(this, {
    target: () => this.partNamed('plot'),
  })

  /**
   * The table read as bars. **Each row is a category, and each numeric
   * column a series.** A renderer reads it.
   */
  get field(): BarField {
    const rows = this.sourceRows
    const columns = this.plottedColumns
    const series = this.series
    if (
      this.memo?.rows !== rows ||
      this.memo.columns !== columns ||
      this.memo.series !== series ||
      this.memo.stacked !== this.stacked
    ) {
      /* A cell's tone is read with its series, whose columns are the
         plotted ones in the same order. */
      const tones = series.map(
        (one) => new Map(one.points.map((point) => [point.at, toned(point.tone)])),
      )
      const field = barsOf(rows, columns, this.stacked, (row, depth) => tones[depth]?.get(row))
      this.memo = { columns, field, rows, series, stacked: this.stacked }
    }
    return this.memo.field
  }

  /** The field last read, and the rows, columns, and series it was read from. */
  private memo:
    | { columns: unknown; field: BarField; rows: unknown; series: unknown; stacked: boolean }
    | undefined

  /** The bar the keys or the pointer rest on, as its place in `field.cells`, or `-1`. */
  get active(): number {
    return this.pointer.at
  }

  /** The number of places on the grid, which the keys walk. */
  override get readings(): number {
    return this.field.cells.length
  }

  /**
   * Says whether a renderer has drawn the bars, which hides the chart's own
   * drawing or shows it again. Called by the connector.
   */
  rendererDrawn(on = true): void {
    this.rendered = on
    this.toggleState('drawn', on)
  }

  /**
   * Puts the reading on the bar at `index`, or lets it go with `-1`, as a
   * pointer resting on it in the renderer's drawing or a press there does.
   * A touch keeps it until a tap lands elsewhere, and a mouse leaving a
   * reading the keys moved to leaves it. Called by the connector.
   */
  requestActive(index: number, kind: 'mouse' | 'pen' | 'touch' = 'mouse'): void {
    if (kind === 'touch') {
      this.pointer.tapTo(index)
    } else if (index >= 0 || !this.pointer.keyed) {
      this.pointer.set(index)
    }
  }

  /**
   * Says where the renderer draws the reading, as fractions of the plot from
   * its top left, or `undefined` while it draws none. The tooltip points
   * there. Called by the connector.
   */
  placeReading(at: { x: number; y: number } | undefined): void {
    this.place = at
  }

  /**
   * Tells the keys how many series stand in depth for each category, so the
   * up and down arrows move from series to series and the left and right
   * arrows from category to category. Here rather than in `updated`, since
   * the server calls this one.
   */
  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed)
    const field = this.field
    this.pointer.grid = Math.max(1, field.series.length)
    /* The first table with readings is the one grown in. Decided before it
       is drawn, so its bars never show at their height first. */
    if (this.grow && !this.grew && field.readings > 0) {
      this.grew = true
      const moves =
        typeof IntersectionObserver === 'function' &&
        typeof requestAnimationFrame === 'function' &&
        !reducedMotion() &&
        !motionPaused()
      this.growth = moves ? {} : undefined
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.sizes?.disconnect()
    this.sizes = undefined
    this.measured = undefined
    this.seen?.disconnect()
    this.seen = undefined
  }

  /** The element the size observer watches, so a drawing drawn again is watched again. */
  private measured: Element | undefined

  /** Watches the box the chart's own drawing fills, and keeps its size and font size. */
  private measure(): void {
    const box = this.partNamed('fallback')
    if (!box || box === this.measured || typeof ResizeObserver !== 'function') {
      return
    }
    this.measured = box
    this.sizes?.disconnect()
    this.sizes = new ResizeObserver(([entry]) => {
      const { height, width } = entry?.contentRect ?? { height: 0, width: 0 }
      const style = getComputedStyle(box)
      const font = Number.parseFloat(style.fontSize) || 16
      const bar = barSizeOf(style)
      const was = this.room
      if (was?.width !== width || was.height !== height || was.font !== font || was.bar !== bar) {
        this.room =
          height > 0 && width > 0
            ? { font, height, width, ...(bar && bar > 0 ? { bar } : {}) }
            : undefined
      }
    })
    this.sizes.observe(box)
  }

  /**
   * How many categories a `row` or a `diagonal` has room for across the
   * plot at its bar size, measured as it is read, or
   * `undefined` where there is no row, no bar size, or nothing drawn to
   * measure. A page with a longer table gives the chart its latest that
   * many rows, and says so.
   */
  get fits(): number | undefined {
    const box = this.partNamed('fallback')
    if (!box || !this.variant || typeof getComputedStyle !== 'function') {
      return undefined
    }
    const style = getComputedStyle(box)
    const bar = barSizeOf(style)
    const width = box.clientWidth
    return bar && width > 0 ? rowFits(width, bar) : undefined
  }

  /**
   * A row with a bar size of its own: how many of the drawing's units make a
   * pixel, so each bar is as wide as asked, and the field with its value axis
   * as tall as fills the plot's height with the names and the value. Where
   * the row is too long for the plot, its bars narrow until it fits.
   */
  private sized(
    read: BarField,
    projection: Parameters<typeof barsDrawn>[1],
    layout: Exclude<BarLayout, 'grid'>,
    room: { bar?: number; font: number; height: number; width: number },
  ): { field: BarField; unit: number } | undefined {
    const first = barsDrawn(read, projection, layout)[0]
    if (!first || !room.bar) {
      return undefined
    }
    const frameOf = (field: BarField, grown?: () => number): Frame => {
      const floor = this.noBox ? [] : floorOf(field, projection, layout)
      const drawn = barsDrawn(field, projection, layout, grown)
      return boundsOf(
        [...drawn.flatMap((bar) => bar.corners), ...floor.flatMap((one) => one.corners)],
        0,
      )
    }
    const unit = Math.max(
      widthOf(first) / room.bar,
      frameOf(read, () => 0).width / Math.max(1, room.width - room.font * 2),
    )
    /* A diagonal climbs at most a quarter of the plot, so the bars of a long
       row keep their height. */
    const field = climbing(read, room.height * CLIMB_SHARE * unit, frameOf(read, () => 0).width)
    const low = frameOf(field, () => 0)
    const high = frameOf(field)
    const tall = (room.height - room.font * WORD_LINES) * unit
    const rises = high.height - low.height
    const fills = rises > 0 ? Math.max(0.05, (tall - low.height) / rises) : 1
    /* A row of one or two stands no taller than it is long and a quarter
       again, so a lone bar stands as a block. */
    const times = Math.min(
      fills,
      tallestTimes(field, projection, barsDrawn(field, projection, layout)),
    )
    return { field: heightened(field, times), unit }
  }

  /** Starts the bars growing once the chart comes into view, and draws each frame until they stand. */
  private watchGrowth(): void {
    if (!this.growth || this.growth.since !== undefined || this.seen) {
      return
    }
    this.seen = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || !this.growth) {
          return
        }
        this.seen?.disconnect()
        this.seen = undefined
        const since = performance.now()
        this.growth = { since }
        const length = growTime(this.field.categories.length)
        const frame = (): void => {
          if (this.growth?.since !== since) {
            return
          }
          if (performance.now() - since >= length) {
            this.growth = undefined
            return
          }
          this.requestUpdate()
          requestAnimationFrame(frame)
        }
        requestAnimationFrame(frame)
      },
      { threshold: 0.4 },
    )
    this.seen.observe(this)
  }

  override connectedCallback(): void {
    super.connectedCallback()
    /* Moved on the page, it is drawn already and not drawn again, so it
       watches its box and its first sight again here. */
    if (this.hasUpdated) {
      this.measure()
      this.watchGrowth()
    }
    /* The bar under a pointer is found by what the pointer is over, so the
       controller's search along one axis stays out. */
    this.pointer.axis = 'none'
    this.pointer.onReading = (heard, detail) => {
      const cell = this.field.cells[detail.index]
      const told = {
        ...detail,
        index: cell?.value === undefined ? -1 : cell.row,
        label: cell?.label ?? '',
      }
      this.dispatchEvent(
        heard === 'press' ? new HelixReadingPressEvent(told) : new HelixReadingChangeEvent(told),
      )
    }
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.measure()
    this.watchGrowth()
    /* Told only on a change, so a renderer draws again only when it must:
       the field is read once for each table, so a new one is a change. */
    const field = this.field
    if (field !== this.last) {
      this.last = field
      this.dispatchEvent(new HelixPlotChangeEvent({ kind: 'data' }))
    }
    if (this.pointer.at !== this.told) {
      this.told = this.pointer.at
      this.dispatchEvent(new HelixPlotChangeEvent({ kind: 'focus' }))
    }
    /* The tooltip follows the reading while the view turns, which moves its
       mark without anything the tooltip watches changing size. */
    if (changed.has('place' as keyof this)) {
      ;(
        this.renderRoot.querySelector('[for="helix-chart-mark"]') as
          | (Element & { reposition?: () => void })
          | null
      )?.reposition?.()
    }
  }

  /**
   * Shift with an arrow turns the view, the chart's own drawing and the
   * renderer's alike, and moves no reading.
   */
  private readonly onPlotKeydown = (event: KeyboardEvent): void => {
    const turn = TURNS[event.key]
    if (!event.shiftKey || !turn || event.altKey || event.ctrlKey || event.metaKey) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    this.camera = turned(this.camera, turn.across, turn.up)
    this.dispatchEvent(new HelixPlotTurnEvent(turn))
  }

  /** The bar a pointer event is over, or `-1`: the one in front, since the bars are painted back to front. */
  private barAt(event: PointerEvent): number {
    const bar = (event.composedPath()[0] as Element | undefined)?.closest?.('[data-index]')
    const index = Number(bar?.getAttribute('data-index') ?? -1)
    return Number.isInteger(index) ? index : -1
  }

  /** A mouse or a pen over the chart's own drawing puts the reading on the bar it rests on. */
  private readonly onDrawingMove = (event: PointerEvent): void => {
    if (this.drag.move(event)) {
      return
    }
    if (event.pointerType === 'touch') {
      return
    }
    this.requestActive(this.barAt(event), event.pointerType === 'pen' ? 'pen' : 'mouse')
  }

  private readonly onDrawingDown = (event: PointerEvent): void => {
    this.drag.down(event)
  }

  /** A press the browser took back, such as for a scroll, which ends a drag as a release does. */
  private readonly onDrawingCancel = (event: PointerEvent): void => {
    this.drag.up(event)
  }

  private readonly onDrawingLeave = (event: PointerEvent): void => {
    if (event.pointerType !== 'touch') {
      this.requestActive(-1, 'mouse')
    }
  }

  /**
   * A tap is a touch reader's hover, unless it was a drag, which turned the
   * view: it shows the bar under it until a tap lands elsewhere.
   */
  private readonly onDrawingTap = (event: PointerEvent): void => {
    if (this.drag.up(event)) {
      return
    }
    if (event.pointerType === 'touch') {
      this.requestActive(this.barAt(event), 'touch')
    }
  }

  protected override render(): TemplateResult {
    const field = this.field
    const readable = field.readings > 0
    const at = this.pointer.at
    const cell = field.cells[at]
    return html`<div
        aria-describedby=${readable ? 'helix-chart-summary' : nothing}
        aria-label=${this.named || this.plotLabel}
        id=${CHART_PLOT}
        part="plot"
        role=${readable ? 'application' : 'img'}
        tabindex=${readable ? '0' : nothing}
        @keydown=${this.onPlotKeydown}
      >
        <slot></slot>
        ${readable ? this.renderFallback(field, at) : nothing}
        ${readable ? this.renderLive(field, at) : nothing}
        ${this.renderTooltip(cell?.value === undefined ? undefined : cell.row)}
      </div>
      ${readable ? this.renderSummary(field) : this.renderStatus()}${this.renderSonify()}${this.renderTable()}`
  }

  /**
   * The bars in 3D, in SVG: the box with its grid and names, and each bar a
   * block standing from zero to its value, painted back to front, in its
   * series' color and shaded by which way each face turns. The chart's own
   * drawing, until a renderer has drawn and where none is connected.
   */
  private renderFallback(read: BarField, at: number): TemplateResult {
    const layout: BarLayout = this.variant ?? 'grid'
    const lined = layout === 'grid' ? undefined : layout
    const bare = this.noBox || lined !== undefined
    const view = boxView(read.axes, this.camera, [], bare)
    /* A row whose bars have a size is drawn at the scale that makes them
       that wide, its value axis as tall as the plot has room for. */
    const room = this.room
    const sized = lined && room?.bar ? this.sized(read, view.projection, lined, room) : undefined
    const field = sized?.field ?? read
    /* The frame and the words are measured on the bars at their height, so
       the drawing holds still while they grow. */
    const full = barsDrawn(field, view.projection, layout)
    const growth = this.growth
    const since = growth?.since
    const elapsed = since === undefined ? 0 : performance.now() - since
    const categories = field.categories.length
    const bars = growth
      ? barsDrawn(field, view.projection, layout, (one) => grownAt(one.across, categories, elapsed))
      : full
    const floor = lined && !this.noBox ? floorOf(field, view.projection, lined) : []
    const active = bars.find((bar) => bar.index === at)
    const cell = field.cells[at]
    const base = bare
      ? boundsOf(
          [...full.flatMap((bar) => bar.corners), ...floor.flatMap((one) => one.corners)],
          0.1,
        )
      : view.bounds
    /* Words are written at the box's own font size, in CSS pixels, whatever
       the drawing's scale: measured on a frame, which the words then widen
       a little, and measured again on that. */
    const pixelOf = (frame: Frame): number | undefined =>
      sized
        ? sized.unit
        : room
          ? 1 / Math.min(room.width / frame.width, room.height / frame.height)
          : undefined
    const sizeOf = (frame: Frame): number => {
      const pixel = pixelOf(frame)
      return room && pixel !== undefined ? room.font * pixel : TICK_SIZE
    }
    const wordsAt = (size: number) => {
      const names = floor.length > 0 ? namesOf(field, floor, size) : []
      const values = full.flatMap((bar) => {
        const one = field.cells[bar.index]
        const text = one?.tone ? this.sourceRows[one.row]?.cells[one.column]?.text : undefined
        return one && text
          ? [
              {
                index: bar.index,
                text,
                tone: one.tone,
                x: bar.drawn.peak.x,
                y: bar.drawn.crown - size,
              },
            ]
          : []
      })
      const extents = [...names, ...values].flatMap((word) => {
        const half = (word.text.length * size * 0.62) / 2
        return [
          { x: word.x - half, y: word.y - size * 0.7 },
          { x: word.x + half, y: word.y + size * 0.7 },
        ]
      })
      return { frame: around(base, extents), names, values }
    }
    const first = wordsAt(sizeOf(base))
    const size = sizeOf(first.frame)
    const { frame: fits, names, values } = wordsAt(size)
    /* A sized row is centered in a frame the plot's own size at its scale,
       unless its words reach past it, when it shrinks to fit as any does. */
    const wide = sized && room ? room.width * sized.unit : 0
    const high = sized && room ? room.height * sized.unit : 0
    const placed: Frame =
      sized && fits.width <= wide + 1e-9 && fits.height <= high + 1e-9
        ? {
            height: high,
            width: wide,
            x: fits.x + (fits.width - wide) / 2,
            y: fits.y + (fits.height - high) / 2,
          }
        : fits
    const bounds = this.drag.frame(placed, view.on([0, 0, 0]))
    const pixel = pixelOf(bounds)
    const font = Math.round(size * 10_000) / 10_000
    return html`<div aria-hidden="true" dir="ltr" ?hidden=${this.rendered} part="fallback">
      <svg
        part="drawing"
        preserveAspectRatio="xMidYMid meet"
        viewBox="${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}"
        xmlns="http://www.w3.org/2000/svg"
        @click=${this.drag.click}
        @pointercancel=${this.onDrawingCancel}
        @pointerdown=${this.onDrawingDown}
        @pointerleave=${this.onDrawingLeave}
        @pointermove=${this.onDrawingMove}
        @pointerup=${this.onDrawingTap}
      >${
        /* A filter on a shape is measured in the drawing's own units, and
           WebKit draws none of CSS's on a shape, so the glow is a blur of
           its own, of 8 CSS pixels at any scale. */
        bars.some((bar) => field.cells[bar.index]?.tone)
          ? svg`<defs><filter height="160%" id="helix-spatial-bar-chart-glow" width="500%" x="-200%" y="-30%"><feGaussianBlur stdDeviation=${(pixel ?? 0.006) * 8}></feGaussianBlur></filter></defs>`
          : nothing
      }${bare ? nothing : drawBox(view)}${floor.map(
        (plate) => svg`<path d=${plate.d} part="floor"></path>`,
      )}${names.map(
        (name) =>
          svg`<text data-tone=${name.tone ?? nothing} dominant-baseline="central" font-size=${font} part="tick" style="${name.tone ? `--chart-series: var(--spatial-bar-chart-tone-${name.tone})` : ''}" text-anchor="middle" x=${shortNumber(name.x)} y=${shortNumber(name.y)}>${name.text}</text>`,
      )}${paintOrder(view.projection, bars).map(
        (bar) =>
          /* The ring straight after its bar, so the bars in front cover it as
             they cover the bar: drawn over them all, it traced their faces
             and read as theirs. */
          svg`${field.cells[bar.index]?.tone ? svg`<path d=${bar.drawn.outline} fill="none" filter="url(#helix-spatial-bar-chart-glow)" part="glow" style="--chart-series: var(--spatial-bar-chart-tone-${field.cells[bar.index]?.tone})"></path>` : nothing}${this.renderBar(field, bar, at)}${bar === active ? svg`<path d=${active.drawn.outline} part="ring"></path>` : nothing}`,
      )}${values.map((value) => {
        /* Over the bar as it stands, so the value rises as the bar grows. */
        const crown = bars.find((bar) => bar.index === value.index)?.drawn.crown ?? value.y + size
        return svg`<text data-tone=${value.tone ?? nothing} dominant-baseline="central" font-size=${font} part="value" text-anchor="middle" x=${shortNumber(value.x)} y=${shortNumber(crown - size)}>${value.text}</text>`
      })}${
        /* Over everything, faint and dashed, so a bar the keys reach behind
           others is still found: where it shows, the ring above covers it.
           The tooltip is centered on the bar's top and points down at it
           from the top of its outline, so the bubble leaves the top face in
           view. */
        active
          ? svg`<path d=${active.drawn.outline} part="ring-behind"></path><foreignObject height="0.001" overflow="visible" width="0.001" x=${active.drawn.peak.x} y=${active.drawn.crown}>${this.renderOwnTooltip(cell?.row)}</foreignObject>`
          : nothing
      }</svg>
    </div>`
  }

  /** One bar, its faces in its tone's color or its series', each shaded by which way it faces. */
  private renderBar(field: BarField, bar: DrawnBar, at: number): SVGTemplateResult {
    const one = field.cells[bar.index]
    const series = ((one?.depth ?? 0) % SERIES) + 1
    const short = (value: number): number => Math.round(value * 1000) / 1000
    /* A tone falls back to the series' color, as on `Bar Chart`. */
    return svg`<g data-index=${bar.index} data-tone=${one?.tone ?? nothing} part="bar${bar.index === at ? ' bar-active' : ''}" style="--chart-series: ${one?.tone ? `var(--spatial-bar-chart-tone-${one.tone}, var(--chart-series-${series}))` : `var(--chart-series-${series})`}">${bar.drawn.faces.map((face) => svg`<path d=${face.d} part="face" style="--spatial-bar-chart-shade: ${short(face.darken)}"></path>`)}</g>`
  }

  /** The readout: the bar's category, series, and value in words, once the keys have moved to one. */
  private renderLive(field: BarField, at: number): TemplateResult {
    const cell = field.cells[at]
    const row = cell === undefined ? undefined : this.sourceRows[cell.row]
    let said = ''
    if (this.pointer.keyed && cell) {
      said =
        row && cell.value !== undefined
          ? spokenReading(row, cell.column, (one) => this.pointer.shows(one), this.pointer.position)
          : formatWords(this, 'openLabel', {
              category: cell.label,
              series: field.series[cell.depth] ?? '',
            })
    }
    return html`<span aria-live="polite" part="live" role="status">${said}</span>`
  }

  /**
   * The reading's row in the tooltip, pointed at its bar in the chart's own
   * drawing, which holds it there.
   */
  private renderOwnTooltip(row: number | undefined): TemplateResult | typeof nothing {
    if (this.rendered || row === undefined || !this.sourceRows[row]) {
      return nothing
    }
    return drawTooltip(
      this.sourceRows,
      row,
      this.tag('tooltip'),
      { dir: isRtl(this) ? 'rtl' : 'ltr', fixed: true, placement: 'top', x: '0%', y: '0%' },
      () => undefined,
    )
  }

  /**
   * The reading's row in the tooltip every chart shows, pointed at where the
   * renderer draws it. Only once a renderer has drawn; until then the
   * chart's own drawing holds the tooltip at the bar.
   */
  private renderTooltip(row: number | undefined): TemplateResult | typeof nothing {
    const place = this.place
    if (!this.rendered || !place || row === undefined || !this.sourceRows[row]) {
      return nothing
    }
    /* A row's names and values are words, and read the way the page does,
       while the drawing is the same on every page. */
    return drawTooltip(
      this.sourceRows,
      row,
      this.tag('tooltip'),
      {
        dir: isRtl(this) ? 'rtl' : 'ltr',
        fixed: true,
        placement: 'top',
        x: `${place.x * 100}%`,
        y: `${place.y * 100}%`,
      },
      () => undefined,
    )
  }

  /** What the plot shows, in a sentence, which describes the plot. */
  private renderSummary(field: BarField): TemplateResult {
    const values = field.cells.flatMap((cell) => (cell.value === undefined ? [] : [cell.value]))
    const said = formatWords(this, 'summaryLabel', {
      categories: field.categories.length,
      count: field.readings,
      high: Math.max(...values),
      low: Math.min(...values),
      series: field.series.length,
    })
    return html`<p id="helix-chart-summary" part="summary">${said}</p>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-spatial-bar-chart': HelixHeadlessSpatialBarChart
  }
}
