import { adoptSheet } from '@fusion.dev/helix-core'
import type { HelixHeadlessCanvas } from '@fusion.dev/helix-headless/canvas'
import { drawMinimap } from '@fusion.dev/helix-headless/canvas/minimap'
import type { TemplateResult } from 'lit'
import { styles } from './canvas-minimap.css.js'

/**
 * The minimap as the styled tier draws it: the headless tier's, with the sheet
 * that draws it adopted into the board after the board's own.
 */
export const drawStyledMinimap = (board: HelixHeadlessCanvas): TemplateResult => {
  adoptSheet(board, styles)
  return drawMinimap(board)
}
