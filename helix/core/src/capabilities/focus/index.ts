/**
 * The focus capability: the implementation a host calls, and its setter.
 *
 * **The server's until a platform sets its own.** The server's moves nothing
 * and finds nothing, so the slot is safe to call anywhere, and no platform's
 * code reaches a bundle that does not set it: the web's and the native
 * adapter's implementations are imported only where they are set.
 */
import type { Focus } from './contract.generated.js'
import { serverFocus } from './server.js'

let current: Focus<unknown> = serverFocus

/** The implementation in use. */
export const focus = (): Focus<unknown> => current

/**
 * Replaces the implementation in use, as an adapter does once at its start and
 * an app does to take over.
 *
 * **The slot forgets the node type.** A host and the implementation it set
 * agree on it by platform: an element on the web.
 */
export const setFocus = <N>(next: Focus<N>): void => {
  current = next as Focus<unknown>
}

export type { Focus } from './contract.generated.js'
