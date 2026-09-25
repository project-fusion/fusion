# @fusion.dev/helix-map

Connects the Helix `Map` frame to whatever draws the map: MapLibre, Leaflet, or
a driver of your own. **Private for now**: it publishes once the registry has
seen it, which [`.github/RELEASING.md`](../../.github/RELEASING.md#a-new-package)
describes.

```js
import { connectMap } from '@fusion.dev/helix-map'
import { mapLibreDriver } from '@fusion.dev/helix-map/maplibre'

const map = new maplibregl.Map({ container, style, attributionControl: false })
const connection = connectMap(document.querySelector('helix-map'), mapLibreDriver(map))

// Later, when the map goes away:
connection.disconnect()
```

The frame asks and never moves anything: `helix-map-pan` by a direction in
reading order and a fraction of the viewport, `helix-map-zoom` by a direction.
**`connectMap` answers for every renderer at once**, so a driver is the part
that differs and nothing else:

- a pan in pixels on screen, with `start` and `end` resolved by the frame's
  direction, so a right-to-left page moves the right way without a driver
  knowing it is one;
- no motion where the reader asked for less;
- **one tab stop and one set of keys**: the renderer's keyboard handler off and
  its canvas out of the tab order, so a reader meets the frame's named region
  rather than an unnamed canvas beside it that answers the arrows differently;
- **one set of zoom buttons**: the renderer's own off while the frame draws its
  own, which Leaflet adds by default;
- **the credit in the frame's `attribution` slot, as text and links**, kept
  current as sources change. A renderer's credit is markup from whoever wrote
  the style, so it is read for its words and its `http` links and never set as
  HTML. A page that slotted its own credit keeps it.

`disconnect()` puts every one of them back.

| Option | Default | What else it takes |
|---|---|---|
| `credit` | `true` | `false` leaves the slot to the page |
| `keyboard` | `'frame'` | `'renderer'` keeps the renderer's keys and tab stop, for a 3D view that wants its rotate and pitch |

## Drivers

| Import | Renderer |
|---|---|
| `@fusion.dev/helix-map/leaflet` | `leafletDriver(map)`, Leaflet 1.9 |
| `@fusion.dev/helix-map/maplibre` | `mapLibreDriver(map)`, MapLibre GL JS 5 |

**Neither renderer is a dependency.** A driver types the map it takes by the
calls it makes on it, so a page brings whichever version it has, and nobody
installs MapLibre to use Leaflet. A spec holds those shapes to the real `Map`
classes, so a renamed method fails a typecheck here rather than a page.

MapLibre gives no public way to remove the credit control it was made with, so
its driver hides it while connected; make the map with
`attributionControl: false` and there is nothing to hide.

A driver of your own is an object with `panBy(x, y, animate)` in pixels and
`zoomBy(direction, animate)`, and optionally `silenceKeyboard`, `focusTarget`,
`replaceZoom` and `credits`: see `MapDriver`.

## Working on it

```sh
bun run --filter @fusion.dev/helix-map build
bun run --filter @fusion.dev/helix-map test
```

The specs drive stand-ins for each renderer. What they cannot show, that the
real libraries move the way the stand-ins are told, was checked against
MapLibre 5.24 and Leaflet 1.9.4 in Chromium on 25 Sep 2026.

MIT
