import {
  type Axes,
  connectPlot,
  type PlotConnection,
  type PlotDriver,
} from '../connect-plot/connect-plot.js'

/** One row of a treemap drawn as a block: its part of the floor, its size, its height where the table has one, and its group. */
export interface TreemapBlock {
  /** Its part of the floor, across from `x0` to `x1` and in depth from `z0` to `z1`, each from -1 to 1. */
  area: { x0: number; x1: number; z0: number; z1: number }
  group: string
  groupIndex: number
  height?: number | undefined
  label: string
  row: number
  size: number
}

/**
 * What a Spatial Treemap publishes for a renderer to draw: every block, in
 * the table's order, each on its part of the floor, and the axes, whose `y`
 * is the height and whose `extent` gives the box its proportions. `height`
 * is `''` where no column gives one, and each block is then a slab as tall
 * as the box.
 */
export interface TreemapField {
  axes: Axes
  blocks: readonly TreemapBlock[]
  groups: readonly string[]
  height: string
  size: string
}

/** A renderer for a Spatial Treemap: `focus` and `onPress` take a block's index in `field.blocks`. */
export type SpatialTreemapDriver = PlotDriver<TreemapField>

/** A connection between a Spatial Treemap and its renderer. */
export type SpatialTreemapConnection = PlotConnection

/**
 * Connects a Spatial Treemap to whatever draws it in three dimensions.
 *
 * The chart is `helix-spatial-treemap` or `helix-headless-spatial-treemap`,
 * and the driver is `threeTreemapDriver` from `@fusion.dev/helix-plot/three`,
 * or one of your own. The connection draws the chart's blocks in the driver,
 * each group in a series color, marks the block the keys rest on, turns the
 * view for Shift with an arrow, and puts a block pressed in the drawing on
 * the chart's reading. Once the driver has drawn, the chart hides its own SVG
 * drawing; `disconnect()` shows it again.
 */
export const connectSpatialTreemap = (
  frame: HTMLElement,
  driver: SpatialTreemapDriver,
): SpatialTreemapConnection =>
  connectPlot(frame, driver, {
    groupsOf: (field) => field.groups.length,
    name: 'connectSpatialTreemap',
    readings: (field) => field.blocks.length,
  })
