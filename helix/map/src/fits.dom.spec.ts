import { expect, test } from 'bun:test'
import type * as L from 'leaflet'
import type { Map as Leaflet } from 'leaflet'
import type { Map as MapLibre } from 'maplibre-gl'

/** The drivers, by type only: loading them here would evaluate Lit before a spec registers the DOM. */
type Drivers = typeof import('./leaflet/index.js') & typeof import('./maplibre/index.js')

/* The drivers type the map they take by what they call on it, so this package
   imports no renderer. These two functions are what hold that shape to the
   real ones: if either library renames what a driver calls, the typecheck
   fails here rather than at a page. */
const fits = (drivers: Drivers) => ({
  leaflet: (map: Leaflet, shapes: typeof L) => drivers.leafletDriver(map, shapes),
  maplibre: (map: MapLibre) => drivers.mapLibreDriver(map),
})

test('the real maps fit the drivers', () => {
  expect(typeof fits).toBe('function')
})
