import { adoptSheet } from '@fusion.dev/helix-core'
import type { HelixHeadlessMap } from '@fusion.dev/helix-headless/map'
import { drawLayersMenu } from '@fusion.dev/helix-headless/map/layers'
import type { TemplateResult } from 'lit'
import { styles } from './map-layers.css.js'

/**
 * The layers menu as the styled tier draws it: the headless tier's, with the
 * sheet that draws it adopted into the map after the map's own.
 */
export const drawStyledLayersMenu = (map: HelixHeadlessMap): TemplateResult => {
  adoptSheet(map, styles)
  return drawLayersMenu(map)
}
