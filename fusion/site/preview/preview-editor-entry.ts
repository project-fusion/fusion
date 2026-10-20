/**
 * A live document in the preview frame, loaded only when a render carries
 * an Editor: `connectEditor` from `@fusion.dev/helix-editor`, with ProseMirror
 * inside it.
 *
 * Bundled to a classic script beside `frame.js` by `build-frame.mjs`, for the
 * reason `preview-terminal-entry.ts` gives, and separate from it because most
 * renders draw no editor.
 */

import { connectEditor, editorPlugins, editorSchema } from '@fusion.dev/helix-editor'
import { DOMParser } from 'prosemirror-model'
import { EditorState } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'

window.helixPreviewEditor = {
  mount(root) {
    const stops = [
      ...root.querySelectorAll<HTMLElement>(
        ':is(helix-editor, helix-headless-editor)[data-preview-editor]',
      ),
    ].flatMap((frame) => {
      /* The document is the frame's one child with no slot of its own. */
      const document = frame.querySelector<HTMLElement>(':scope > :not([slot])')
      if (!document) {
        return []
      }
      const schema = editorSchema()
      const view = new EditorView(
        { mount: document },
        {
          state: EditorState.create({
            doc: DOMParser.fromSchema(schema).parse(document),
            plugins: editorPlugins(schema),
          }),
        },
      )
      const connection = connectEditor(frame, view)
      return [
        () => {
          connection.disconnect()
          view.destroy()
        },
      ]
    })
    return () => {
      for (const stop of stops) {
        stop()
      }
    }
  },
}
