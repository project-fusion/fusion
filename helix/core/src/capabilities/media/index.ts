/**
 * The media capability: the implementation a host calls, and its setter.
 *
 * **The server's until a platform sets its own.** The server's plays nothing,
 * so the slot is safe to call anywhere, and no platform's code reaches a
 * bundle that does not set it: the web's and the native adapter's
 * implementations are imported only where they are set.
 */
import type { Media } from './contract.generated.js'
import { serverMedia } from './server.js'

let current: Media<unknown> = serverMedia

/** The implementation in use. */
export const media = (): Media<unknown> => current

/**
 * Replaces the implementation in use, as an adapter does once at its start and
 * an app does to take over.
 *
 * **The slot forgets the node type.** A host and the implementation it set
 * agree on it by platform: a media element on the web, and a player and its
 * view on a phone.
 */
export const setMedia = <N>(next: Media<N>): void => {
  current = next as Media<unknown>
}

export type { Media } from './contract.generated.js'
export { STILL_PLAYBACK } from './server.js'
