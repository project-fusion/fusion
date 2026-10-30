/**
 * The source editor and the code highlighter of the Helix sandbox.
 *
 * Each entry does one thing, and two of them register something:
 *
 * - `./editor` registers `helix-sandbox-editor`, an editable pane of source
 *   with CodeMirror behind it, for `@fusion.dev/helix/sandbox`.
 * - `./code-block` gives every Code Block a highlighter, the grammars below in
 *   the editor's colors.
 * - `./highlight` turns a snippet into highlighted HTML, on a server or in a
 *   page, and registers nothing.
 *
 * This entry registers nothing either. It exports what `./highlight` exports,
 * and the editor's class and events as types, which the framework typings
 * import from here. Importing it loads no editor.
 */
export type {
  CaretDetail,
  HelixBeforeEditEvent,
  HelixCaretEvent,
  HelixEditEvent,
} from '@fusion.dev/helix/sandbox/events'
export * from './highlight/index.js'
export type { EditorLanguage, HelixSandboxEditor } from './sandbox/editor/sandbox-editor.js'
