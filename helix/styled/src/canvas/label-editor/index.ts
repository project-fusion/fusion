/*
 * The field that edits a connection's label or a group's name in place:
 * `@fusion.dev/helix/canvas/label-editor`.
 *
 * Its own entry, so a board whose labels are never edited carries none of
 * it. Importing it gives every board the field, opened by a double click,
 * F2, or Enter on a group, and the sheet that draws it.
 */
import { addFeature } from '@fusion.dev/helix-core'
import { openLabelEditor } from '@fusion.dev/helix-headless/canvas/label-editor'
import { HelixCanvas } from '../root/canvas-root.js'
import { drawStyledLabelEditor } from './canvas-label-editor.js'

addFeature(HelixCanvas, { drawLabelEditor: drawStyledLabelEditor, openLabelEditor })

export { drawLabelEditor, openLabelEditor } from '@fusion.dev/helix-headless/canvas/label-editor'
