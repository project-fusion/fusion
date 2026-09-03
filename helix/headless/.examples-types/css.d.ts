// Ambient declarations for the example files, which no other project claims.
//
// **A stylesheet import is a side effect and TypeScript wants a module for it.**
// Every example needing its own CSS writes `import './glass.css'`, which is what
// the sandbox and the site both do with it, and without this each one is
// `TS2882` for a file that is not a module and never will be.
//
// **The wildcard cannot be narrowed, so the scope is the file's location.**
// `declare module './*.css'` is the obvious way to say "ours only" and
// TypeScript refuses it outright: `TS2436: Ambient module declaration cannot
// specify relative module name`. A bare `*.css` is the only form the language
// offers, so what bounds it is which projects can see it.
//
// This file is in no project but `tsconfig.examples.json`: the package's own
// `tsconfig.json` and `tsconfig.build.json` both compile `src` and neither
// includes this directory, so `*.css` is not declared for the sources. And
// `files` carries `types` but not a dot directory, so it does not ship: a
// `declare module '*.css'` in a consumer's `node_modules` would silently
// satisfy their own stylesheet imports and mask a missing declaration of their
// own. Verified against a packed tarball, which is how the first attempt at
// this, in `types/`, was caught.
declare module '*.css' {
  const sheet: string
  export default sheet
}
