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
- **the page's motion rather than the renderer's**: a pan or a zoom takes the
  theme's standard duration and curve, and a trip to a place its slow duration
  and emphasized curve, read off the page each time so a new theme moves the
  next pan; no motion at all where the reader asked for less or the theme's
  durations are zero;
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

## Places on the map

```html
<helix-map label="Deliveries today">
  <div id="map"></div>
  <helix-map-marker label="Depot" lat="37.7955" lng="-122.3937"></helix-map-marker>
  <helix-map-marker label="Mission Dolores" lat="37.7644" lng="-122.427"></helix-map-marker>
</helix-map>
```

A `helix-map-marker` is a named button in the frame, drawn by Helix in the
page's theme rather than by the renderer. **Only the renderer knows where a
place falls on the screen**, so `connectMap` asks the driver to project each
marker and stands it there, again every time the view moves and whenever a
page adds a marker or changes its `lat` or `lng`. A marker the connector has
not placed stays hidden rather than drawn in the corner.

The markers share one tab stop, and the arrow keys walk them in the order they
are written. A marker that takes focus outside the view is brought into it, so
a reader walking the places never lands on one they cannot see. Pressing one
sends `helix-activate` from the frame with its `name`, or its `label` where it
has none, and what happens then is the page's.

## A style in the page's theme

```js
import { mapColorsFrom } from '@fusion.dev/helix-map'
import { mapLibreStyle } from '@fusion.dev/helix-map/maplibre'

const style = mapLibreStyle(mapColorsFrom(frame), { language: 'en' })
```

`mapColorsFrom(element)` reads the page's tokens where the map is and settles
them to colors a style can take; `mapLibreStyle(colors)` writes a MapLibre style
from them, against the OpenMapTiles schema. **The land is `surface`, and
everything else is the land moved toward something**: water toward `info`,
parks toward `success`, the motorways and main roads toward the brand, and the
smaller roads, buildings, borders and labels toward the ink. So one call draws
a light map on a light theme and a dark one on a dark theme, and a new brand
moves the roads with it. Redraw it with `map.setStyle(style, { diff: true })`
when the theme changes.

**Every label clears a contrast target against the land it is haloed in**, 4.5
by default and `contrast` to change it: a label that would fall short is drawn
nearer the ink until it does not, so a theme whose ink is already gray still
gets legible place names, and one that clears it already keeps its place in
the order.

The tiles are OpenFreeMap's until Helix serves its own in the same schema, and
`tiles` and `glyphs` point it at yours. Every style it writes is checked by
MapLibre's own validator.

## Drivers

| Import | Renderer |
|---|---|
| `@fusion.dev/helix-map/leaflet` | `leafletDriver(map)`, Leaflet 1.9 |
| `@fusion.dev/helix-map/maplibre` | `mapLibreDriver(map)`, MapLibre GL JS 5 |

**Neither renderer is a dependency.** A driver types the map it takes by the
calls it makes on it, so a page brings whichever version it has, and nobody
installs MapLibre to use Leaflet. A spec holds those shapes to the real `Map`
classes, so a renamed method fails a typecheck here rather than a page.

Leaflet takes the page's duration for a pan and a trip but not its curve, which
it eases by a linearity rather than a function, and zooms on a transition of
its own stylesheet's, so a Leaflet zoom is animated or not and nothing more.

MapLibre gives no public way to remove the credit control it was made with, so
its driver hides it while connected; make the map with
`attributionControl: false` and there is nothing to hide.

A driver of your own is an object with `panBy(x, y, motion)` in pixels and
`zoomBy(direction, motion)`, where `motion` is the page's `{ duration, easing }`
or `null` for a jump, and optionally `silenceKeyboard`, `focusTarget`,
`replaceZoom` and `credits`: see `MapDriver`. Markers need three more:
`project(place)` to a point in the map's container, `onView(moved)` to hear the
view change, and `show(place, motion)` to bring a place into view. `motionOf`
reads the same motion for a move a page makes itself. A driver
without `project` leaves its markers hidden.

## Working on it

```sh
bun run --filter @fusion.dev/helix-map build
bun run --filter @fusion.dev/helix-map test
```

The specs drive stand-ins for each renderer. What they cannot show, that the
real libraries move the way the stand-ins are told, was checked against
MapLibre 5.24 and Leaflet 1.9.4 in Chromium on 25 Sep 2026.

MIT
