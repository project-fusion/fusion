/*
 * The layers button of a map and its menu: `@fusion.dev/helix/map/layers`.
 *
 * Its own entry, so a map without the menu carries none of it. Importing it
 * gives every map the menu, where `controls` names `layers`, and the sheet
 * that draws it.
 */
import { addLayersMenu } from '@fusion.dev/helix-headless/map/layers'
import { HelixMap } from '../root/map-root.js'
import { styles } from './map-layers.css.js'

addLayersMenu(HelixMap, styles)

export { addLayersMenu } from '@fusion.dev/helix-headless/map/layers'
