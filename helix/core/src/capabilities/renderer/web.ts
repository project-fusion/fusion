import type { Renderer } from './contract.generated.js'

/**
 * Hands the drawing to the page's own renderer, which the page connects to
 * the family, such as a map through `connectMap`: the family draws the frame
 * around it, and the renderer draws in its box, so a renderer of every kind
 * can draw.
 */
export const webRenderer: Renderer = {
  available: () => true,
}
