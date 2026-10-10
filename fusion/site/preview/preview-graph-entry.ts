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
import { isometricDriver } from '@fusion.dev/helix-graph/isometric'
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
  const asked = frame.dataset
  /* **An isometric diagram is SVG**, drawn by Helix with no renderer to make,
     so it shares this chunk and costs it a few kilobytes. */
  if (asked.previewGraph === 'isometric') {
    const number = (value: string | undefined): number | undefined =>
      value === undefined || value === '' ? undefined : Number(value)
    const driver = isometricDriver(box, {
      flat: asked.previewGraphFlat !== undefined,
      shape: asked.previewGraphShape as never,
      tilt: number(asked.previewGraphTilt),
      turn: number(asked.previewGraphTurn),
    })
    const connection = connectGraph(frame, driver)
    /* **A button marked `data-preview-graph-turn-by` turns the view** by its
       degrees, which is `driver.turnBy(degrees)` on a page of your own, and
       one marked `data-preview-graph-tilt-to` tilts it to its degrees, which
       is `driver.turnTo({ tilt })`. */
    const turn = (event: Event): void => {
      const button = (event.target as Element | null)?.closest<HTMLElement>(
        '[data-preview-graph-turn-by], [data-preview-graph-tilt-to]',
      )
      if (!button || !frame.contains(button)) {
        return
      }
      const tilt = number(button.dataset.previewGraphTiltTo)
      if (tilt === undefined) {
        driver.turnBy(Number(button.dataset.previewGraphTurnBy) || 0)
      } else {
        driver.turnTo({ tilt })
      }
    }
    frame.addEventListener('click', turn)
    window.addEventListener(RESTYLED, connection.restyle)
    return () => {
      frame.removeEventListener('click', turn)
      window.removeEventListener(RESTYLED, connection.restyle)
      connection.disconnect()
    }
  }
  const sigma = new Sigma(new Graph(), box)
  /* **The drawing the example asks for**, as `data-preview-graph-material`,
     `-shape` and `-emphasis`, which are `sigmaDriver`'s options written as
     attributes. */
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
