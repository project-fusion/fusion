/**
 * MapLibre for the sandbox frame, as one classic script.
 *
 * The frame has an opaque origin, where only a classic script loads from the
 * site, and MapLibre 6 ships as modules. So it is bundled here into one
 * script that puts it where the map chunk reads it, `globalThis.maplibregl`,
 * the global MapLibre 5's own build set.
 *
 * **Its worker is carried inside, as MapLibre 5's was.** MapLibre 6 runs its
 * worker from a module file that imports another, and an opaque origin can
 * start neither: a worker from the site's URL is refused as cross-origin,
 * and one from a `blob:` URL cannot import what the document made. So
 * `build-frame.mjs` bundles the worker and its shared module into one classic
 * script, `__MAPLIBRE_WORKER__`, and the frame starts it from a `blob:` URL,
 * the one worker such a document may start, when MapLibre asks for its own.
 */
import * as maplibregl from 'maplibre-gl'

declare const __MAPLIBRE_WORKER__: string

/** The worker MapLibre is told of, which the frame answers with the one it carries. */
const asked = new URL('/maplibre/maplibre-gl-worker.mjs', location.href).href

/* **Swapped at the constructor**, since MapLibre decides how to start its
   worker by comparing the URL with `location.origin`, which a sandboxed
   document still reports as the site's: it would start this one directly,
   as a module, and the browser would refuse it. */
const carried = URL.createObjectURL(new Blob([__MAPLIBRE_WORKER__], { type: 'text/javascript' }))
const Native = globalThis.Worker
globalThis.Worker = class extends Native {
  constructor(url: string | URL, options?: WorkerOptions) {
    const ours = String(url) === asked
    super(ours ? carried : url, ours ? undefined : options)
  }
}

maplibregl.setWorkerUrl(asked)
;(globalThis as { maplibregl?: typeof maplibregl }).maplibregl = maplibregl
