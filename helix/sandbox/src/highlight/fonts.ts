import type { Extension } from '@codemirror/state'
import { type EditorView, ViewPlugin } from '@codemirror/view'

/**
 * A CodeMirror editor measured again each time a face finishes loading.
 *
 * **CodeMirror measures its lines once more when `document.fonts.ready`
 * resolves, and that can be before the code face has started loading**: the
 * face is asked for when the editor first draws text in it, after the promise
 * has settled. The lines were then drawn in the code face while the gutter kept
 * the heights measured in the fallback, so the line numbers drifted from their
 * lines: a picture of the Button page at 390 on November 17, 2026 caught the
 * fourth number about half a line above its line. A face that arrives changes the content's
 * height, and CodeMirror measures again when asked, so it is asked.
 *
 * Shared by the Sandbox's editor and the Code Editor, which each build their
 * own view.
 */
export const remeasureOnFonts: Extension = ViewPlugin.fromClass(
  class {
    private readonly fonts: FontFaceSet | undefined

    private readonly view: EditorView

    constructor(view: EditorView) {
      this.view = view
      this.fonts = view.dom.ownerDocument.fonts
      this.fonts?.addEventListener('loadingdone', this.measure)
    }

    destroy(): void {
      this.fonts?.removeEventListener('loadingdone', this.measure)
    }

    private readonly measure = (): void => {
      this.view.requestMeasure()
    }
  },
)
