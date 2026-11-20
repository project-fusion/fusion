import type { Renderer } from './contract.generated.js'

/** Draws nothing: a server has no screen to draw on, and its markup carries the still fallback. */
export const serverRenderer: Renderer = {
  available: () => false,
}
