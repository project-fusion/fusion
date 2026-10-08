/*
 * The minimap of a board: `@fusion.dev/helix-headless/canvas/minimap`.
 *
 * Its own entry, so a board without one carries none of it. Importing it
 * gives every board of this tier the minimap, where `controls` names
 * `minimap`.
 */
import { addFeature } from '@fusion.dev/helix-core'
import { HelixHeadlessCanvas } from '../root/canvas-root.js'
import { drawMinimap } from './canvas-minimap.js'

addFeature(HelixHeadlessCanvas, { drawMinimap })

export { drawMinimap } from './canvas-minimap.js'
