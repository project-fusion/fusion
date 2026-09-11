/**
 * An example's stylesheet, imported as text so a spec can mount it beside the
 * example the way the sandbox does. `bun-types` declares `.html` and not `.css`,
 * and nothing else in this package imports a stylesheet by that extension.
 */
declare module '*.css' {
  const text: string
  export default text
}
