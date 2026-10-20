/**
 * A live code editor in the preview frame, loaded only when a render carries
 * one: `connectCodeEditor` from `@fusion.dev/helix-code-editor`, with CodeMirror and
 * its grammars inside it.
 *
 * Bundled to a classic script beside `frame.js` by `build-frame.mjs`, for the
 * reason `preview-terminal-entry.ts` gives, and separate from it because most
 * renders draw no editor and CodeMirror is most of this file's weight.
 */

import { connectCodeEditor } from '@fusion.dev/helix-code-editor'

window.helixPreviewCodeEditor = {
  mount(root) {
    const stops = [
      ...root.querySelectorAll<HTMLElement & { engine: undefined }>(
        ':is(helix-code-editor, helix-headless-code-editor)[data-preview-code-editor]',
      ),
    ].map((editor) => connectCodeEditor(editor))
    return () => {
      for (const stop of stops) {
        stop()
      }
    }
  },
}
