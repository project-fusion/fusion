/*
 * Arranging a board's cards: `@fusion.dev/helix-headless/canvas/arrange`.
 *
 * Its own entry, so a board whose cards are never arranged carries none of
 * it. Importing it gives every board of this tier `arrange()`.
 */
import { HelixHeadlessCanvas } from '../root/canvas-root.js'
import { addArrange } from './canvas-arrange.js'

addArrange(HelixHeadlessCanvas)

export type { CanvasArrangeOptions } from './arrangement.js'
export { addArrange } from './canvas-arrange.js'
