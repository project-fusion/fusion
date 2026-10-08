/*
 * The compass of a map, and the pan and rotate buttons around it:
 * `@fusion.dev/helix-headless/map/compass`.
 *
 * Its own entry, so a map without a compass carries none of it. Importing it
 * gives every map of this tier the compass its `controls` names, as they do
 * by default.
 */
import { addFeature } from '@fusion.dev/helix-core'
import { HelixHeadlessMap } from '../root/map-root.js'
import { drawCompass } from './map-compass.js'

addFeature(HelixHeadlessMap, { drawCompass })

export { drawCompass } from './map-compass.js'
