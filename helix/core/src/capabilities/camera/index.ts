/**
 * The camera capability: the implementation a host calls, and its setter.
 *
 * **The server's until a platform sets its own.** The server's takes
 * nothing, so the slot is safe to call anywhere, and no platform's code
 * reaches a bundle that does not set it: the web's and the native adapter's
 * implementations are imported only where they are set.
 */
import type { Camera } from './contract.generated.js'
import { serverCamera } from './server.js'

let current: Camera = serverCamera

/** The implementation in use. */
export const camera = (): Camera => current

/** Replaces the implementation in use, as an adapter does once at its start and an app does to take over. */
export const setCamera = (next: Camera): void => {
  current = next
}

export type { Camera } from './contract.generated.js'
