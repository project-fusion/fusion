/**
 * The sandbox: a preview that runs what it is given, and the panes around it.
 *
 * The editor is deliberately absent. It is `@fusion.dev/helix-sandbox`, a
 * package of its own, because it carries CodeMirror: 6 MB installed with its
 * grammars, measured October 10, 2026, and a `dependencies` entry is paid at
 * install time by every consumer whether or not they import it, which is the
 * one cost a subpath export cannot avoid. Its pane takes an editor by slot, so
 * bringing one is a choice, and this works without one.
 *
 * What makes this a sandbox rather than a layout is here: `Sandbox.Preview`
 * hardcodes `sandbox="allow-scripts allow-forms"` on its frame and never
 * `allow-same-origin`, which is the pairing that would undo it.
 */
export {
  isRender,
  LAYOUT_RULES,
  loggedText,
  type ServePreviewOptions,
  servePreview,
  withoutStylesheets,
} from './frame.js'
export * from './preview/sandbox-preview.js'
export type { PreviewFetch, PreviewFetched } from './relay.js'
export * from './root/sandbox-root.js'
export { type ManifestLike, manifestWords } from './source/editing.js'
export * from './source/sandbox-source.js'
export * from './status-bar/sandbox-status-bar.js'
export * from './terminal/sandbox-terminal.js'
export type { SandboxToken, SandboxTokenizer } from './tokens.js'
export * from './toolbar/sandbox-toolbar.js'
