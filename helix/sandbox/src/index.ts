/**
 * What is left once the sandbox itself is a design system component.
 *
 * The shell, its panes and the preview ship from `@fusion.dev/helix` as the
 * `Sandbox` family, subpath exports and honest `sideEffects` meaning a consumer
 * importing `@fusion.dev/helix/card` never sees a sandbox.
 *
 * What could not move is here. The editor carries CodeMirror, about 4 MB
 * installed, and a `dependencies` entry is paid at install time no matter what
 * anyone imports, which is the one cost an export path cannot solve. The spec
 * runner imports and runs this repository's own spec files, so it is internal
 * by definition rather than by weight.
 */
export * from './jsx/jsx-to-html.js'
