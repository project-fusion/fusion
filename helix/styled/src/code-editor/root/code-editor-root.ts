import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessCodeEditor } from '@fusion.dev/helix-headless/code-editor'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles as fieldStyles } from '../../shared/field/field.css.js'
import { styles as glyphStyles } from '../../shared/glyph/glyph.css.js'
import { styles } from './code-editor-root.css.js'
import '../../button/index.js'
import '../../find/index.js'
import '../../icon-button/index.js'
import '../../toolbar/index.js'

/**
 * @summary An editor for a file of code, drawn by a code editor you connect.
 *
 * @description
 * Drawn as Terminal and Code Block are: the code on the page's ground, with a
 * header, a find bar and a status line each a strip on the raised surface,
 * one frame around them. It is 24rem tall unless `fill` is set or
 * `--code-editor-block-size` says otherwise. An engine draws inside it:
 * `@fusion.dev/helix-editor` themes CodeMirror's gutter, caret, selection and
 * syntax from your tokens, and draws a problem's line number in its tone.
 *
 * Set `fill` for an editor that fills a pane, such as one side of a split
 * view.
 *
 * @since 0.216.0
 * @status experimental
 * @category inputs
 * @aliases Code editor, CodeMirror, File editor, IDE, Monaco
 * @documentation https://fusion.dev/helix/components/code-editor
 *
 * @cssproperty --code-editor-background-color - The ground the code is drawn on. Defaults to the page's background.
 * @cssproperty --code-editor-block-size - The frame's height, as a length: 24rem unless set. Ignored with `fill`, where the container decides it.
 * @cssproperty --code-editor-border-color - The frame's edge and the lines between its strips.
 * @cssproperty --code-editor-font-size - The code's size. Defaults to `text-sm`.
 * @cssproperty --code-editor-header-background-color - The fill of the header, the find bar, and the status line.
 * @cssproperty --code-editor-radius - The frame's corner radius.
 */
@customElement('helix-code-editor')
export class HelixCodeEditor extends HelixHeadlessCodeEditor {
  static override tier = 'helix-'

  /**
   * Covers the container instead of taking a height of its own, for an
   * editor that fills a pane. The container needs a position, such as
   * `position: relative`.
   */
  @property({ reflect: true, type: Boolean })
  fill = false

  /**
   * How the frame stands off the page. Unset, it is outlined. `plain` draws
   * no edge or corners, for a pane that draws its own.
   */
  @property({ reflect: true })
  separation?: 'outlined' | 'plain'

  static override styles: CSSResultGroup = [fieldStyles, glyphStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-code-editor': HelixCodeEditor
  }
}
