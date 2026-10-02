/**
 * A live graph drawn by three.js in the preview frame, in three dimensions,
 * loaded only when a render carries one marked `data-preview-graph="three"`.
 *
 * A chunk of its own, beside the Sigma and cosmos.gl ones, for the reason
 * they are beside `frame.js`: most renders draw no graph, and most graphs are
 * drawn flat.
 */

import { connectGraph } from '@fusion.dev/helix-graph'
import { threeDriver } from '@fusion.dev/helix-graph/three'
import { RESTYLED } from './preview-events'
import { stencilOf } from './preview-graph-stencil'

/** One graph: the renderer made in the frame's box, connected, and recolored when the frame restyles. */
const start = (frame: HTMLElement): (() => void) => {
  const box = frame.querySelector<HTMLElement>('[data-preview-graph-canvas]')
  if (!box) {
    return () => undefined
  }
  const connection = connectGraph(frame, threeDriver(box), { stencil: stencilOf(frame) })
  window.addEventListener(RESTYLED, connection.restyle)
  return () => {
    window.removeEventListener(RESTYLED, connection.restyle)
    connection.disconnect()
  }
}

window.helixPreviewGraphThree = {
  mount(root) {
    const unmounts = [
      ...root.querySelectorAll<HTMLElement>('helix-graph[data-preview-graph="three"]'),
    ].map(start)
    return () => {
      for (const unmount of unmounts) {
        unmount()
      }
    }
  },
}
