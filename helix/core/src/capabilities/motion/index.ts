/**
 * The motion capability: the implementation a host calls, and its setter.
 *
 * **The server's until a platform sets its own.** The server's draws nothing,
 * and each glide arrives at once, so the slot is safe to call anywhere, and no
 * platform's code reaches a bundle that does not set it: the web's and the
 * native adapter's implementations are imported only where they are set.
 */
import type { Motion } from './contract.generated.js'
import { serverMotion } from './server.js'

let current: Motion<unknown> = serverMotion

/** The implementation in use. */
export const motion = (): Motion<unknown> => current

/**
 * Replaces the implementation in use, as an adapter does once at its start and
 * an app does to take over.
 *
 * **The slot forgets the node type.** A host and the implementation it set
 * agree on it by platform: an element on the web.
 */
export const setMotion = <N>(next: Motion<N>): void => {
  current = next as Motion<unknown>
}

export type { Motion } from './contract.generated.js'
