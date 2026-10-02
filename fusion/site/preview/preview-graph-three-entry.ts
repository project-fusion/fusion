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
import { modelOf, stencilOf } from './preview-graph-stencil'

/**
 * One graph: the renderer made in the frame's box, connected, and recolored
 * when the frame restyles. **Connected once its model has loaded**, where the
 * frame names one, so the notes are drawn on the model from the first
 * frame; the list is there before.
 */
const start = (frame: HTMLElement): (() => void) => {
  const box = frame.querySelector<HTMLElement>('[data-preview-graph-canvas]')
  if (!box) {
    return () => undefined
  }
  let stopped = false
  let stop = (): void => {
    stopped = true
  }
  void modelOf(frame).then((model) => {
    if (stopped) {
      return
    }
    const connection = connectGraph(frame, threeDriver(box), { stencil: model ?? stencilOf(frame) })
    window.addEventListener(RESTYLED, connection.restyle)
    stop = () => {
      window.removeEventListener(RESTYLED, connection.restyle)
      connection.disconnect()
    }
  })
  return () => stop()
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
