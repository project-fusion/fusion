/**
 * The files capability: the implementation a host calls, and its setter.
 *
 * **The server's until a platform sets its own.** The server's picks and
 * saves nothing, so the slot is safe to call anywhere, and no platform's code
 * reaches a bundle that does not set it: the web's and the native adapter's
 * implementations are imported only where they are set.
 */
import type { Files } from './contract.generated.js'
import { serverFiles } from './server.js'

let current: Files = serverFiles

/** The implementation in use. */
export const files = (): Files => current

/** Replaces the implementation in use, as an adapter does once at its start and an app does to take over. */
export const setFiles = (next: Files): void => {
  current = next
}

export type { Files } from './contract.generated.js'
