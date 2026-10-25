/**
 * The clipboard capability: the implementation a host calls, and its setter.
 *
 * **The server's until a platform sets its own.** The server's writes
 * nothing, so the slot is safe to call anywhere, and no platform's code
 * reaches a bundle that does not set it: the web's and the native adapter's
 * implementations are imported only where they are set.
 */
import type { Clipboard } from './contract.generated.js'
import { serverClipboard } from './server.js'

let current: Clipboard = serverClipboard

/** The implementation in use. */
export const clipboard = (): Clipboard => current

/** Replaces the implementation in use, as an adapter does once at its start and an app does to take over. */
export const setClipboard = (next: Clipboard): void => {
  current = next
}

export type { Clipboard } from './contract.generated.js'
