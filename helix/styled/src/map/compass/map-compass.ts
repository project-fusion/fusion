import { adoptSheet } from '@fusion.dev/helix-core'
import type { HelixHeadlessMap } from '@fusion.dev/helix-headless/map'
import { drawCompass } from '@fusion.dev/helix-headless/map/compass'
import type { TemplateResult } from 'lit'
import { styles } from './map-compass.css.js'

/**
 * The compass as the styled tier draws it: the headless tier's, with the sheet
 * that draws it adopted into the map after the map's own.
 */
export const drawStyledCompass = (
  map: HelixHeadlessMap,
  pan: boolean,
  rotate: boolean,
): TemplateResult => {
  adoptSheet(map, styles)
  return drawCompass(map, pan, rotate)
}
