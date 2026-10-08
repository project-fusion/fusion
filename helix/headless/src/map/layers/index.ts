/*
 * The layers button of a map and its menu: `@fusion.dev/helix-headless/map/layers`.
 *
 * Its own entry, so a map without the menu carries none of it. Importing it
 * gives every map of this tier the menu, where `controls` names `layers`.
 */
import { addFeature } from '@fusion.dev/helix-core'
import { HelixHeadlessMap } from '../index.js'
import { drawLayersMenu } from './map-layers.js'

addFeature(HelixHeadlessMap, { drawLayersMenu })

export { drawLayersMenu } from './map-layers.js'
