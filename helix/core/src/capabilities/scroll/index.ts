/**
 * The scroll capability: the implementation a host calls, and its setter.
 *
 * **The server's until a platform sets its own.** The server's scrolls nothing
 * and holds nothing, so the slot is safe to call anywhere, and no platform's
 * code reaches a bundle that does not set it: the web's and the native
 * adapter's implementations are imported only where they are set.
 */
import type { Scroll } from './contract.generated.js'
import { serverScroll } from './server.js'

let current: Scroll<unknown> = serverScroll

/** The implementation in use. */
export const scroll = (): Scroll<unknown> => current

/**
 * Replaces the implementation in use, as an adapter does once at its start and
 * an app does to take over.
 *
 * **The slot forgets the node type.** A host and the implementation it set
 * agree on it by platform: an element on the web.
 */
export const setScroll = <N>(next: Scroll<N>): void => {
  current = next as Scroll<unknown>
}

export type { Scroll } from './contract.generated.js'
export { type ScrollLengths, scrolledAt } from './ends.js'
