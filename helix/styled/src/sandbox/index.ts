/**
 * The sandbox: a preview that runs what it is given, and the panes around it.
 *
 * The editor is deliberately absent and lives on in `@fusion.dev/helix-editor`, because
 * it carries CodeMirror. That is roughly 4 MB installed against a design system
 * of about the same size, and a `dependencies` entry is paid at install time by
 * every consumer whether or not they import it, which is the one cost a subpath
 * export cannot avoid. Its pane takes an editor by slot, so bringing one is a
 * choice rather than a condition of using this.
 *
 * What makes this a sandbox rather than a layout is here: `Sandbox.Preview`
 * hardcodes `sandbox="allow-scripts allow-forms"` on its frame and never
 * `allow-same-origin`, which is the pairing that would undo it.
 */
export * from './preview/sandbox-preview.js'
export * from './root/sandbox-root.js'
export * from './source/sandbox-source.js'
export * from './status-bar/sandbox-status-bar.js'
export * from './terminal/sandbox-terminal.js'
export * from './toolbar/sandbox-toolbar.js'
