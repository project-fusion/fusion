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
import { type Device, luma } from '@luma.gl/core'
import { webgl2Adapter } from '@luma.gl/webgl'
import { RESTYLED } from './preview-events'
import { stencilOf } from './preview-graph-stencil'

/**
 * The GPU device cosmos.gl draws with, made here and handed over a frame
 * after its canvas is first measured.
 *
 * **Made here because cosmos.gl's own start trips the browser's
 * `ResizeObserver` loop report.** cosmos.gl waits for luma.gl to measure the
 * canvas, and luma.gl says so from inside its resize callback, so cosmos.gl
 * goes on to observe the canvas itself from inside that callback. A new
 * observation there is put off to the next frame, which is harmless, and
 * reported as an error, which the frame's console then shows. Started a frame
 * later, cosmos.gl observes outside any callback. The settings are cosmos.gl's
 * own.
 */
const deviceIn = async (box: HTMLElement): Promise<Device> => {
  const canvas = document.createElement('canvas')
  canvas.style.cssText = 'width:100%;height:100%'
  box.append(canvas)
  const device = await luma.createDevice({
    adapters: [webgl2Adapter],
    createCanvasContext: { autoResize: true, canvas, useDevicePixels: true },
    type: 'webgl',
    webgl: { antialias: false },
  })
  await device.canvasContext?.initialized
  await new Promise((done) => requestAnimationFrame(done))
  return device
}

/** One graph: the renderer made in the frame's box, connected, and recolored when the frame restyles. */
const start = (frame: HTMLElement): (() => void) => {
  const box = frame.querySelector<HTMLDivElement>('[data-preview-graph-canvas]')
  if (!box) {
    return () => undefined
  }
  const device = deviceIn(box)
  const graph = new Graph(
    box,
    {
      attribution: '',
      enableSimulation: true,
      renderHoveredPointRing: true,
      scalePointsOnZoom: false,
    },
    device,
  )
  const connection = connectGraph(frame, cosmosDriver(graph, box), { stencil: stencilOf(frame) })
  window.addEventListener(RESTYLED, connection.restyle)
  return () => {
    window.removeEventListener(RESTYLED, connection.restyle)
    connection.disconnect()
    graph.destroy()
    /* A device handed to cosmos.gl is the page's to destroy. */
    void device.then((made) => made.destroy())
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
