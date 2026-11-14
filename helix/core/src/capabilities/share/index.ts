/**
 * The share capability: the implementation a host calls, and its setter.
 *
 * **The server's until a platform sets its own.** The server's shares
 * nothing, so the slot is safe to call anywhere, and no platform's code
 * reaches a bundle that does not set it: the web's and the native adapter's
 * implementations are imported only where they are set.
 */
import type { Share } from './contract.generated.js'
import { serverShare } from './server.js'

let current: Share = serverShare

/** The implementation in use. */
export const share = (): Share => current

/** Replaces the implementation in use, as an adapter does once at its start and an app does to take over. */
export const setShare = (next: Share): void => {
  current = next
}

export type { Share } from './contract.generated.js'
