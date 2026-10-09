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
 * What a Spatial Surface Chart publishes for a renderer to draw: every place on
 * its grid, across first, so the place `across` along and `depth` back is
 * `cells[across * depths.length + depth]`, and its axes.
 */
export interface SurfaceField {
  acrosses: readonly number[]
  axes: Axes
  cells: readonly SurfaceCell[]
  /** The contour lines at each tick of the height, each segment two places across and in depth, which `contours` draws on the surface. */
  contours?: readonly {
    level: number
    segments: readonly (readonly [readonly [number, number], readonly [number, number]])[]
  }[]
  depths: readonly number[]
  /** The lowest and the highest reading. */
  highest?: number
  lowest?: number
  readings: number
}

/** A renderer for a Spatial Surface Chart: `focus` and `onPress` take a place's index in `field.cells`. */
export type SpatialSurfaceChartDriver = PlotDriver<SurfaceField>

/** A connection between a Spatial Surface Chart and its renderer. */
export type SpatialSurfaceChartConnection = PlotConnection

/**
 * Connects a Spatial Surface Chart to whatever draws it in three dimensions.
 *
 * The chart is `helix-spatial-surface-chart` or `helix-headless-spatial-surface-chart`, and the
 * driver is `threeSurfaceDriver` from `@fusion.dev/helix-plot/three`, or one
 * of your own. The connection draws the chart's grid as a surface in the
 * driver, shaded along the ramp `--spatial-surface-chart-low` to `--spatial-surface-chart-high`,
 * marks the place the keys rest on, turns the view for Shift with an arrow,
 * and puts a place pressed in the drawing on the chart's reading. Once the
 * driver has drawn, the chart hides its own SVG drawing; `disconnect()`
 * shows it again.
 */
export const connectSpatialSurfaceChart = (
  frame: HTMLElement,
  driver: SpatialSurfaceChartDriver,
): SpatialSurfaceChartConnection =>
  connectPlot(frame, driver, {
    groupsOf: () => 0,
    name: 'connectSpatialSurfaceChart',
    readings: (field) => field.readings,
  })
