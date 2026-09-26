import { expect, test } from 'bun:test'
import type * as L from 'leaflet'
import type { Map as Leaflet } from 'leaflet'
import type { Map as MapLibre } from 'maplibre-gl'
import { leafletDriver } from './leaflet/index.js'
import { mapLibreDriver } from './maplibre/index.js'

/* The drivers type the map they take by what they call on it, so this package
   imports no renderer. These two functions are what hold that shape to the
   real ones: if either library renames what a driver calls, the typecheck
   fails here rather than at a page. */
const fits = {
  leaflet: (map: Leaflet, shapes: typeof L) => leafletDriver(map, shapes),
  maplibre: (map: MapLibre) => mapLibreDriver(map),
}

test('the real maps fit the drivers', () => {
  expect(Object.keys(fits)).toEqual(['leaflet', 'maplibre'])
})
