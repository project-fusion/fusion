/*
 * The compass of a map, and the pan and rotate buttons around it:
 * `@fusion.dev/helix/map/compass`.
 *
 * Its own entry, so a map without a compass carries none of it. Importing it
 * gives every map the compass its `controls` names, as they do by default,
 * and the sheet that draws it.
 */
import { addFeature } from '@fusion.dev/helix-core'
import { HelixMap } from '../index.js'
import { drawStyledCompass } from './map-compass.js'

addFeature(HelixMap, { drawCompass: drawStyledCompass })

export { drawCompass } from '@fusion.dev/helix-headless/map/compass'
