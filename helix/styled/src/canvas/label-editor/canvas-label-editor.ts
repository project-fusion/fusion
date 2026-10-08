import { adoptSheet } from '@fusion.dev/helix-core'
import type { HelixHeadlessCanvas } from '@fusion.dev/helix-headless/canvas'
import { drawLabelEditor } from '@fusion.dev/helix-headless/canvas/label-editor'
import type { nothing, TemplateResult } from 'lit'
import { styles } from './canvas-label-editor.css.js'

/**
 * The field that edits a label as the styled tier draws it: the headless
 * tier's, with the sheet that draws it adopted into the board after the
 * board's own.
 */
export const drawStyledLabelEditor = (
  board: HelixHeadlessCanvas,
  origin: { x: number; y: number },
): TemplateResult | typeof nothing => {
  adoptSheet(board, styles)
  return drawLabelEditor(board, origin)
}
