/*
 * The minimap of a board: `@fusion.dev/helix/canvas/minimap`.
 *
 * Its own entry, so a board without one carries none of it. Importing it
 * gives every board the minimap, where `controls` names `minimap`, and the
 * sheet that draws it.
 */
import { addMinimap } from '@fusion.dev/helix-headless/canvas/minimap'
import { HelixCanvas } from '../root/canvas-root.js'
import { styles } from './canvas-minimap.css.js'

addMinimap(HelixCanvas, styles)

export { addMinimap } from '@fusion.dev/helix-headless/canvas/minimap'
