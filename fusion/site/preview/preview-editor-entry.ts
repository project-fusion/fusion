/**
 * A live code editor in the preview frame, loaded only when a render carries
 * one: `connectEditor` from `@fusion.dev/helix-editor`, with CodeMirror and
 * its grammars inside it.
 *
 * Bundled to a classic script beside `frame.js` by `build-frame.mjs`, for the
 * reason `preview-terminal-entry.ts` gives, and separate from it because most
 * renders draw no editor and CodeMirror is most of this file's weight.
 */

import { connectEditor } from '@fusion.dev/helix-editor'

window.helixPreviewEditor = {
  mount(root) {
    const stops = [
      ...root.querySelectorAll<HTMLElement & { engine: undefined }>(
        ':is(helix-editor, helix-headless-editor)[data-preview-editor]',
      ),
    ].map((editor) => connectEditor(editor))
    return () => {
      for (const stop of stops) {
        stop()
      }
    }
  },
}
