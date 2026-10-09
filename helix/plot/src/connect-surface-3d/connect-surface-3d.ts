import {
  type Axes,
  connectPlot,
  type PlotConnection,
  type PlotDriver,
} from '../connect-plot/connect-plot.js'

/** One place on a surface's grid, and its reading, where the table has one. */
export interface SurfaceCell {
  label?: string | undefined
  row?: number | undefined
  value?: number | undefined
  x: number
  z: number
}

/**
 * What a 3D Surface chart publishes for a renderer to draw: every place on
 * its grid, across first, so the place `across` along and `depth` back is
 * `cells[across * depths.length + depth]`, and its axes.
 */
export interface SurfaceField {
  acrosses: readonly number[]
  axes: Axes
  cells: readonly SurfaceCell[]
  depths: readonly number[]
  readings: number
}

/** A renderer for a 3D Surface chart: `focus` and `onPress` take a place's index in `field.cells`. */
export type Surface3dDriver = PlotDriver<SurfaceField>

/** A connection between a 3D Surface chart and its renderer. */
export type Surface3dConnection = PlotConnection

/**
 * Connects a 3D Surface chart to whatever draws it in three dimensions.
 *
 * The chart is `helix-surface-3d` or `helix-headless-surface-3d`, and the
 * driver is `threeSurfaceDriver` from `@fusion.dev/helix-plot/three`, or one
 * of your own. The connection draws the chart's grid as a surface in the
 * driver, shaded along the ramp `--surface-3d-low` to `--surface-3d-high`,
 * marks the place the keys rest on, turns the view for Shift with an arrow,
 * and puts a place pressed in the drawing on the chart's reading. Once the
 * driver has drawn, the chart hides its flat grid; `disconnect()` shows it
 * again.
 */
export const connectSurface3d = (
  frame: HTMLElement,
  driver: Surface3dDriver,
): Surface3dConnection =>
  connectPlot(frame, driver, {
    groupsOf: () => 0,
    name: 'connectSurface3d',
    readings: (field) => field.readings,
  })
