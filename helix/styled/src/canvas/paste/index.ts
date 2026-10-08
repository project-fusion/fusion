/*
 * Copying and pasting a board's cards as JSON Canvas:
 * `@fusion.dev/helix/canvas/paste`.
 *
 * Its own entry, so a board that never copies or pastes carries none of it.
 * Importing it gives every board Control or Command with C and V, and
 * `paste()`, which draw nothing of their own, so the headless tier's entry
 * serves both.
 */
import '@fusion.dev/helix-headless/canvas/paste'
import '../root/canvas-root.js'

export { addPaste } from '@fusion.dev/helix-headless/canvas/paste'
