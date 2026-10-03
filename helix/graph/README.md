# @fusion.dev/helix-graph

Connects the Helix `Graph` frame to whatever draws the graph: Sigma.js, cosmos.gl, or a
driver of your own, colored from your tokens.

```sh
bun add @fusion.dev/helix @fusion.dev/helix-graph sigma graphology graphology-layout-forceatlas2
```

The elements themselves are on the
[Graph reference](https://fusion.dev/helix/components/graph).

```js
import { connectGraph } from '@fusion.dev/helix-graph'
import { sigmaDriver } from '@fusion.dev/helix-graph/sigma'
import Graph from 'graphology'
import forceAtlas2 from 'graphology-layout-forceatlas2'
import FA2Layout from 'graphology-layout-forceatlas2/worker'
import Sigma from 'sigma'

const frame = document.querySelector('helix-graph')
frame.nodes = notes // [{ id, label, group, size, x, y }]
frame.links = links // [{ source, target, label }]

const sigma = new Sigma(new Graph(), document.getElementById('drawing'))
const connection = connectGraph(
  frame,
  sigmaDriver(sigma, {
    layout: (graph) => new FA2Layout(graph, { settings: forceAtlas2.inferSettings(graph) }),
  }),
)

// Keep where the layout put each note, and pass it back as `x` and `y` next time.
frame.addEventListener('helix-graph-layout', (event) => save(event.detail.positions))

// After replacing a stylesheet, which no attribute shows:
connection.restyle()

// Later, when the graph goes away:
connection.disconnect()
```

## What it does

- Draws the frame's `nodes` and `links`, and draws them again when either changes.
- Lays out only the notes without a position, in a worker, and stops once they
  are still. Notes keep where they were when a page adds one.
- Says where every note ended in `helix-graph-layout`, and makes the frame
  `:state(ready)`.
- Keeps the selection the same in the list and the drawing. A note chosen in
  the list is brought into view. The selected note's links and backlinks stand
  out, and the rest of the graph is faded.
- Colors each `group` from the series tokens, the selected note from `primary`,
  and the labels in the theme's face, and draws them again when the theme
  changes.
- Answers the frame's pan and zoom buttons and keys, and tells the renderer which
  gestures the frame's `gestures` lets it take.
- Draws only what changed when the page hands the frame new notes or links, and
  draws the frame's `signal()`s.

## Live graphs

**Hand the frame new arrays as often as the graph changes.** The connection
compares them with what is drawn, by each note's `id` and each link's two ends,
and the renderer is told only what was added, taken away, renamed or moved. New
notes grow in and are laid out with the rest held still, and the frame stays
`:state(ready)` throughout.

```js
socket.addEventListener('message', ({ data }) => {
  const note = JSON.parse(data)
  frame.nodes = [...frame.nodes, note]
  frame.links = [...frame.links, { source: note.id, target: note.parent }]
})
```

**`frame.signal(from, to, { tone })` shows something passing between two
notes**: a message, a request, a payment. It is drawn as a comet traveling
from one to the other along the link between them, its tail tapering and
turning from the first note's color to the second's, or in the tone's color
where it has one. A small ring spreads from the note it leaves, and the note it
reaches brightens and ripples. It is drawn over the graph without redrawing it,
so a busy feed costs a few strokes each. A reader who asks for less motion sees
the link lit for a moment instead.

```js
frame.signal('Checkout', 'Payments', { tone: 'success' })
frame.signal('Payments', 'Fraud review', { tone: 'danger' })
```

A signal is drawn and never said: a screen reader does not hear it. Where what
passed matters to a reader, say it in the page's own words as well.

## How notes look

Each note can say how it is drawn, in the words Helix's other components use:

| Field | Values | What it does |
|---|---|---|
| `shape` | `circle`, `square`, `diamond`, `ring` | What kind of note it is at a glance |
| `emphasis` | `solid`, `outlined`, `subtle` | Filled, a ring with the ground showing through, or a tinted fill with a ring |
| `material` | `glass`, `frosted` | A shaded sphere with a highlight and a lit rim, or a milky body with a soft fall of light |
| `tone` | `primary`, `accent`, `info`, `success`, `warning`, `danger`, `neutral` | What it means, which colors it over its group |

```js
frame.nodes = [
  { id: 'Roadmap', group: 'Product', shape: 'square' },
  { id: 'Outage 14', group: 'Support', tone: 'danger', emphasis: 'outlined' },
]
```

`sigmaDriver(sigma, { material, shape, emphasis })` sets what a note is drawn as
where it does not say. A note without a material is matte, lit across so it
reads as round. In three dimensions every note is a solid: a circle is a
sphere, worked out for each pixel and written at its depth, so notes meet the
shape and each other as solids do; a square is a cube and a diamond an
octahedron. On a dark ground a sphere is an orb of energy, a dark glassy body
with a glowing rim and a hot point at its middle, and on a light ground frosted
glass; a cube or an octahedron is a hologram, faint faces with fine edges of
light. Each catches a glint from a light fixed in the scene, so the glint moves
as the reader turns the graph. The selected note keeps its own color and is told apart by
a ring and a glow in that color.

**A note without a `size` is as large as it is connected**, so hubs read at a
glance. Links are tinted by the note they leave, the selected note's and the
hovered note's in their color, and choosing a note in the list frames it with
its neighbors.

**A press on a note selects it, and a press where no note is lets it go**,
so the graph's colors come back, in every driver.

**Notes are named on hover**, and the selected note and its neighbors where
there is room, each name ringed in the ground's color so it reads over the
links. Each group's name is drawn over its notes, which is how a reader finds
their way. `labels: 'hubs'` names the busiest notes at rest as well, quietly,
and `labels: 'all'` every note where its name does not cover another.

## Large graphs

**Past fifty thousand notes, draw with cosmos.gl**, which lays the graph out
and draws it on the GPU. The frame, the list, selection and signals are the
same; only the driver changes:

```sh
bun add @cosmos.gl/graph
```

```js
import { Graph } from '@cosmos.gl/graph'
import { connectGraph } from '@fusion.dev/helix-graph'
import { cosmosDriver } from '@fusion.dev/helix-graph/cosmos'

const box = document.getElementById('drawing')
const graph = new Graph(box, { attribution: '', enableSimulation: true, scalePointsOnZoom: false })
connectGraph(frame, cosmosDriver(graph, box))
```

cosmos.gl draws notes with its own shaders, so a note's `shape` is honored and
its `material` and `emphasis` are not. Each group is given a place of its own
and its notes are drawn toward it, so twenty thousand notes in twelve groups
come apart into twelve regions. The view follows the layout as it opens out,
until the reader moves it. Zoomed out, a note is a fine point and a leaf is
drawn partly clear, so a group reads as a field of points with its hubs
standing out; notes grow as the reader zooms in.

**cosmos.gl's own start reports a `ResizeObserver loop` error**, which is
harmless and shows in the console: it observes its canvas from inside
luma.gl's resize callback. Make the GPU device yourself and hand it over a
frame after its canvas is measured, and cosmos.gl starts outside any callback:

```js
import { luma } from '@luma.gl/core'
import { webgl2Adapter } from '@luma.gl/webgl'

const canvas = Object.assign(document.createElement('canvas'), {
  style: 'width:100%;height:100%',
})
box.append(canvas)
const device = luma
  .createDevice({
    adapters: [webgl2Adapter],
    createCanvasContext: { autoResize: true, canvas, useDevicePixels: true },
    type: 'webgl',
    webgl: { antialias: false },
  })
  .then(async (made) => {
    await made.canvasContext?.initialized
    await new Promise((done) => requestAnimationFrame(done))
    return made
  })
const graph = new Graph(box, { attribution: '', enableSimulation: true }, device)
```

Use the `@luma.gl` version `@cosmos.gl/graph` depends on, since two versions
on one page throw, and destroy the device after the graph.

**The driver is for `@cosmos.gl/graph`, which is MIT.** Cosmograph, the
product built on it, is licensed for noncommercial use only.

## Shapes

**`stencil` draws the notes in a shape**, such as a brain or a country's
outline. Pass an SVG path and the box it is drawn in, as the SVG's `viewBox`
gives it:

```js
connectGraph(frame, driver, {
  stencil: { path: brain.getAttribute('d'), width: 220, height: 170 },
})
```

No layout runs, so the shape is there from the first frame. Each group takes
a region of the shape, each note sits by the hub it links to, and the notes
fill the shape evenly, with borders between regions that curve. Holes are cut
by the even-odd rule, which is how the grooves of a brain show. Only a graph
with no places of its own is shaped; a note added later is placed by the
layout beside its neighbors. `stencil` also takes `inside(x, y)`, a test of
whether a point in the box is in the shape, in place of `path`, and
`fitToStencil` fits places a page has into one.

**Every shape becomes a distance field**: for each point in its box, how far
it is from the shape's edge, below zero inside. `@fusion.dev/helix-graph/shapes`
makes one from what a page has, and a field is a stencil itself:

| Function | Makes |
|---|---|
| `shapeFromModel(url)` | A solid from a glTF model, `.glb` or `.gltf`, every mesh where the model places it. Async; three.js reads the file |
| `shapeFromTriangles(positions, index)` | A solid from a closed surface of triangles a page already holds |
| `shapeFromSvg(svg)` | A flat field from an `<svg>` or its markup: every path, rectangle, circle, ellipse and polygon in its `viewBox` |
| `shapeFromImage(image, { threshold })` | A flat field from an image's opaque pixels |
| `shapeFromPath(path, width, height)` | A flat field from an SVG path |
| `shapeFromInside(inside, { width, height, depth })` | A flat field, or a solid where `depth` is given, from a test of what is inside |
| `inflate(field, { depth, roundness })` | A solid puffed out of a flat field, as a cushion is, cut through where the flat shape has a hole |
| `sphere`, `torus`, `box` | Solids measured exactly from their formulas |
| `onSphere(field, { radius, thickness })` | A flat map wrapped round a ball, as a world map is round a globe |
| `surfaceOf(field, { at, cells })` | The surface of a solid as triangles, to draw or to save as a model |

```js
const stencil = { ...(await shapeFromModel('/models/brain.glb')), place: 'surface' }
connectGraph(frame, threeDriver(box), { stencil })
```

**`regions` sends each group to a named part of the shape**, such as a lobe
of a brain or a state on a map:

```js
const stencil = {
  ...(await shapeFromModel('/models/brain.glb')),
  place: 'surface',
  regions: { Vision: 'occipital', Hearing: 'temporal', Balance: 'cerebellum' },
}
```

A model's parts are its meshes, named as it names them, where it has two or
more; an SVG's are its shapes with an `id`, or in a group with one; and a
field a page makes says its own with `regionOf(x, y, z)`. Each part fills
evenly with the groups sent to it, and a group sent nowhere, or to a part the
shape does not have, shares the parts no group claims.

**A model is read a column of cells at a time**, so one of a hundred thousand
triangles becomes a field in a moment. Any closed mesh works; a mesh with
holes is read as closed where it can be. A model served from another origin
needs that origin to allow it, as any `fetch` does. Use a model whose license
lets your readers copy it, since the examples a reader takes away name it.

## In three dimensions

**`threeDriver(box)` draws the graph in three dimensions** with three.js, to
be turned and looked into. The frame, the list, selection, names and signals
are the same as in two:

```sh
bun add three d3-force-3d
```

```js
import { connectGraph } from '@fusion.dev/helix-graph'
import { inflate, shapeFromPath } from '@fusion.dev/helix-graph/shapes'
import { threeDriver } from '@fusion.dev/helix-graph/three'

connectGraph(frame, threeDriver(box), {
  stencil: { ...inflate(shapeFromPath(path, 220, 170), { depth: 140 }), place: 'surface' },
})
```

- **A solid stencil draws the notes in the solid**: all through it, or, with
  `place: 'surface'`, in a thin shell just inside its edge, which is how a
  solid reads as the thing it is shaped like. **Each group is given a piece
  of the shape of its own**, as many places as it has notes, and each hub a
  piece of its group's, so no group is cut in two: on a knot, a group is a
  stretch of its tube, and on a brain, a region of it.
- **On a surface, the shape itself is drawn** just inside the notes, so what
  is behind it is hidden and the pointer finds only the notes in front.
  **Each region is washed in its notes' color**, a translucent stain that
  fades into the next region's, and glows in that color at the edge turning
  away. It is lit faintly from above, and a model's own surface is drawn,
  with every fold the field's cells are too coarse to hold.
- **Without a stencil, a layout runs in three dimensions** with d3-force-3d.
- **Dragging turns the graph, and the wheel and a pinch bring it nearer.** It
  turns slowly by itself while nobody is handling it, and never for a reader
  who asks for less motion.
- **The far side recedes.** Through a graph, its far notes are a little
  quieter than its near ones.
- **Edges are smooth at any density.** The drawing has half as many pixels again as the screen, at least two for each of the page's, and links are lines of a set width with smooth edges, where WebGL draws its own a device pixel wide.
- **Each group is named over its near side**, and a group's name moves a line
  where it would cover another's.

| `threeDriver` option | Default | What else it takes |
|---|---|---|
| `autoRotate` | `true` | `false` leaves the graph still until the reader turns it |
| `density` | screen × 1.5, 2 to 3 | How many pixels the drawing has for each of the page's; fewer is faster on a slow GPU |
| `shape` | `circle` | `square` or `diamond`, for every note that does not say |
| `groupLabels` | `true` | `false` leaves each group unnamed |
| `layoutLimit` | `10000` | The longest a layout runs, in milliseconds |

## What it exports

| Import | What |
|---|---|
| `@fusion.dev/helix-graph` | `connectGraph`, `diffGraph`, `fitToStencil`, `graphColorsFrom`, `seedPositions`, and the `GraphDriver`, `GraphChanges` and `GraphStencil` types |
| `@fusion.dev/helix-graph/sigma` | `sigmaDriver(sigma, options)` |
| `@fusion.dev/helix-graph/cosmos` | `cosmosDriver(graph, box, options)` |
| `@fusion.dev/helix-graph/three` | `threeDriver(box, options)` |
| `@fusion.dev/helix-graph/shapes` | `shapeFromModel`, `shapeFromTriangles`, `shapeFromSvg`, `shapeFromImage`, `shapeFromPath`, `shapeFromInside`, `inflate`, `sphere`, `torus`, `box`, `onSphere`, `surfaceOf`, and the `ShapeField` type |

**Sigma, cosmos.gl, three.js and d3-force-3d are optional peers, and graphology is the page's.** Each
driver types its renderer by the calls it makes on it, so a page brings
whichever version it has, and a spec holds those shapes to the real classes,
so a renamed method fails a typecheck here before it reaches a page. `@fusion.dev/helix-graph/sigma` imports
Sigma's rendering module for the program that draws the notes, which is why
Sigma 3 is a peer dependency.

| `connectGraph` option | Default | What else it takes |
|---|---|---|
| `center` | `true` | `false` leaves the view where it is when a note is chosen in the list |
| `stencil` | none | A shape to draw the notes in: a field from `shapes`, `{ path, width, height }` or `{ inside, width, height }`, with `place`, `fill` or `surface` |

| `sigmaDriver` option | Default | What else it takes |
|---|---|---|
| `layout` | none | A function that makes a layout for the graph, such as ForceAtlas2's worker |
| `material` | flat | `glass` or `frosted`, for every note that does not say |
| `shape` | `circle` | `square`, `diamond` or `ring`, for every note that does not say |
| `emphasis` | `solid` | `outlined` or `subtle`, for every note that does not say |
| `labels` | `'hover'` | `'hubs'` or `'all'`: which notes are named at rest |
| `groupLabels` | `true` | `false` leaves each group unnamed |
| `layoutLimit` | `10000` | The longest a layout runs, in milliseconds, about where 10,000 notes settle |

| `cosmosDriver` option | Default | What else it takes |
|---|---|---|
| `shape` | `circle` | `square` or `diamond`, for every note that does not say |
| `groupLabels` | `true` | `false` leaves each group unnamed |
| `layoutLimit` | `15000` | The longest a layout runs, in milliseconds |
| `spaceSize` | `4096` | The size of cosmos.gl's space, as its own `spaceSize` says |

## Working on it

```sh
bun run --filter @fusion.dev/helix-graph build
bun run --filter @fusion.dev/helix-graph test
```
