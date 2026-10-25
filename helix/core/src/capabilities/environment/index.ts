/**
 * The environment capability: the implementation a host calls, and its setter.
 *
 * **The server's until a platform sets its own.** The server's returns the
 * conditions of a request that states nothing, so the slot is safe to call
 * anywhere, and no platform's code reaches a bundle that does not set it: the
 * web's and the native adapter's implementations are imported only where they
 * are set.
 */
import type { Environment } from './contract.generated.js'
import { serverEnvironment } from './server.js'

let current: Environment = serverEnvironment

/** The implementation in use. */
export const environment = (): Environment => current

/** Replaces the implementation in use, as an adapter does once at its start and an app does to take over. */
export const setEnvironment = (next: Environment): void => {
  current = next
}

export type { Environment } from './contract.generated.js'
export { conditionsMoved, NO_INSETS } from './moved.js'
