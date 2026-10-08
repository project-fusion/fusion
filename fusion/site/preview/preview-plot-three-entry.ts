/**
 * A 3D Scatter chart drawn by three.js in the preview frame, loaded only when
 * a render carries one marked `data-preview-plot="three"`.
 *
 * A chunk of its own, beside the graph ones, for the reason they are beside
 * `frame.js`: most renders draw no 3D chart.
 */

import { connectScatter3d } from '@fusion.dev/helix-plot'
import { threeScatterDriver } from '@fusion.dev/helix-plot/three'
import { RESTYLED } from './preview-events'

/** One chart: the renderer made in its box, connected, and recolored when the frame restyles. */
const start = (chart: HTMLElement): (() => void) => {
  const box = chart.querySelector<HTMLElement>('[data-preview-plot-canvas]')
  if (!box) {
    return () => undefined
  }
  const connection = connectScatter3d(chart, threeScatterDriver(box))
  window.addEventListener(RESTYLED, connection.restyle)
  return () => {
    window.removeEventListener(RESTYLED, connection.restyle)
    connection.disconnect()
  }
}

window.helixPreviewPlotThree = {
  mount(root) {
    const unmounts = [
      ...root.querySelectorAll<HTMLElement>('helix-scatter-3d[data-preview-plot="three"]'),
    ].map(start)
    return () => {
      for (const unmount of unmounts) {
        unmount()
      }
    }
  },
}
