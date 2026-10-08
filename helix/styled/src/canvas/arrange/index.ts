/*
 * Arranging a board's cards: `@fusion.dev/helix/canvas/arrange`.
 *
 * Its own entry, so a board whose cards are never arranged carries none of
 * it. Importing it gives every board `arrange()`, which draws nothing of its
 * own, so the headless tier's entry serves both.
 */
import '@fusion.dev/helix-headless/canvas/arrange'
import '../index.js'

export { addArrange, type CanvasArrangeOptions } from '@fusion.dev/helix-headless/canvas/arrange'
