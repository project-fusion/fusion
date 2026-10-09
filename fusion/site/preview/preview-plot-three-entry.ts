/**
 * 3D Scatter and 3D Surface charts drawn by three.js in the preview frame,
 * loaded only when a render carries one marked `data-preview-plot="three"`.
 *
 * A chunk of its own, beside the graph ones, for the reason they are beside
 * `frame.js`: most renders draw no 3D chart.
 */

import { connectScatter3d, connectSurface3d } from '@fusion.dev/helix-plot'
import { threeScatterDriver, threeSurfaceDriver } from '@fusion.dev/helix-plot/three'
import { RESTYLED } from './preview-events'

/** One chart: the renderer made in its box, connected, and recolored when the frame restyles. */
const start = (chart: HTMLElement): (() => void) => {
  const box = chart.querySelector<HTMLElement>('[data-preview-plot-canvas]')
  if (!box) {
    return () => undefined
  }
  const connection =
    chart.localName === 'helix-surface-3d'
      ? connectSurface3d(chart, threeSurfaceDriver(box))
      : connectScatter3d(chart, threeScatterDriver(box))
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
        ':is(helix-scatter-3d, helix-surface-3d)[data-preview-plot="three"]',
      ),
    ].map(start)
    return () => {
      for (const unmount of unmounts) {
        unmount()
      }
    }
  },
}
