/*
 * The compass of a map, and the pan and rotate buttons around it:
 * `@fusion.dev/helix/map/compass`.
 *
 * Its own entry, so a map without a compass carries none of it. Importing it
 * gives every map the compass its `controls` names, as they do by default,
 * and the sheet that draws it.
 */
import { addCompass } from '@fusion.dev/helix-headless/map/compass'
import { HelixMap } from '../root/map-root.js'
import { styles } from './map-compass.css.js'

addCompass(HelixMap, styles)

export { addCompass } from '@fusion.dev/helix-headless/map/compass'
