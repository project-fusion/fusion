/**
 * xterm.js's stylesheet, which the browser spec imports as text,
 * `with { type: 'text' }`, to mount beside the terminal the way a page loads
 * it. `bun-types` declares no `.css`, and without this the import is TS2307.
 *
 * Beside the tsconfig that names it rather than under `src`, and not in what
 * `files` publishes, so a consumer's own stylesheet imports are never
 * answered by it. Ambient, so it stays free of imports: one would make it a
 * module, and the declaration would stop applying.
 */
declare module '*.css' {
  const text: string
  export default text
}
