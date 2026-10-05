import { nothing, type TemplateResult } from 'lit'
import { styleMap } from 'lit/directives/style-map.js'
import { html, type StaticValue } from 'lit/static-html.js'
import {
  CHART_PLOT,
  type ChartPointerController,
} from '../../controllers/chart-pointer-controller/chart-pointer-controller.js'
import { seriesIndex } from '../../mixins/mixin-chart-source/mixin-chart-source.js'
import type { Row } from '../read-series/read-series.js'
import { spokenReading } from './spoken-reading.js'

/*
 * What a pointer resting on a reading shows, as markup every chart can use.
 *
 * **A function rather than a method on `MixinChartSource`, and that is forced.**
 * A mixin's members reach a subclass only through its declared interface, and an
 * interface cannot carry a protected one: TypeScript refuses to widen a class to
 * an interface across a protected member. Declaring it public would make a
 * render seam part of the published API and break the convention that a
 * composed thing sits behind `protected render…()`. So the markup is shared
 * here, the way `drawIcon` shares a glyph, and each chart keeps a one-line
 * seam of its own.
 *
 * **The tooltip's tag is an argument, because this file is on the wrong tier to
 * know it.** A literal `<helix-tooltip>` is registered by `helix/styled` and not
 * by `@fusion.dev/helix-headless`, so a consumer of the headless tier alone gets
 * an inert unknown element where the reading should be. Nothing here catches it:
 * the rule about interpolating a tag through `tier` holds a *component*, and
 * this is a free function with no class to read one from, while the sandbox
 * frame and the docs site both import the whole library, so every environment a
 * test runs in has the styled tag registered.
 *
 * So the caller passes `this.tag('tooltip')` and each tier answers with its own
 * name, which is how every composed tag in the library already resolves. That
 * makes this `static-html` rather than `lit`, a tag being a `StaticValue`.
 */
/* The plot's id is declared beside the keys that find the plot by it, and
   re-exported here, where every chart has always imported it from. */
export { CHART_PLOT }

/**
 * The id of the bubble, which the mark names as its description.
 *
 * Fixed for the reason `CHART_PLOT` is: it is scoped to one chart's shadow
 * root, where it is the only one.
 */
const CHART_TOOLTIP = 'helix-chart-tooltip'

/** Where a tooltip points, in the plot's own percentages, and which side it prefers. */
export interface TooltipAt {
  /**
   * Which way the bubble's words run, for a chart whose plot holds a direction
   * the page does not have.
   *
   * Absent, the bubble takes the plot's, which is the page's for every chart
   * but a scatter: its plane is left to right on every page, and the bubble is
   * a row's names and values, which read the way the page does.
   */
  dir?: 'ltr' | 'rtl'
  /**
   * Whether `x` is measured from the plot's left in either direction, for a
   * drawing that does not turn with the text.
   *
   * Absent measures from the plot's inline start, which is where a drawing
   * marked `data-mirror` starts: its left, or its right on a right-to-left page.
   * A whole ring is the case for this, its bearing being a clock's, and a
   * scatter's plane, whose across is a measure and not the line of text.
   */
  fixed?: boolean
  /**
   * The side the bubble prefers. It moves if that side does not fit.
   *
   * Physical, as `Tooltip`'s own is: a chart that mirrors says `left` for the
   * side it would call `right` on a left-to-right page.
   */
  placement: 'bottom' | 'left' | 'right' | 'top'
  /**
   * How far across the plot the reading is, as a percentage, from the plot's
   * inline start unless `fixed` says its left.
   */
  x: string
  /**
   * How far down the plot the reading is, as a percentage.
   */
  y: string
}

/**
 * What the keyboard is reading, which `drawTooltip` says aloud and marks.
 *
 * The chart's `pointer` is one, and is what every chart passes.
 */
export type ReadingCursor = Pick<ChartPointerController, 'column' | 'keyed'>

/**
 * What a pointer resting on a reading shows, as `Tooltip` pointed at a mark.
 *
 * **A chart does not draw its own tooltip, and the top layer is why.** `Tooltip`
 * renders `popover="manual"` through `PopoverController`, so it clears every
 * stacking context and every `overflow` on the page. A box drawn by the chart is
 * `position: absolute` inside the plot and is confined to the chart's own
 * context, so it is clipped by, or layered under, whatever sits beside the
 * chart. Escaping that means reimplementing `PopoverController`, which is
 * `Tooltip` with extra steps and a second copy of the hard part.
 *
 * **`for` was already the anchor and needed nothing added.** It resolves in the
 * tree the tooltip sits in, and the mark is in the same shadow root, so a chart
 * names an element inside itself and `Tooltip` finds it. What the chart
 * provides is an invisible mark at the reading's point.
 *
 * **An HTML mark rather than the `<rect>` or `<circle>` already there.**
 * `FloatingController` types its anchor as `HTMLElement` and an SVG element is
 * not one; and a slice's `<circle>` has the bounding box of the whole ring
 * rather than of its arc, so anchoring to it would point at the ring's center
 * for every slice.
 *
 * **And the arrow now follows from placement rather than from a compass.** The
 * chart says which side it prefers and `FloatingController` moves it if that
 * side does not fit, which is how a slice at any bearing gets a bubble that
 * points at it. Four hard-coded sides could not express a bearing, which is what
 * made the donut's arrow miss its own ring.
 *
 * **It shows the table's text and not the chart's numbers.** `$128k` is what the
 * cell says and `128000` is what the drawing measured. Every cell of the row is
 * here, including columns nothing was plotted from, because a note beside the
 * figures is most of the reason to want a tooltip.
 *
 * **The bubble is hidden from assistive technology, and the readout is what is
 * heard.** The bubble carries `aria-hidden`, and so does the mark, because a
 * bubble of figures announced on every move is noise. Given `reading`, which
 * is the chart's `pointer`, this also renders the `live` part: a polite region
 * that says the reading in words when a key moves it, and is empty otherwise.
 * The cell the series keys rest on is named `tooltip-cell-current` as well.
 */
