/**
 * The spatial heatmap and charts drawn by three.js in the preview frame,
 * loaded only when a render carries one marked `data-preview-plot="three"`.
 *
 * A chunk of its own, beside the graph ones, for the reason they are beside
 * `frame.js`: most renders draw no 3D chart.
 */

import {
  connectSpatialHeatmap,
  connectSpatialScatterChart,
  connectSpatialSurfaceChart,
} from '@fusion.dev/helix-plot'
import {
  threeHeatmapDriver,
  threeScatterDriver,
  threeSurfaceDriver,
} from '@fusion.dev/helix-plot/three'
import { RESTYLED } from './preview-events'

/** One chart: the renderer made in its box, connected, and recolored when the frame restyles. */
const start = (chart: HTMLElement): (() => void) => {
  const box = chart.querySelector<HTMLElement>('[data-preview-plot-canvas]')
  if (!box) {
    return () => undefined
  }
  const connection =
    chart.localName === 'helix-spatial-heatmap'
      ? connectSpatialHeatmap(chart, threeHeatmapDriver(box))
      : chart.localName === 'helix-spatial-surface-chart'
        ? connectSpatialSurfaceChart(chart, threeSurfaceDriver(box))
        : connectSpatialScatterChart(chart, threeScatterDriver(box))
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
        ':is(helix-spatial-heatmap, helix-spatial-scatter-chart, helix-spatial-surface-chart)[data-preview-plot="three"]',
      ),
    ].map(start)
    return () => {
      for (const unmount of unmounts) {
        unmount()
      }
    }
  },
}
