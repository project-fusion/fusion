/**
 * The measure capability: the implementation a host calls, and its setter.
 *
 * **The server's until a platform sets its own.** The server's has no box and
 * hears no change, so the slot is safe to call anywhere, and no platform's
 * code reaches a bundle that does not set it: the web's and the native
 * adapter's implementations are imported only where they are set.
 */
import type { Measure } from './contract.generated.js'
import { serverMeasure } from './server.js'

let current: Measure<unknown> = serverMeasure

/** The implementation in use. */
export const measure = (): Measure<unknown> => current

/**
 * Replaces the implementation in use, as an adapter does once at its start and
 * an app does to take over.
 *
 * **The slot forgets the node type.** A host and the implementation it set
 * agree on it by platform: an element on the web.
 */
export const setMeasure = <N>(next: Measure<N>): void => {
  current = next as Measure<unknown>
}

export type { Measure } from './contract.generated.js'
