import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessEditor } from '@fusion.dev/helix-headless/editor'
import type { CSSResultGroup } from 'lit'
import { styles as fieldStyles } from '../../shared/field/field.css.js'
import { styles as fieldFrameStyles } from '../../shared/field/field-frame.css.js'
import { styles as fieldStackedStyles } from '../../shared/field/field-stacked.css.js'
import { styles } from './editor-root.css.js'

/**
 * @summary A field for code or plain text, drawn by a code editor you connect.
 *
 * @description
 * The frame is a field's, the same box, edge and focus ring as `Textarea`, in
 * the code face, `rows` lines tall without an engine and `--editor-block-size`
 * tall with one. An engine brings its own drawing inside the frame:
 * `@fusion.dev/helix-editor` themes CodeMirror's gutter, caret, selection and
 * syntax from your tokens. The list of problems is drawn under the frame in
 * each problem's tone.
 *
 * @since 0.215.0
 * @status experimental
 * @category inputs
 * @aliases Code editor, Code input, CodeMirror, Monaco
 * @documentation https://fusion.dev/helix/components/editor
 *
 * @cssproperty --editor-background-color - The frame's fill. Defaults to `well`.
 * @cssproperty --editor-block-size - How tall the frame is while an engine draws it. Defaults to 16rem.
 * @cssproperty --editor-font-size - The code's size. Defaults to `text-sm`.
 */
@customElement('helix-editor')
export class HelixEditor extends HelixHeadlessEditor {
  static override styles: CSSResultGroup = [
    fieldStyles,
    fieldFrameStyles,
    fieldStackedStyles,
    styles,
  ]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-editor': HelixEditor
  }
}
