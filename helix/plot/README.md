# @fusion.dev/helix-plot

Connects the Helix `Scatter 3D` chart to three.js, which draws its points in
three dimensions, colored from your tokens.

```sh
bun add @fusion.dev/helix @fusion.dev/helix-plot three
```

Put the chart beside its table, with an element inside it for the renderer to
draw in:

```html
<table id="customers">…</table>

<helix-scatter-3d for="customers" group-by="Segment" label="Customers">
  <div></div>
</helix-scatter-3d>
```

Connect the two:

```js
import '@fusion.dev/helix/scatter-3d'
import { connectScatter3d } from '@fusion.dev/helix-plot'
import { threeScatterDriver } from '@fusion.dev/helix-plot/three'

const chart = document.querySelector('helix-scatter-3d')
const connection = connectScatter3d(chart, threeScatterDriver(chart.querySelector('div')))
```

## What it does

- **The chart reads its table.** The first three numeric columns are across,
  up, and in depth, and `group-by` names a column of text that colors each
  point by its group, from the theme's series colors.
- **The points stand in a box** with a grid on its floor and two of its walls
  at the ticks, and each axis named along its edges.
- **Dragging turns the box, and the wheel and a pinch bring it nearer.** Shift
  with an arrow on the chart turns it a step of 15 degrees. It never turns by
  itself.
- **A point pressed in the drawing is the chart's reading**, as one reached by
  the keys is, and it is ringed and named with its numbers.
- **It draws only while something moves**, and asks the browser for no frames
  at rest or while its box is out of view.
- **Every three.js drawing Helix makes on a page shares six WebGL contexts**,
  the graph's and the plot's alike. Past six, one far off screen gives its
  context back and takes it again as it comes near.
- **Until the renderer has drawn, the chart draws a flat scatter** of the
  first two measures, and it draws it again after `connection.disconnect()`.

| `threeScatterDriver` option | Default | What else it takes |
|---|---|---|
| `density` | screen × 1.5, 2 to 3; on a touch screen, the screen's own, at most 2 | How many pixels the drawing has for each of the page's |
| `pointSize` | `9` | How large a point is drawn, in CSS pixels, at any distance |

## What it exports

| Import | What |
|---|---|
| `@fusion.dev/helix-plot` | `connectScatter3d(chart, driver)`, `plotColorsFrom(chart, groups)`, and the types `Axis`, `Field`, `PlotColors`, `Point`, `Scatter3dConnection` and `Scatter3dDriver` |
| `@fusion.dev/helix-plot/three` | `threeScatterDriver(box, options)`, and the type `ThreeScatterDriverOptions` |

**three.js is a peer**, so a page brings the version it has.
