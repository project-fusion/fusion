import {
  type Axes,
  connectPlot,
  type PlotConnection,
  type PlotDriver,
} from '../connect-plot/connect-plot.js'

/** One place on a bar chart's grid: a category across, a series in depth, and its value, where the table has one. */
export interface BarCell {
  across: number
  column: number
  /** Its series, which colors it. */
  depth: number
  /** Where its block starts: zero, or under `stacked` the blocks below it. */
  from: number
  label: string
  /** The row of the grid in depth it stands in: its series, or the one row of a stacked chart. */
  lane: number
  row: number
  /** The tone its cell names, which colors its own bar. */
  tone?: string | undefined
  value?: number | undefined
}

/**
 * What a Spatial Bar Chart publishes for a renderer to draw: every place on
 * its grid, across first, so the bar for category `across` in series
 * `depth` is `cells[across * series.length + depth]`, and its axes, whose
 * `extent` gives the box the grid's proportions.
 */
export interface BarField {
  axes: Axes
  categories: readonly string[]
  cells: readonly BarCell[]
  /** How many rows of bars stand in depth: one a series, or one in all when stacked. */
  lanes: number
  readings: number
  series: readonly string[]
  /** Whether a category's series stand in one column, each on the ones before it. */
  stacked: boolean
}

/** A renderer for a Spatial Bar Chart: `focus` and `onPress` take a bar's index in `field.cells`. */
export type SpatialBarChartDriver = PlotDriver<BarField>

/** A connection between a Spatial Bar Chart and its renderer. */
export type SpatialBarChartConnection = PlotConnection

/**
 * Connects a Spatial Bar Chart to whatever draws it in three dimensions.
 *
 * The chart is `helix-spatial-bar-chart` or `helix-headless-spatial-bar-chart`,
 * and the driver is `threeBarDriver` from `@fusion.dev/helix-plot/three`, or
 * one of your own. The connection draws the chart's bars in the driver, each
 * series in a series color, marks the bar the keys rest on, turns the view
 * for Shift with an arrow, and puts a bar pressed in the drawing on the
 * chart's reading. A bar whose cell names a tone takes the page's
 * `--spatial-bar-chart-tone-*` color. Once the driver has drawn, the chart
 * hides its own SVG drawing; `disconnect()` shows it again.
 */
export const connectSpatialBarChart = (
  frame: HTMLElement,
  driver: SpatialBarChartDriver,
): SpatialBarChartConnection =>
  connectPlot(frame, driver, {
    /* Each tone is the token the chart's own drawing paints it in. */
    extraOf: (field) =>
      Object.fromEntries(
        [...new Set(field.cells.flatMap((cell) => (cell.tone ? [cell.tone] : [])))].map((tone) => [
          `tone-${tone}`,
          `var(--spatial-bar-chart-tone-${tone}, var(--helix-color-primary))`,
        ]),
      ),
    groupsOf: (field) => field.series.length,
    name: 'connectSpatialBarChart',
    readings: (field) => field.readings,
  })
