/**
 * The keys capability: the implementation a host calls, and its setter.
 *
 * **The server's until a platform sets its own.** The server's hears nothing,
 * so the slot is safe to call anywhere, and no platform's code reaches a
 * bundle that does not set it: the web's and the native adapter's
 * implementations are imported only where they are set.
 *
 * **The slot holds the contract over `unknown`**, since each platform's
 * implementation takes its own handle for a part: an element on the web. A
 * host hands it the parts its platform draws.
 */
import type { Keys } from './contract.generated.js'
import { serverKeys } from './server.js'

let current: Keys<unknown> = serverKeys

/** The implementation in use. */
export const keys = (): Keys<unknown> => current

/**
 * Replaces the implementation in use, as an adapter does once at its start and
 * an app does to take over. Generic, so an implementation that takes one
 * platform's parts can be set.
 */
export const setKeys = <N>(next: Keys<N>): void => {
  current = next as Keys<unknown>
}

export type { Keys } from './contract.generated.js'
