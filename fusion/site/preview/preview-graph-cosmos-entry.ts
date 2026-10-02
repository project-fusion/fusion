/**
 * A live graph drawn by cosmos.gl in the preview frame, loaded only when a
 * render carries one marked `data-preview-graph="cosmos"`.
 *
 * A chunk of its own, beside the Sigma one, for the reason that one is beside
 * `frame.js`: most renders draw no graph, and most graphs are drawn by Sigma.
 * cosmos.gl lays out and draws on the GPU, which is what an example of tens
 * of thousands of notes needs.
 */

import { Graph } from '@cosmos.gl/graph'
import { connectGraph } from '@fusion.dev/helix-graph'
import { cosmosDriver } from '@fusion.dev/helix-graph/cosmos'
import { RESTYLED } from './preview-events'
import { stencilOf } from './preview-graph-stencil'

/** One graph: the renderer made in the frame's box, connected, and recolored when the frame restyles. */
const start = (frame: HTMLElement): (() => void) => {
  const box = frame.querySelector<HTMLDivElement>('[data-preview-graph-canvas]')
  if (!box) {
    return () => undefined
  }
  const graph = new Graph(box, {
    attribution: '',
    enableSimulation: true,
    renderHoveredPointRing: true,
    scalePointsOnZoom: false,
  })
  const connection = connectGraph(frame, cosmosDriver(graph, box), { stencil: stencilOf(frame) })
  window.addEventListener(RESTYLED, connection.restyle)
  return () => {
    window.removeEventListener(RESTYLED, connection.restyle)
    connection.disconnect()
    graph.destroy()
  }
}

window.helixPreviewGraphCosmos = {
  mount(root) {
    const unmounts = [
      ...root.querySelectorAll<HTMLElement>('helix-graph[data-preview-graph="cosmos"]'),
    ].map(start)
    return () => {
      for (const unmount of unmounts) {
        unmount()
      }
    }
  },
}
