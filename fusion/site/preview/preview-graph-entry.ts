/**
 * A live graph in the preview frame, loaded only when a render carries one.
 *
 * Bundled to a classic script beside `frame.js` by `build-frame.mjs`, for the
 * reason the map chunk gives: the frame is sandboxed onto an opaque origin,
 * and a classic `<script src>` is the one request from there that is not
 * CORS-checked. Sigma, graphology and ForceAtlas2 are inside it, and the
 * layout's worker starts from a `blob:` URL, the only worker an opaque origin
 * may start, which is what ForceAtlas2 does on its own.
 *
 * **Separate from `frame.js`** because most renders never draw a graph.
 */

import { connectGraph } from '@fusion.dev/helix-graph'
import { sigmaDriver } from '@fusion.dev/helix-graph/sigma'
import Graph from 'graphology'
import forceAtlas2 from 'graphology-layout-forceatlas2'
import FA2Layout from 'graphology-layout-forceatlas2/worker'
import Sigma from 'sigma'
import { RESTYLED } from './preview-events'
import { stencilOf } from './preview-graph-stencil'

/** One graph: the renderer made in the frame's box, connected, and recolored when the frame restyles. */
const start = (frame: HTMLElement): (() => void) => {
  const box = frame.querySelector<HTMLElement>('[data-preview-graph-canvas]')
  if (!box) {
    return () => undefined
  }
  const sigma = new Sigma(new Graph(), box, { allowInvalidContainer: true })
  /* **The drawing the example asks for**, as `data-preview-graph-material`,
     `-shape` and `-emphasis`, which are `sigmaDriver`'s options written as
     attributes. */
  const asked = frame.dataset
  const connection = connectGraph(
    frame,
    sigmaDriver(sigma, {
      emphasis: asked.previewGraphEmphasis as never,
      layout: (graph) => new FA2Layout(graph, { settings: forceAtlas2.inferSettings(graph) }),
      material: asked.previewGraphMaterial as never,
      shape: asked.previewGraphShape as never,
    }),
    { stencil: stencilOf(frame) },
  )
  /* A theme the builder sends is a stylesheet replaced, which no attribute
     shows, so the frame says so and the colors are read again. */
  window.addEventListener(RESTYLED, connection.restyle)
  return () => {
    window.removeEventListener(RESTYLED, connection.restyle)
    connection.disconnect()
    sigma.kill()
  }
}

window.helixPreviewGraph = {
  mount(root) {
    /* Every graph but the ones cosmos.gl and three.js draw, which have chunks of their own. */
    const unmounts = [
      ...root.querySelectorAll<HTMLElement>(
        'helix-graph[data-preview-graph]:not([data-preview-graph="cosmos"]):not([data-preview-graph="three"])',
      ),
    ].map(start)
    return () => {
      for (const unmount of unmounts) {
        unmount()
      }
    }
  },
}
