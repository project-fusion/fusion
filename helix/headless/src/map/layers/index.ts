/*
 * The layers button of a map and its menu: `@fusion.dev/helix-headless/map/layers`.
 *
 * Its own entry, so a map without the menu carries none of it. Importing it
 * gives every map of this tier the menu, where `controls` names `layers`.
 */
import { HelixHeadlessMap } from '../root/map-root.js'
import { addLayersMenu } from './map-layers.js'

addLayersMenu(HelixHeadlessMap)

export { addLayersMenu } from './map-layers.js'
