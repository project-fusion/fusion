/**
 * The spatial heatmap and charts drawn by three.js in the preview frame,
 * loaded only when a render carries one marked `data-preview-plot="three"`.
 *
 * A chunk of its own, beside the graph ones, for the reason they are beside
 * `frame.js`: most renders draw no 3D chart.
 */

import {
  connectSpatialBarChart,
  connectSpatialHeatmap,
  connectSpatialRibbonChart,
  connectSpatialScatterChart,
  connectSpatialSurfaceChart,
  connectSpatialTreemap,
} from '@fusion.dev/helix-plot'
import {
  threeBarDriver,
  threeHeatmapDriver,
  threeRibbonDriver,
  threeScatterDriver,
  threeSurfaceDriver,
  threeTreemapDriver,
} from '@fusion.dev/helix-plot/three'
import { RESTYLED } from './preview-events'

/** Each chart's connection to its three.js driver, by its tag. */
const CONNECT: Record<
  string,
  (chart: HTMLElement, box: HTMLElement) => { disconnect(): void; restyle(): void }
> = {
  'helix-spatial-bar-chart': (chart, box) => connectSpatialBarChart(chart, threeBarDriver(box)),
  'helix-spatial-heatmap': (chart, box) => connectSpatialHeatmap(chart, threeHeatmapDriver(box)),
  'helix-spatial-ribbon-chart': (chart, box) =>
    connectSpatialRibbonChart(chart, threeRibbonDriver(box)),
  'helix-spatial-scatter-chart': (chart, box) =>
    connectSpatialScatterChart(chart, threeScatterDriver(box)),
  'helix-spatial-surface-chart': (chart, box) =>
    connectSpatialSurfaceChart(chart, threeSurfaceDriver(box)),
  'helix-spatial-treemap': (chart, box) => connectSpatialTreemap(chart, threeTreemapDriver(box)),
}

/** One chart: the renderer made in its box, connected, and recolored when the frame restyles. */
const start = (chart: HTMLElement): (() => void) => {
  const box = chart.querySelector<HTMLElement>('[data-preview-plot-canvas]')
  const connect = CONNECT[chart.localName]
  if (!box || !connect) {
    return () => undefined
  }
  const connection = connect(chart, box)
  window.addEventListener(RESTYLED, connection.restyle)
  return () => {
    window.removeEventListener(RESTYLED, connection.restyle)
    connection.disconnect()
  }
}

window.helixPreviewPlotThree = {
  mount(root) {
    const unmounts = [
      ...root.querySelectorAll<HTMLElement>(
        ':is(helix-spatial-bar-chart, helix-spatial-heatmap, helix-spatial-ribbon-chart, helix-spatial-scatter-chart, helix-spatial-surface-chart, helix-spatial-treemap)[data-preview-plot="three"]',
      ),
    ].map(start)
    return () => {
      for (const unmount of unmounts) {
        unmount()
      }
    }
  },
}
