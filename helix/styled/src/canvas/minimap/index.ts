/*
 * The minimap of a board: `@fusion.dev/helix/canvas/minimap`.
 *
 * Its own entry, so a board without one carries none of it. Importing it
 * gives every board the minimap, where `controls` names `minimap`, and the
 * sheet that draws it.
 */
import { addFeature } from '@fusion.dev/helix-core'
import { HelixCanvas } from '../root/canvas-root.js'
import { drawStyledMinimap } from './canvas-minimap.js'

addFeature(HelixCanvas, { drawMinimap: drawStyledMinimap })

export { drawMinimap } from '@fusion.dev/helix-headless/canvas/minimap'
