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
page adds a marker or changes its `lat` or `lng`, as the attribute or the
property: each part says it changed with `helix-map-part-change` rather than
reflecting its coordinates into the markup. A marker the connector has
not placed stays hidden rather than drawn in the corner.

The markers share one tab stop, and the arrow keys walk them in the order they
are written. A marker that takes focus outside the view is brought into it, so
a reader walking the places never lands on one they cannot see. Pressing one
sends `helix-activate` from the frame with its `name`, or its `label` where it
has none, and what happens then is the page's.

### Clusters

```html
<helix-map label="Stores" cluster>…</helix-map>
```

**A frame with `cluster` gathers markers that would draw over each other**:
each, in the order they are written, takes every later one whose point comes
within 40 pixels of its own, `clusterDistance` to change it, and is drawn at
their middle as their count, named by their names in the page's language.
Asked again every time the view moves, so a cluster comes apart as the map
zooms in. The walk and the tab stop go to the cluster rather than the places
hidden in it, and pressing one sends `helix-map-cluster` from its marker with
their names, which the connector answers by framing them; a page that lists
them in a panel instead connects with `clusterZoom: false`.

**Places no zoom draws apart fan out instead**: a cluster whose places all lie
within two meters, the same door or one building's addresses, stands them in
a ring round their spot when pressed, a spiral for more than eight, each with a
leg back to a dot on the spot itself. They are markers like any other while
fanned, walked by the arrow keys with the focus on the one pressed; Escape
folds them back with the focus on the cluster, as does a press elsewhere on
the map or a zoom, and a pan carries them with the map. So does every cluster
on a driver without `fit`.

## Thousands of points

```html
<helix-map label="Food and drink in Austin">
  <div id="map"></div>
  <helix-map-points label="Food and drink" description="3,252 places" src="/austin-food-and-drink.geojson" cluster></helix-map-points>
</helix-map>
```

**A marker is an element, and the cafés in a city are thousands.** A points
layer is one layer the renderer draws, as fast as it draws the roads: `src` is
a GeoJSON file of points the connector fetches once, and `data` the same
collection, or a list of `{ lat, lng, label, id }`, set by a script. `cluster`
has MapLibre gather them into counts, sized by how many they hold, which a
press zooms in to where they come apart. Pressing a point sends
`helix-activate` from the layer with its `id`, or the property `name-key`
names, `name` by default. Its color is the brand's fill or its `tone`'s, and
its counts are written in white, as a lettered marker's are. Leaflet draws
every point, unclustered, where the page hands it `L`: right for hundreds, and
MapLibre is the renderer for thousands.

The frame names the layer in its list by `label` and `description`, as a route
is named. A reader cannot yet walk the points in view by keyboard, which is
the next part of this.

## Routes and areas

```html
<helix-map label="Deliveries today">
  <div id="map"></div>
  <helix-map-route label="Depot to Mission" description="4 stops" points="37.7955,-122.3937 37.7644,-122.427"></helix-map-route>
  <helix-map-area label="Delivery zone" tone="info" points="37.80,-122.44 37.80,-122.39 37.75,-122.39 37.75,-122.44"></helix-map-area>
</helix-map>
```

`points` are `lat,lng` pairs, in the order a marker's own `lat` and `lng` read.
**A route draws the path it is given**, straight between each pair: a path
along roads is a routing engine's to find, OSRM, Valhalla or GraphHopper, and a
page passes the geometry one returns rather than the stops alone.
**The renderer draws them, under its place names**, which a page drawing its
own canvas over the map could not do: the connector reads each one's points and
its color, the brand or its `tone`, and hands them to the driver as the
renderer's own layers. A MapLibre style replaced by a theme change takes them
with it, and they come back drawn in the new theme; a theme that moves without
replacing the style, a mode or a brand set on anything above the frame, draws
them again in its colors, on either renderer. Leaflet draws them where the
page hands Leaflet over, `leafletDriver(map, L)`, since this package imports no
renderer.

**The frame names them in a list**, off the screen and in the accessibility
tree, since a line in a canvas is nothing to a screen reader: each one's `label`
and `description`, under the frame's `layers-label`.

`connection.fit()` frames every marker and every point of every route and area,
at the page's pace for a trip, or at once with `{ animate: false }`, which is
what a map still settling its size wants on load and on resize.

## A live position

```html
<helix-map-position label="Van 12" lat="37.78" lng="-122.41" heading="90" accuracy="30"
  description="Two stops away"></helix-map-position>
```

Something moving: a point in the page's ink ringed in its surface, which
becomes an arrow where it has a `heading`, degrees clockwise from north, with a
ring `accuracy` meters across. `shape` and `separation` take the same words
they do on a marker's point, and `tone` colors it where it means something. **The connector places it and sizes its
ring through the renderer's projection**, so the ring is right at every zoom
and on every renderer; a page moves it by setting `lat`, `lng` and `heading`.
Its heading is drawn against the view, so on a map the renderer has turned it
still points the way it is going.
**It moves in silence and speaks its `description`**, politely and at most
once every `announce-every` milliseconds, 5,000 by default, with the latest
words once the wait is over: a step is not news, and two stops away is.

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
moves the roads with it.

```js
import { colorsReady } from '@fusion.dev/helix-map'
import { followTheme, mapLibreStyle } from '@fusion.dev/helix-map/maplibre'

const style = (colors) => mapLibreStyle(colors, { language: 'en' })
const map = new maplibregl.Map({ container, style: style(await colorsReady(frame)) })
const theme = followTheme(map, frame, style)
```

**`followTheme` keeps it in the theme**: a mode, a class, a theme or an inline
token on the frame or anything above it, or the reader's light or dark
preference, restyles the map once a frame by a diff, and only where the style
it builds differs from the last. A page that restyles some other way, a
stylesheet replaced, calls `theme.update()`. `colorsReady(element)` waits out
the frame or two a stylesheet can be behind the page, and says which token is
missing where a few seconds pass without them; `watchTheme(element, changed)`
is the watch on its own, for a renderer of your own.

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
view change, and `show(place, motion)` to bring a place into view, and
`bearing()` where the renderer can turn the view. Routes and
areas need `layers(read)`, and `connection.fit()` needs `fit(bounds, padding,
motion)`. `motionOf`
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
