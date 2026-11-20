/**
 * How an element that is a toolbar says so in its headless source. Read as
 * syntax, as `tree.ts` says.
 */

/**
 * What a toolbar holds: one tab stop, whose arrow keys move among the
 * controls drawn inside the part whose role is `toolbar`, along the way
 * `orientation` says it runs, coming round from one end to the other unless
 * `stopAtEnds` holds. A toolbar inside another is a group of the outer one, whose
 * keys walk its controls.
 */
export interface Toolbar {
  /**
   * The prop that stops the arrow keys at the first and the last control.
   */
  readonly stopAtEnds?: string
  /**
   * The prop that says which way the toolbar runs, `horizontal` or
   * `vertical`.
   */
  readonly orientation: string
}
