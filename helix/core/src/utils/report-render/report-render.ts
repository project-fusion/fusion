/**
 * Where an element's first update is timed, for whoever is measuring what the
 * components cost.
 *
 * **One slot on `globalThis`, under a registered symbol, and empty by
 * default**, as for usage: `@fusion.dev/helix-diagnostics` fills it where a
 * project asked for performance. With nothing in the slot, an element pays one
 * property read before its first update, and takes no time.
 *
 * **The element's own update, from the start of its first update to the end
 * of it**: `willUpdate`, the render, the commit to the DOM, and the hooks
 * after. Timed from its connection, a measure would also count the time it
 * waited behind every element connected before it, so the last of a hundred
 * elements on a page would read as the slowest.
 */

import { callListener } from '../call-listener/call-listener.js'

/** The key the listener is kept under. `@fusion.dev/helix-diagnostics` names the same string. */
export const RENDER_SLOT = Symbol.for('fusion.dev/helix/render')

/** Whether anything is measuring, read before each first update. */
export const measuring = (): boolean =>
  typeof (globalThis as Record<symbol, unknown>)[RENDER_SLOT] === 'function'

/**
 * Tells the listener, where there is one, how long `element`'s first update
 * took: from `start`, on the `performance.now()` clock, for `duration`
 * milliseconds.
 *
 * **A listener that throws never breaks the element.** The error is printed
 * once.
 */
export const reportRender = (element: HTMLElement, start: number, duration: number): void => {
  callListener(RENDER_SLOT, 'render', 'the element rendered as usual', element, { duration, start })
}
