/**
 * The open-link capability: the implementation a host calls, and its setter.
 *
 * **The server's until a platform sets its own.** The server's follows
 * nothing, so the slot is safe to call anywhere, and no platform's code
 * reaches a bundle that does not set it: the web's and the native adapter's
 * implementations are imported only where they are set.
 */
import type { OpenLink } from './contract.generated.js'
import { serverOpenLink } from './server.js'

let current: OpenLink = serverOpenLink

/** The implementation in use. */
export const openLink = (): OpenLink => current

/** Replaces the implementation in use, as an adapter does once at its start and an app does to take over. */
export const setOpenLink = (next: OpenLink): void => {
  current = next
}

export type { OpenLink } from './contract.generated.js'
