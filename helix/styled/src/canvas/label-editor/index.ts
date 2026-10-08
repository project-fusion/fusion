/*
 * The field that edits a connection's label or a group's name in place:
 * `@fusion.dev/helix/canvas/label-editor`.
 *
 * Its own entry, so a board whose labels are never edited carries none of
 * it. Importing it gives every board the field, opened by a double click,
 * F2, or Enter on a group, and the sheet that draws it.
 */
import { addLabelEditor } from '@fusion.dev/helix-headless/canvas/label-editor'
import { HelixCanvas } from '../root/canvas-root.js'
import { styles } from './canvas-label-editor.css.js'

addLabelEditor(HelixCanvas, styles)

export { addLabelEditor } from '@fusion.dev/helix-headless/canvas/label-editor'
