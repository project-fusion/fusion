/*
 * What the strands events carry: the shape of each one's `detail`.
 *
 * Types only, so this module is empty at runtime.
 */

/** Detail carried by `helix-strands-fallback`. */
export interface StrandsFallbackDetail {
  /**
   * Why the gradient shows: `software` for a renderer that draws on the CPU,
   * `unavailable` for no WebGL or a program the browser refused, and `lost`
   * for a context the browser took back, on a GPU reset or past its limit of
   * about sixteen.
   */
  reason: 'lost' | 'software' | 'unavailable'
}
