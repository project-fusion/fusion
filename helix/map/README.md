# @fusion.dev/helix-map

Connects the Helix `Map` frame to whatever draws the map: MapLibre, Leaflet, or
a driver of your own, with a style made from your tokens.

```sh
bun add @fusion.dev/helix @fusion.dev/helix-map maplibre-gl
```

**The guide is [Maps](https://fusion.dev/helix/docs/maps)**: connecting a
renderer, the style, markers, clusters, routes, a live position, points, layers
such as 3D buildings, terrain, and weather radar, the keyboard, and writing a
driver. The elements themselves are on the
[Map reference](https://fusion.dev/helix/components/map).

```js
import { colorsReady, connectMap } from '@fusion.dev/helix-map'
import { followTheme, mapLibreDriver, mapLibreStyle } from '@fusion.dev/helix-map/maplibre'

const frame = document.querySelector('helix-map')
const style = (colors) => mapLibreStyle(colors)
const map = new maplibregl.Map({
  attributionControl: false,
  container: 'map',
  style: style(await colorsReady(frame)),
})

const connection = connectMap(frame, mapLibreDriver(map))
followTheme(map, frame, style)

// Later, when the map goes away:
connection.disconnect()
```

## What it exports

| Import | What |
|---|---|
| `@fusion.dev/helix-map` | `connectMap`, `colorsReady`, `mapColorsFrom`, `watchTheme`, `motionOf`, `distancesAlong`, `pointsFrom`, and the `MapDriver` type |
| `@fusion.dev/helix-map/maplibre` | `mapLibreDriver(map)`, `mapLibreStyle(colors, options)`, `followTheme(map, element, style)` |
| `@fusion.dev/helix-map/leaflet` | `leafletDriver(map, L)` |

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

The specs drive stand-ins for each renderer. What they cannot show, that the
real libraries move the way the stand-ins are told, was checked against
MapLibre 5.24 and Leaflet 1.9.4 in Chromium on September 25, 2026.

MIT
