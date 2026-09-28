/** Where the site serves MapLibre's worker, which `scripts/copy-maplibre.mjs` puts there. */
export const MAPLIBRE_WORKER = '/maplibre/maplibre-gl-worker.mjs'

let loading: Promise<typeof import('maplibre-gl')> | undefined

/**
 * MapLibre, loaded once and only when a map is about to be drawn, and told
 * where its worker is before it draws one.
 *
 * MapLibre 6 ships as modules only, so it is its namespace that is loaded,
 * not a default export, and its worker is a file of its own, which a bundled
 * page has to point it at: Next's bundler emits the worker without the shared
 * module it imports, so the site serves both from `public/maplibre/`.
 */
export const loadMapLibre = (): Promise<typeof import('maplibre-gl')> => {
  loading ??= import('maplibre-gl').then((maplibregl) => {
    maplibregl.setWorkerUrl(MAPLIBRE_WORKER)
    return maplibregl
  })
  return loading
}
