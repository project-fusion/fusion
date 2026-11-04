/**
 * A chart's arithmetic with no element in it, which the web's charts and a
 * phone's both draw and read with: the plot's box, what a sparkline draws,
 * which reading a finger is on, where a key moves the reading, and what the
 * reading says.
 */

export * from '../../controllers/chart-pointer-controller/reading-step.js'
export * from '../draw-tooltip/spoken-reading.js'
export type { Row, RowCell, Series, SeriesPoint } from '../read-series/read-series.js'
export { extremesOf, unbroken } from '../read-series/read-series.js'
export * from './chart-reading.js'
export * from './plot-box.js'
export * from './sparkline-plot.js'
