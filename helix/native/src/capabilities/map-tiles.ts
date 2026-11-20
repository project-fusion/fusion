/**
 * How a phone's still map asks for its vector tiles and their TileJSON,
 * where MapLibre Native is not in the app: the platform's `fetch` by
 * default.
 *
 * **An app or a test without the network sets none**, with
 * `setMapTileFetch(undefined)`, and the still picture then draws the land's
 * color under the frame's own shapes, as it does while the tiles load.
 */

/** What the still picture asks a tile or a TileJSON with. */
export type MapTileFetch = (
  url: string,
  init: { readonly signal: AbortSignal },
) => Promise<Response>

const platform: MapTileFetch | undefined =
  typeof globalThis.fetch === 'function'
    ? (url, init) => globalThis.fetch(url, init as RequestInit)
    : undefined

let asked: MapTileFetch | undefined = platform

/** Sets what the tiles are asked with, or no network at all with `undefined`. */
export const setMapTileFetch = (next: MapTileFetch | undefined): void => {
  asked = next
}

/** What the tiles are asked with, where anything is. */
export const mapTileFetch = (): MapTileFetch | undefined => asked
