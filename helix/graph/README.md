# @fusion.dev/helix-graph

Connects the Helix `Graph` frame to whatever draws the graph: Sigma.js, or a
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
notes**: a message, a request, a payment. It is drawn traveling from one to the
other and arriving with a pulse, in the tone's color, over the graph and without
redrawing it, so a busy feed costs a dot each. A reader who asks for less motion
sees the link lit for a moment instead.

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
where it does not say. The selected note keeps its own color and is told apart by
a ring and a glow in that color.

## What it exports

| Import | What |
|---|---|
| `@fusion.dev/helix-graph` | `connectGraph`, `diffGraph`, `graphColorsFrom`, `seedPositions`, and the `GraphDriver` and `GraphChanges` types |
| `@fusion.dev/helix-graph/sigma` | `sigmaDriver(sigma, options)` |

**Sigma is a peer, and graphology is the page's.** The driver types the renderer
by the calls it makes on it, so a page brings whichever version it has, and a
spec holds those shapes to the real classes, so a renamed method fails a
typecheck here rather than a page. `@fusion.dev/helix-graph/sigma` imports
Sigma's rendering module for the program that draws the notes, which is why
Sigma 3 is a peer dependency.

| `connectGraph` option | Default | What else it takes |
|---|---|---|
| `center` | `true` | `false` leaves the view where it is when a note is chosen in the list |

| `sigmaDriver` option | Default | What else it takes |
|---|---|---|
| `layout` | none | A function that makes a layout for the graph, such as ForceAtlas2's worker |
| `material` | flat | `glass` or `frosted`, for every note that does not say |
| `shape` | `circle` | `square`, `diamond` or `ring`, for every note that does not say |
| `emphasis` | `solid` | `outlined` or `subtle`, for every note that does not say |
| `layoutLimit` | `10000` | The longest a layout runs, in milliseconds, about where 10,000 notes settle |

## Working on it

```sh
bun run --filter @fusion.dev/helix-graph build
bun run --filter @fusion.dev/helix-graph test
```
