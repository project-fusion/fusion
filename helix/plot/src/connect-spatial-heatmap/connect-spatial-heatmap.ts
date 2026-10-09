import { connectPlot, type PlotConnection, type PlotDriver } from '../connect-plot/connect-plot.js'

/** One reading of a spatial heatmap, where it stands on the grid and how tall. */
export interface HeatmapCell {
  /** Which column it stands in, from the oldest drawn. */
  column: number
  /** How tall it stands, in cells, from zero. */
  height: number
  /** The row's own label, which names it. */
  label: string
  /** Which row of its column it stands in. */
  row: number
  /** The tone it is painted in, as the chart names it, or none for a day with nothing in it. */
  tone?: string | undefined
}

/**
 * What a spatial heatmap publishes for a renderer to draw: every reading it
 * draws, down each column and then across, as its own drawing paints them,
 * and how many columns and rows the grid has.
 */
export interface SpatialHeatmapField {
  cells: readonly HeatmapCell[]
  columns: number
  rows: number
}

/** A renderer for a spatial heatmap: `focus` and `onPress` take a reading's place in `field.cells`. */
export type SpatialHeatmapDriver = PlotDriver<SpatialHeatmapField>

/** A connection between a spatial heatmap and its renderer. */
export type SpatialHeatmapConnection = PlotConnection

/**
 * Connects a spatial heatmap to whatever draws it in three dimensions.
 *
 * The chart is `helix-spatial-heatmap` or `helix-headless-spatial-heatmap`,
 * with the renderer's box in its `renderer` slot, and the driver is
 * `threeHeatmapDriver` from `@fusion.dev/helix-plot/three`, or one of your
 * own. The connection draws the chart's readings as prisms in the driver,
 * each in its tone from the page's `--heatmap-tone-*` tokens, marks the
 * reading the chart rests on, turns the view for Shift with an arrow, and
 * puts a reading hovered or pressed in the drawing on the chart. Once the
 * driver has drawn, the chart's own SVG drawing gives way to it;
 * `disconnect()` shows it again.
 */
export const connectSpatialHeatmap = (
  frame: HTMLElement,
  driver: SpatialHeatmapDriver,
): SpatialHeatmapConnection =>
  connectPlot(frame, driver, {
    /* The empty tile and the slab are the chart's own sheet's colors, and
       each tone is the token the chart's drawing paints it in. */
    extraOf: (field) => ({
      base: 'color-mix(in oklab, var(--helix-color-surface-sunken), var(--helix-color-border) 45%)',
      tile: 'color-mix(in oklab, var(--helix-color-surface-sunken), var(--helix-color-surface) 60%)',
      ...Object.fromEntries(
        [...new Set(field.cells.flatMap((cell) => (cell.tone ? [cell.tone] : [])))].map((tone) => [
          `tone-${tone}`,
          `var(--heatmap-tone-${tone})`,
        ]),
      ),
    }),
    groupsOf: () => 0,
    name: 'connectSpatialHeatmap',
    readings: (field) => field.cells.length,
  })
