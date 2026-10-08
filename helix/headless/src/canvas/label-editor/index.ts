/*
 * The field that edits a connection's label or a group's name in place:
 * `@fusion.dev/helix-headless/canvas/label-editor`.
 *
 * Its own entry, so a board whose labels are never edited carries none of
 * it. Importing it gives every board of this tier the field, opened by a
 * double click, F2, or Enter on a group.
 */
import { HelixHeadlessCanvas } from '../root/canvas-root.js'
import { addLabelEditor } from './canvas-label-editor.js'

addLabelEditor(HelixHeadlessCanvas)

export { addLabelEditor } from './canvas-label-editor.js'
