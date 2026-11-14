import type { GpuDrawing } from './contract.generated.js'

/** Whether a canvas here gives a 2D context, asked once. */
let answered: boolean | undefined

/**
 * Draws on a canvas, where the browser gives one a 2D context.
 *
 * **Asked once, of a canvas never placed**: a browser that refuses a context,
 * as one with its canvas turned off does, refuses it for every canvas.
 */
export const webGpuDrawing: GpuDrawing = {
  available: () => {
    answered ??=
      typeof document !== 'undefined' && document.createElement('canvas').getContext('2d') !== null
    return answered
  },
}
