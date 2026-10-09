import {
  type Axes,
  connectPlot,
  type PlotConnection,
  type PlotDriver,
} from '../connect-plot/connect-plot.js'

/** One point of the plot: its row's label, its group, and its three numbers. */
export interface Point {
  group: string
  groupIndex: number
  label: string
  row: number
  x: number
  y: number
  z: number
}

/** What a Spatial Scatter Chart publishes for a renderer to draw: its points, its axes, and its groups. */
export interface Field {
  axes: Axes
  groups: readonly string[]
  points: readonly Point[]
}

/** A renderer for a Spatial Scatter Chart: `focus` and `onPress` take a point's place in `field.points`. */
export type SpatialScatterChartDriver = PlotDriver<Field>

/** A connection between a Spatial Scatter Chart and its renderer. */
export type SpatialScatterChartConnection = PlotConnection

/**
 * Connects a Spatial Scatter Chart to whatever draws it in three dimensions.
 *
 * The chart is `helix-spatial-scatter-chart` or `helix-headless-spatial-scatter-chart`, and the
 * driver is `threeScatterDriver` from `@fusion.dev/helix-plot/three`, or one
 * of your own. The connection draws the chart's points and axes in the
 * driver, colors each group from the page's series tokens, marks the point
 * the keys rest on, turns the view for Shift with an arrow, and puts a point
 * pressed in the drawing on the chart's reading. Once the driver has drawn,
 * the chart hides its flat scatter; `disconnect()` shows it again.
 */
export const connectSpatialScatterChart = (
  frame: HTMLElement,
  driver: SpatialScatterChartDriver,
): SpatialScatterChartConnection =>
  connectPlot(frame, driver, {
    groupsOf: (field) => field.groups.length,
    name: 'connectSpatialScatterChart',
    readings: (field) => field.points.length,
  })
