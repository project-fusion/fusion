import {
  type Axes,
  connectPlot,
  type PlotConnection,
  type PlotDriver,
} from '../connect-plot/connect-plot.js'

/** One reading of a ribbon chart: a place across, a series in depth, and its value, where the table has one. */
export interface RibbonCell {
  across: number
  column: number
  depth: number
  label: string
  row: number
  value?: number | undefined
}

/**
 * What a Spatial Ribbon Chart publishes for a renderer to draw: every
 * reading, across first, so the reading at place `across` in series `depth`
 * is `cells[across * series.length + depth]`, and its axes, whose `extent`
 * makes the box long across and shallow in depth.
 */
export interface RibbonField {
  axes: Axes
  categories: readonly string[]
  cells: readonly RibbonCell[]
  readings: number
  series: readonly string[]
}

/** A renderer for a Spatial Ribbon Chart: `focus` and `onPress` take a reading's index in `field.cells`. */
export type SpatialRibbonChartDriver = PlotDriver<RibbonField>

/** A connection between a Spatial Ribbon Chart and its renderer. */
export type SpatialRibbonChartConnection = PlotConnection

/**
 * Connects a Spatial Ribbon Chart to whatever draws it in three dimensions.
 *
 * The chart is `helix-spatial-ribbon-chart` or
 * `helix-headless-spatial-ribbon-chart`, and the driver is `threeRibbonDriver`
 * from `@fusion.dev/helix-plot/three`, or one of your own. The connection
 * draws the chart's ribbons in the driver, each series in a series color,
 * marks the reading the keys rest on, turns the view for Shift with an
 * arrow, and puts a reading pressed in the drawing on the chart's reading. Once the driver has drawn, the chart hides its own SVG
 * drawing; `disconnect()` shows it again.
 */
export const connectSpatialRibbonChart = (
  frame: HTMLElement,
  driver: SpatialRibbonChartDriver,
): SpatialRibbonChartConnection =>
  connectPlot(frame, driver, {
    groupsOf: (field) => field.series.length,
    name: 'connectSpatialRibbonChart',
    readings: (field) => field.readings,
  })
