/**
 * What is left once the sandbox itself is a design system component.
 *
 * *Moved 19 Aug 2026.* The shell, its panes and the preview now ship from
 * `@helix-io/web` as the `Sandbox` family. They were kept out of the library on
 * the grounds that the previous Helix had shipped a tenth of its bundle as
 * tooling for one internal site, and that reasoning was measured against a
 * barrel that was the only way in. Subpath exports and honest `sideEffects`
 * changed it: a consumer importing `@helix-io/web/card` never sees a sandbox.
 *
 * What could not move is here. The editor carries CodeMirror, about 4 MB
 * installed, and a `dependencies` entry is paid at install time no matter what
 * anyone imports, which is the one cost an export path cannot solve. The spec
 * runner imports and runs this repository's own spec files, so it is internal
 * by definition rather than by weight.
 */
export * from './jsx/html-to-jsx.js'
export * from './jsx/jsx-to-html.js'
