/**
 * The haptics capability: the implementation a host calls, and its setter.
 *
 * **The server's until a platform sets its own.** The server's plays nothing,
 * so the slot is safe to call anywhere, and no platform's code reaches a
 * bundle that does not set it: the web's and the native adapter's
 * implementations are imported only where they are set.
 */
import type { Haptics } from './contract.generated.js'
import { serverHaptics } from './server.js'

let current: Haptics = serverHaptics

/** The implementation in use. */
export const haptics = (): Haptics => current

/** Replaces the implementation in use, as an adapter does once at its start and an app does to take over. */
export const setHaptics = (next: Haptics): void => {
  current = next
}

export type { Haptics } from './contract.generated.js'
