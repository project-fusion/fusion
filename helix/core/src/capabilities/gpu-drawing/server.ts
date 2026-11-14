import type { GpuDrawing } from './contract.generated.js'

/** Draws nothing: a server has no screen to draw on, and its markup carries the still fallback. */
export const serverGpuDrawing: GpuDrawing = {
  available: () => false,
}
