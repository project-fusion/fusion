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

/** What a 3D Scatter chart publishes for a renderer to draw: its points, its axes, and its groups. */
export interface Field {
  axes: Axes
  groups: readonly string[]
  points: readonly Point[]
}

/** A renderer for a 3D Scatter chart: `focus` and `onPress` take a point's place in `field.points`. */
export type Scatter3dDriver = PlotDriver<Field>

/** A connection between a 3D Scatter chart and its renderer. */
export type Scatter3dConnection = PlotConnection

/**
 * Connects a 3D Scatter chart to whatever draws it in three dimensions.
 *
 * The chart is `helix-scatter-3d` or `helix-headless-scatter-3d`, and the
 * driver is `threeScatterDriver` from `@fusion.dev/helix-plot/three`, or one
 * of your own. The connection draws the chart's points and axes in the
 * driver, colors each group from the page's series tokens, marks the point
 * the keys rest on, turns the view for Shift with an arrow, and puts a point
 * pressed in the drawing on the chart's reading. Once the driver has drawn,
 * the chart hides its flat scatter; `disconnect()` shows it again.
 */
export const connectScatter3d = (
  frame: HTMLElement,
  driver: Scatter3dDriver,
): Scatter3dConnection =>
  connectPlot(frame, driver, {
    groupsOf: (field) => field.groups.length,
    name: 'connectScatter3d',
    readings: (field) => field.points.length,
  })
