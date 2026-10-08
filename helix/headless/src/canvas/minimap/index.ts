/*
 * The minimap of a board: `@fusion.dev/helix-headless/canvas/minimap`.
 *
 * Its own entry, so a board without one carries none of it. Importing it
 * gives every board of this tier the minimap, where `controls` names
 * `minimap`.
 */
import { HelixHeadlessCanvas } from '../root/canvas-root.js'
import { addMinimap } from './canvas-minimap.js'

addMinimap(HelixHeadlessCanvas)

export { addMinimap } from './canvas-minimap.js'
