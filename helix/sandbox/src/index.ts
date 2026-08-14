/**
 * The sandbox shell and its panes.
 *
 * The editor is deliberately absent. It is `@helix-io/sandbox/editor`, on its
 * own path, because it carries CodeMirror: roughly 110 KB over the wire where
 * everything else here is a few. A page that shows a sandbox without an
 * editable pane, or registers elements once for a whole site, should not pay
 * for one it never renders.
 */
export * from './sandbox/preview/sandbox-preview.js'
export * from './sandbox/root/sandbox-root.js'
export * from './sandbox/source/sandbox-source.js'
export * from './sandbox/status-bar/sandbox-status-bar.js'
export * from './sandbox/terminal/sandbox-terminal.js'
