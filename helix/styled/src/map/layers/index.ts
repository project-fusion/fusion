/*
 * The layers button of a map and its menu: `@fusion.dev/helix/map/layers`.
 *
 * Its own entry, so a map without the menu carries none of it. Importing it
 * gives every map the menu, where `controls` names `layers`, and the sheet
 * that draws it.
 */
import { addFeature } from '@fusion.dev/helix-core'
import { HelixMap } from '../root/map-root.js'
import { drawStyledLayersMenu } from './map-layers.js'

addFeature(HelixMap, { drawLayersMenu: drawStyledLayersMenu })

export { drawLayersMenu } from '@fusion.dev/helix-headless/map/layers'