export const drawTooltip = (
  rows: Row[],
  at: number,
  tag: StaticValue,
  where?: TooltipAt,
  slotOf?: (cell: number) => number | undefined,
  reading?: ReadingCursor,
): TemplateResult | typeof nothing => {
  const row = rows[at]
  /* **Rendered whether or not there is a reading, and empty until a key moves
     one.** A live region is heard when what it holds changes, so a region that
     arrived with its words would be read inconsistently at best; this one is
     in the plot from the first drawing and only its words come and go. Not
     before there is a table to read, so a server's frame holds none. */
  const live =
    reading === undefined || rows.length === 0
      ? nothing
      : html`<span aria-live="polite" part="live" role="status">${
          reading.keyed && row ? spokenReading(row, reading.column) : ''
        }</span>`
  if (!row || rows.length === 0) {
    return live
  }
  const slot = 100 / rows.length
  const place: TooltipAt = where ?? {
    placement: 'top',
    x: `${at * slot + slot / 2}%`,
    y: '0%',
  }
  /* The mark and the bubble are siblings, and the id is fixed rather than
     generated: it is scoped to this chart's shadow root, where it is the only
     one, so nothing can collide with it and nothing has to be threaded through
     a render to stay in step.

     **From the inline start, because the drawing is.** A chart's drawing is
     mirrored on a right-to-left page and its pointer read from the plot's
     right, so a reading at 10% stands 10% in from the right edge, and so must
     the mark: written from the left there, it pointed at the mirror of its own
     reading. A whole ring and a scatter's plane are not mirrored, say
     `fixed`, and are measured from the left, where their arithmetic starts. */
  /* **The mark names the bubble with `aria-describedby`**, which is the link
     `Tooltip` checks for when it opens and reports as missing otherwise. The
     report named markup inside the chart's own shadow root, which no consumer
     can reach, so the chart writes the link itself. Both are hidden from
     assistive technology, so the link changes nothing a reader hears. */
  return html`<div
      aria-describedby=${CHART_TOOLTIP}
      aria-hidden="true"
      id="helix-chart-mark"
      part="mark"
      style=${styleMap(
        place.fixed
          ? { left: place.x, top: place.y }
          : { insetBlockStart: place.y, insetInlineStart: place.x },
      )}
    ></div>
    <${tag}
      aria-hidden="true"
      dir=${place.dir ?? nothing}
      exportparts="arrow: tooltip-arrow, arrow-bottom: tooltip-arrow-bottom,
        arrow-left: tooltip-arrow-left, arrow-right: tooltip-arrow-right,
        arrow-top: tooltip-arrow-top, tooltip, tooltip-bottom, tooltip-left, tooltip-right,
        tooltip-top"
      for="helix-chart-mark"
      id=${CHART_TOOLTIP}
      open
      part="tooltip-anchor"
      placement=${place.placement}
      within=${CHART_PLOT}
    >
      <div aria-hidden="true" slot="content">
        <span part="tooltip-label">${row.label}</span>
        ${row.cells.map((cell, index) => {
          /* A palette color only where something was plotted in it, and the
           * chart says which color.
           *
           * A cell with no number is a column no chart drew: a note, a status,
           * a name. Given `data-series` anyway it takes a series color and the
           * stylesheet draws a dot, so a row reading `Note  Outage` arrived
           * wearing series three's green while the legend beside the chart said
           * series three was something else.
           *
           * **Which is why the slot is the caller's to give and not this
           * file's to count.** A cell's place in its row is its place in the
           * *table*, and a chart's series are what it read off that table:
           * `ScatterChart` splits the first numeric column off as the measure
           * across, so its first plotted series is the table's second, and
           * every chart here loses a column of notes among the figures. Counted
           * from `index` the bubble was off by one on a scatter and off by one
           * after any unplotted column anywhere else. `seriesIndex` stays as the
           * answer for a caller whose columns are its series in order.
           *
           * The color travels as `--chart-series` beside the index, the way the
           * legend and every mark write it: this tier knows which series a cell
           * belongs to and CSS cannot count it, so the sheet's dot is one rule
           * reading the property rather than twenty-four keyed on the index.
           * A fact, not a decision: the name it points at is the styled tier's
           * to resolve. */
          /* `slotOf?.(…) ?? seriesIndex(…)` was the first spelling and is
             wrong: a caller answering "no series" answers `undefined`, and the
             fallback swallowed it, so a scatter's measure across kept the dot
             it was being told it should not have. Whether there is a caller and
             what the caller said are two questions. */
          const answer = slotOf === undefined ? seriesIndex(index) : slotOf(index)
          const series = cell.value === undefined ? undefined : answer
          /* The cell the series keys rest on takes a second name while they
             rest there, so a sheet can draw which one the readout is saying. */
          return html`<span
              data-series=${series ?? nothing}
              part="tooltip-cell${index === reading?.column ? ' tooltip-cell-current' : ''}"
              style=${series === undefined ? nothing : `--chart-series: var(--chart-series-${series})`}
            >
              <span part="tooltip-name">${cell.name}</span>
              <span part="tooltip-value">${cell.text}</span>
            </span>`
        })}
      </div>
    </${tag}>
    ${live}`
}
