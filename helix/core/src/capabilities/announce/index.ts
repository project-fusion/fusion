/**
 * The announce capability: the implementation a host calls, and its setter.
 *
 * **The server's until a platform sets its own.** The server's says nothing,
 * so the slot is safe to call anywhere, and no platform's code reaches a
 * bundle that does not set it: the web's and the native adapter's
 * implementations are imported only where they are set.
 */
import type { Announce } from './contract.generated.js'
import { serverAnnounce } from './server.js'

let current: Announce = serverAnnounce

/** The implementation in use. */
export const announce = (): Announce => current

/** Replaces the implementation in use, as an adapter does once at its start and an app does to take over. */
export const setAnnounce = (next: Announce): void => {
  current = next
}

export type { Announce } from './contract.generated.js'
