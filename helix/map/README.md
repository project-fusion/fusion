# @fusion.dev/helix-map

Connects the Helix `Map` frame to whatever draws the map: MapLibre, Leaflet, or
a driver of your own, with a style made from your tokens.

```sh
bun add @fusion.dev/helix @fusion.dev/helix-map maplibre-gl
```

**The guide is [Maps](https://fusion.dev/helix/docs/maps)**: connecting a
renderer, the style, markers, clusters, routes, a live position, points, layers
such as 3D buildings, terrain, and weather radar, a snapshot drawn on the server
for the first paint, the keyboard, and writing a driver. The elements themselves are on the
[Map reference](https://fusion.dev/helix/components/map).

```js
import '@fusion.dev/helix/map'
import 'maplibre-gl/dist/maplibre-gl.css'
import { colorsReady, connectMap } from '@fusion.dev/helix-map'
import { followTheme, mapLibreDriver, mapLibreStyle } from '@fusion.dev/helix-map/maplibre'
import * as maplibregl from 'maplibre-gl'

// MapLibre 6 runs its worker from a file of its own. Point it there once.
maplibregl.setWorkerUrl('/maplibre/maplibre-gl-worker.mjs')

const frame = document.querySelector('helix-map')
const style = (colors) => mapLibreStyle(colors)
const map = new maplibregl.Map({
  attributionControl: false,
  container: 'map',
  style: style(await colorsReady(frame)),
})

const connection = connectMap(frame, mapLibreDriver(map))
connection.fit({ animate: false })
followTheme(map, frame, style)

// Later, when the map goes away:
connection.disconnect()
```

MapLibre 6 runs its worker from two files, `maplibre-gl-worker.mjs` and
`maplibre-gl-shared.mjs`. Serve both from one folder, and pass the worker's
address to `setWorkerUrl` before you create a map, as the guide shows.

**The map's tiles come from OpenFreeMap by default**, and so do its glyphs
where you pass no `font`. OpenFreeMap needs no key. The requests go to its
servers: from your reader's browser for the map, and from your server for
`mapSnapshot`. Pass `tiles` and `glyphs` to `mapLibreStyle`, and `tiles` to
`mapSnapshot`, to use your own servers.

## What it exports

| Import | What |
|---|---|
| `@fusion.dev/helix-map` | `connectMap`, `colorsReady`, `mapColorsFrom`, `mapFontFrom`, `fontReady`, `watchTheme`, `motionOf`, `distancesAlong`, `pointsFrom`, and the `MapDriver` type |
| `@fusion.dev/helix-map/maplibre` | `mapLibreDriver(map)`, `mapLibreStyle(colors, options)`, `followTheme(map, element, style)` |
| `@fusion.dev/helix-map/leaflet` | `leafletDriver(map, L)` |
| `@fusion.dev/helix-map/snapshot` | `mapSnapshot(view, options)`, an SVG of the map drawn on your server to paint before the renderer loads, with the credit its tiles name |

**Neither renderer is a dependency.** A driver types the map it takes by the
calls it makes on it, so a page brings whichever version it has. A spec holds
those shapes to the real `Map` classes, so a renamed method fails a typecheck
here rather than a page.

| `connectMap` option | Default | What else it takes |
|---|---|---|
| `credit` | `true` | `false` leaves the attribution slot to the page |
| `keyboard` | `'frame'` | `'renderer'` keeps the renderer's keys and tab stop, for a 3D view that wants its rotate and pitch |
| `clusterDistance` | `40` | How close, in pixels, two markers' points come before a frame with `cluster` gathers them |
| `clusterZoom` | `true` | `false` leaves a pressed cluster to the page's own `helix-map-cluster` listener |

## Working on it

```sh
bun run --filter @fusion.dev/helix-map build
bun run --filter @fusion.dev/helix-map test
```

The specs drive each driver twice. A stand-in for each renderer records what
the driver asks of it, under `bun test`. The browser specs, run with
`bun run specs:browser map`, connect a frame to the real MapLibre and Leaflet
with a style that loads nothing, press the frame's keys and buttons, and check
that the camera moved and that the frame said so. The guide's own driver, under
"Write a driver", runs in the specs too.

MIT
