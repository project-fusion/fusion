// Ambient declarations for the example files, which no other project claims.
//
// **A stylesheet import is a side effect and TypeScript wants a module for it.**
// Every example needing its own CSS writes `import './glass.css'`, which is what
// the sandbox and the site both do with it, and without this each one is
// `TS2882` for a file that is not a module and never will be.
//
// **Outside `types/`, which is published.** `files` carries `types`, so a
// declaration put there ships: `declare module '*.css'` in a consumer's
// `node_modules` would silently satisfy their own stylesheet imports and mask a
// missing declaration of their own. A dot directory at the package root is
// outside `files`, the way `.preview` already is.
declare module '*.css' {
  const sheet: string
  export default sheet
}
