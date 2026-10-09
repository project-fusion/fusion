# @fusion.dev/helix-plot

Connects the Helix `Spatial Scatter Chart` and `Spatial Surface Chart` charts to three.js, which
draws them in three dimensions, colored from your tokens.

```sh
bun add @fusion.dev/helix @fusion.dev/helix-plot three
```

Put the chart beside its table, with an element inside it for the renderer to
draw in:

```html
<table id="customers">…</table>

<helix-spatial-scatter-chart for="customers" group-by="Segment" label="Customers">
  <div></div>
</helix-spatial-scatter-chart>
```

Connect the two:

```js
import '@fusion.dev/helix/spatial-scatter-chart'
import { connectSpatialScatterChart } from '@fusion.dev/helix-plot'
import { threeScatterDriver } from '@fusion.dev/helix-plot/three'

const chart = document.querySelector('helix-spatial-scatter-chart')
const connection = connectSpatialScatterChart(chart, threeScatterDriver(chart.querySelector('div')))
```

## What a scatter does

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

## A surface

`Spatial Surface Chart` connects the same way, with its own connector and driver:

```html
<table id="load">…</table>

<helix-spatial-surface-chart for="load" label="Load over a week">
  <div></div>
</helix-spatial-surface-chart>
```

```js
import '@fusion.dev/helix/spatial-surface-chart'
import { connectSpatialSurfaceChart } from '@fusion.dev/helix-plot'
import { threeSurfaceDriver } from '@fusion.dev/helix-plot/three'

const chart = document.querySelector('helix-spatial-surface-chart')
const connection = connectSpatialSurfaceChart(chart, threeSurfaceDriver(chart.querySelector('div')))
```

- **The chart reads its table as a grid.** Each row is one reading: the first
  numeric column is across, the second is in depth, and the third is the
  height. A place on the grid with no reading leaves a hole in the surface.
- **The surface is shaded along a ramp**, from `--spatial-surface-chart-low` to
  `--spatial-surface-chart-high`, which default to a quiet tint of the theme's
  `primary-active` and to `primary-active` itself. It is lit from above and
  ruled along the grid.
- **A place pressed in the drawing is the chart's reading**, and it is ringed
  and named with its reading. The left and right arrows move across, and the
  down and up arrows in depth.
- The box, the turning, the frames, and the shared contexts are the scatter's.
- **Until the renderer has drawn, the chart draws its grid flat**, seen from
  above, each place shaded by its height.

| `threeSurfaceDriver` option | Default | What else it takes |
|---|---|---|
| `density` | screen × 1.5, 2 to 3; on a touch screen, the screen's own, at most 2 | How many pixels the drawing has for each of the page's |

## What it exports

| Import | What |
|---|---|
| `@fusion.dev/helix-plot` | `connectSpatialScatterChart(chart, driver)`, `connectSpatialSurfaceChart(chart, driver)`, `plotColorsFrom(chart, groups)`, and the types `Axes`, `Axis`, `Field`, `PlotColors`, `PlotConnection`, `PlotDriver`, `Point`, `SpatialScatterChartConnection`, `SpatialScatterChartDriver`, `SpatialSurfaceChartConnection`, `SpatialSurfaceChartDriver`, `SurfaceCell` and `SurfaceField` |
| `@fusion.dev/helix-plot/three` | `threeScatterDriver(box, options)` and `threeSurfaceDriver(box, options)`, and the types `ThreeScatterDriverOptions` and `ThreeSurfaceDriverOptions` |

**three.js is a peer**, so a page brings the version it has.
