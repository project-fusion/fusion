/**
 * The renderer capability: the implementation a host calls, and its setter.
 *
 * **The server's until a platform sets its own.** The server's draws
 * nothing, so the slot is safe to call anywhere, and no platform's code
 * reaches a bundle that does not set it: the web's and the native adapter's
 * implementations are imported only where they are set.
 */
import type { Renderer } from './contract.generated.js'
import { serverRenderer } from './server.js'

let current: Renderer = serverRenderer

/** The implementation in use. */
export const renderer = (): Renderer => current

/** Replaces the implementation in use, as an adapter does once at its start and an app does to take over. */
export const setRenderer = (next: Renderer): void => {
  current = next
}

export type { Renderer } from './contract.generated.js'
