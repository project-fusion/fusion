/**
 * Whether the line of text an element sits on runs right to left.
 *
 * **The computed `direction`, not `:dir()` and not the `dir` attribute.** The
 * three part only where a sheet sets `direction` without an attribute, and
 * there the row on screen is laid out by `direction`: a flex row and a grid
 * both follow it. `inlineStep` makes that argument in full, and it is the same
 * question in every caller here, which is why there is one answer to it.
 *
 * **Guarded, because a server shim need not have `getComputedStyle`.** Most
 * callers reach this from a pointer handler and so only ever in a browser, but
 * `ScatterChart` asks inside `renderTooltip`, one early return from the render
 * path. Without the function there is no layout to read, so the answer is the
 * direction a document has before anything says otherwise.
 *
 * Asked at the moment it is needed rather than held, so a page that changes its
 * direction is answered in the new one without anything having to watch it.
 */
export const isRtl = (element: Element): boolean =>
  typeof getComputedStyle === 'function' && getComputedStyle(element).direction === 'rtl'
