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
  depth: number
  label: string
  row: number
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
  readings: number
  series: readonly string[]
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
 * chart's reading. Once the driver has drawn, the chart hides its own SVG
 * drawing; `disconnect()` shows it again.
 */
export const connectSpatialBarChart = (
  frame: HTMLElement,
  driver: SpatialBarChartDriver,
): SpatialBarChartConnection =>
  connectPlot(frame, driver, {
    groupsOf: (field) => field.series.length,
    name: 'connectSpatialBarChart',
    readings: (field) => field.readings,
  })
