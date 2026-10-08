/*
 * Copying and pasting a board's cards as JSON Canvas:
 * `@fusion.dev/helix-headless/canvas/paste`.
 *
 * Its own entry, so a board that never copies or pastes carries none of it.
 * Importing it gives every board of this tier Control or Command with C and
 * V, and `paste()`.
 */
import { HelixHeadlessCanvas } from '../root/canvas-root.js'
import { addPaste } from './canvas-paste.js'

addPaste(HelixHeadlessCanvas)

export { addPaste } from './canvas-paste.js'
