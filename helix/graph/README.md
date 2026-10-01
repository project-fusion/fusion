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

## What it exports

| Import | What |
|---|---|
| `@fusion.dev/helix-graph` | `connectGraph`, `graphColorsFrom`, `seedPositions`, and the `GraphDriver` type |
| `@fusion.dev/helix-graph/sigma` | `sigmaDriver(sigma, options)` |

**Neither Sigma nor graphology is a dependency.** The driver types the renderer
by the calls it makes on it, so a page brings whichever version it has. A spec
holds those shapes to the real classes, so a renamed method fails a typecheck
here rather than a page.

| `connectGraph` option | Default | What else it takes |
|---|---|---|
| `center` | `true` | `false` leaves the view where it is when a note is chosen in the list |

| `sigmaDriver` option | Default | What else it takes |
|---|---|---|
| `layout` | none | A function that makes a layout for the graph, such as ForceAtlas2's worker |
| `layoutLimit` | `8000` | The longest a layout runs, in milliseconds |

## Working on it

```sh
bun run --filter @fusion.dev/helix-graph build
bun run --filter @fusion.dev/helix-graph test
```
