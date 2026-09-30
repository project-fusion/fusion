/**
 * Where the site serves a MapLibre version's worker, which
 * `scripts/copy-maplibre.mjs` puts there.
 *
 * **In a folder named for the version**, so the worker a page starts is the
 * one its MapLibre was built with: the main module is a hashed chunk from the
 * page's own deploy, and a fixed path served the newest deploy's worker to a
 * tab opened before an upgrade.
 */
export const workerOf = (version: string): string => `/maplibre/${version}/maplibre-gl-worker.mjs`

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
  loading ??= import('maplibre-gl')
    .then((maplibregl) => {
      maplibregl.setWorkerUrl(workerOf(maplibregl.getVersion()))
      return maplibregl
    })
    .catch((error: unknown) => {
      /* **Forgotten, so the next map asks again.** Kept, one chunk that failed
         to load, on a bad network or across a deploy, left every map on the
         site empty for the rest of the visit. */
      loading = undefined
      throw error
    })
  return loading
}
