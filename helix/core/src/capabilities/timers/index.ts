/**
 * The timers capability: the implementation a host calls, and its setter.
 *
 * **The server's until a platform sets its own.** The server's clock stands at
 * zero and nothing it starts calls back, so the slot is safe to call anywhere,
 * and no platform's code reaches a bundle that does not set it: the web's and
 * the native adapter's implementations are imported only where they are set.
 */
import type { Timers } from './contract.generated.js'
import { serverTimers } from './server.js'

let current: Timers = serverTimers

/** The implementation in use. */
export const timers = (): Timers => current

/** Replaces the implementation in use, as an adapter does once at its start and an app does to take over. */
export const setTimers = (next: Timers): void => {
  current = next
}

export type { Timers } from './contract.generated.js'
