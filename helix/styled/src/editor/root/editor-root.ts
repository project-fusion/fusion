import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessEditor } from '@fusion.dev/helix-headless/editor'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles as glyphStyles } from '../../shared/glyph/glyph.css.js'
import { styles } from './editor-root.css.js'
import '../../button/index.js'
import '../../divider/index.js'
import '../../icon-button/index.js'
import '../../menu/index.js'
import '../../toolbar/index.js'

/**
 * @summary A frame around a document that ProseMirror or another editor draws.
 *
 * @description
 * Drawn as Code Editor is: the document on the page's ground, and the toolbar
 * a strip on the raised surface, one frame around them. The strip stays at the
 * top of the page while a long document scrolls under it, and the frame grows
 * with the document from `--editor-min-block-size`. Set `fill` for an editor
 * that fills a pane, where the document scrolls inside the frame.
 *
 * The document's headings, lists, quotes, code, and tables are drawn by the
 * base layer's `data-prose` rules, so it reads as your docs and chat replies
 * do. Write `data-prose` on the document so the base layer draws it before a
 * renderer connects, and `connectEditor` writes it too. Its lines keep to a
 * readable length, `--editor-measure`, centered in a wide frame.
 *
 * @since 0.221.0
 * @status experimental
 * @category editors
 * @aliases Rich text editor, WYSIWYG, Document editor, ProseMirror, Block editor
 * @documentation https://fusion.dev/helix/components/editor
 *
 * @cssproperty --editor-background-color - The ground the document is drawn on. Defaults to the page's background.
 * @cssproperty --editor-border-color - The frame's edge and the line under the toolbar.
 * @cssproperty --editor-header-background-color - The fill of the toolbar's strip.
 * @cssproperty --editor-header-offset - How far below the top of the page the toolbar stays while the document scrolls, such as the height of your own fixed header. `0` unless set.
 * @cssproperty --editor-measure - The longest a line of the document runs, as a length: `72ch` unless set.
 * @cssproperty --editor-min-block-size - The frame's least height, which it grows from with the document: `12rem` unless set. Ignored with `fill`.
 * @cssproperty --editor-padding - The space around the document, inside the frame.
 * @cssproperty --editor-radius - The frame's corner radius.
 */
@customElement('helix-editor')
export class HelixEditor extends HelixHeadlessEditor {
  static override tier = 'helix-'

  /**
   * Covers the container instead of growing with the document, for an editor
   * that fills a pane, such as one side of a split view. The document scrolls
   * inside the frame. The container needs a position, such as
   * `position: relative`.
   */
  @property({ reflect: true, type: Boolean })
  fill = false

  /**
   * How the frame stands off the page. Unset, it is outlined. `plain` draws
   * no edge or corners, for a document that fills a page or a pane of its own.
   */
  @property({ reflect: true })
  separation?: 'outlined' | 'plain'

  /** The block menu's button is drawn as the tools beside it are. */
  protected override get blockEmphasis(): 'ghost' | undefined {
    return 'ghost'
  }

  static override styles: CSSResultGroup = [glyphStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-editor': HelixEditor
  }
}
