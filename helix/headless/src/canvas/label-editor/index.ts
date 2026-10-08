/*
 * The field that edits a connection's label or a group's name in place:
 * `@fusion.dev/helix-headless/canvas/label-editor`.
 *
 * Its own entry, so a board whose labels are never edited carries none of
 * it. Importing it gives every board of this tier the field, opened by a
 * double click, F2, or Enter on a group.
 */
import { addFeature } from '@fusion.dev/helix-core'
import { HelixHeadlessCanvas } from '../index.js'
import { drawLabelEditor, openLabelEditor } from './canvas-label-editor.js'

addFeature(HelixHeadlessCanvas, { drawLabelEditor, openLabelEditor })

export { drawLabelEditor, openLabelEditor } from './canvas-label-editor.js'
