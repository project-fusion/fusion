/**
 * A stylesheet beside an example, for the two things that import one.
 *
 * An example imports its own for the side effect, `import './glass.css'`,
 * which is what the sandbox and the site do with it; a spec imports one as
 * text, `with { type: 'text' }`, to mount it beside the example the way the
 * sandbox does. `bun-types` declares `.html` and not `.css`, and without this
 * each import is TS2882 for a file that is not a module and never will be.
 *
 * **The wildcard cannot be narrowed, so the scope is which projects see the
 * file.** `declare module './*.css'` is refused outright, TS2436, and a bare
 * `*.css` is the only form the language offers. Under `src` it is in the
 * sources project, where the specs are, and `tsconfig.examples.json` names it
 * for the examples. Not in `types/`, which `files` publishes: a
 * `declare module '*.css'` in a consumer's `node_modules` would satisfy their
 * own stylesheet imports and mask a missing declaration of their own. Verified
 * against a packed tarball, which is how the first attempt at this, in
 * `types/`, was caught.
 *
 * **Ambient, so this file must stay free of imports.** One `import` makes it a
 * module and the declaration stops applying to anything, which reads as a
 * hundred "cannot find module './x.css'" errors rather than as a mistake here.
 */
declare module '*.css' {
  const text: string
  export default text
}
