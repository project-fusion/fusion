import chartSpatial from '../../../fragments/chart-spatial.js'
import chartStatus from '../../../fragments/chart-status.js'
import chartTooltip from '../../../fragments/chart-tooltip.js'
import { oneOf } from '../../../render.js'
import { fn, measured, mix, native, product, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * Spatial Scatter Chart's styled tier.
 *
 * **The plot is square up to 26em tall, then as wide as its column at that
 * height.** At 4 by 3 under a 22em cap a 280 plot was 210 tall, and the
 * drawing, fitted to the height with its names beside it, shrank to 112
 * across; square it is 159. At 640 the cap held the drawing to about 230 of a
 * 592 column, and at 26em it is about 350. The hook sets one height, and the
 * plot always takes the width the page gives it: a ratio given a height cap
 * carries the cap across, and a plot that reached it narrowed to a third less
 * than its box.
 *
 * **A point is its group's color, edged in the plot's ground**, so a point in
 * front reads apart from one behind it, and its line down to the floor is the
 * same color, quiet beside it. `emphasis` decides what a point draws and
 * `material` how much of it comes through, and the paint multiplies the two:
 * `outlined` is a ring in the group's color over a dot faded toward the page,
 * and `subtle` the same ring over a faint dot.
 *
 * **Web only:** printing, and forced colors, which paint every background the
 * page's Canvas color, so the points keep their colors and take an edge in
 * the system's text color.
 */
export default styles(
  root,
  {
    prefix: 'spatial-scatter-chart',
    hooks: { blockSize: null },
    own: {
      spatialScatterChartArea: null,
      spatialScatterChartFill: null,
      spatialScatterChartLine: null,
      spatialScatterChartThrough: null,
      spatialScatterChartWeight: null,
    },
    props: {
      emphasis: oneOf(['outlined', 'solid', 'subtle']),
      material: oneOf(['frosted', 'glass']),
      separation: oneOf(['filled', 'plain']),
    },
    stylesheet: 'spatial-scatter-chart/root/spatial-scatter-chart-root.generated.css',
  },
  ({ hook, include, on, own, rule }) => {
    const series = measured('chart-series', token('color-primary'))
    const through = own.spatialScatterChartThrough(1)
    return [
      include(chartSpatial),
      include(chartStatus),
      include(chartTooltip),
      /* **The row stops where the plot does.** The plot's cap is a share of
         the row, and a row with no height set cannot resolve that share while
         it is sized, so the row took the plot's square: at 640 the host was
         592 tall around a 364 plot, an empty band of 228 under the chart.
         Fitted to the plot and held to the same cap, the row is the plot's
         height, and a smaller height set on the host is still the row's. */
      on('host', [web([rule({ gridTemplateRows: fn('fit-content', hook.blockSize('26em')) })])]),
      on('plot', [
        rule({
          aspectRatio: 1,
          blockSize: hook.blockSize('auto'),
          inlineSize: '100%',
          borderRadius: token('radii-md'),
          overflow: 'hidden',
          position: 'relative',
        }),
        web([rule({ maxBlockSize: fn('min', hook.blockSize('26em'), '100%') })]),
        native([rule({ maxBlockSize: hook.blockSize('26em') })]),
        /* The ground, where a page asks for one: the one `filled` ground every family takes. */
        rule({ separation: 'filled' }, { backgroundColor: token('color-surface-filled') }),
      ]),
      on('drop-line', [
        rule({
          opacity: 0.45,
          stroke: series,
          strokeWidth: token('border-thin'),
          vectorEffect: 'non-scaling-stroke',
        }),
      ]),
      on('point', [
        rule({
          fill: own.spatialScatterChartFill(series),
          fillOpacity: product(own.spatialScatterChartArea(1), through),
          stroke: own.spatialScatterChartLine(token('color-surface-sunken')),
          strokeOpacity: through,
          strokeWidth: own.spatialScatterChartWeight(token('border-thin')),
          vectorEffect: 'non-scaling-stroke',
        }),
        rule(
          { emphasis: 'outlined' },
          {
            own: {
              spatialScatterChartFill: mix(series, 60, token('color-background')),
              spatialScatterChartLine: series,
              spatialScatterChartWeight: token('border-thick'),
            },
          },
        ),
        rule(
          { emphasis: 'subtle' },
          {
            own: {
              spatialScatterChartArea: 0.2,
              spatialScatterChartLine: series,
              spatialScatterChartWeight: token('border-thick'),
            },
          },
        ),
      ]),
      /* `frosted` admits less, which on a mark is more ink: 0.88 against
         glass's 0.72, the material tokens every glass surface reads. */
      on('host', [
        rule(
          { material: 'glass' },
          { own: { spatialScatterChartThrough: token('material-glass-opacity') } },
        ),
        rule(
          { material: 'frosted' },
          { own: { spatialScatterChartThrough: token('material-frosted-opacity') } },
        ),
      ]),
      /* Print: a point is a fill, so each takes an edge as well. */
      on('point', [web([rule({ print: true }, { stroke: token('color-border') })])]),
      on('point', [
        web([rule({ forcedColors: true }, { forcedColorAdjust: 'none', stroke: 'CanvasText' })]),
      ]),
      on(['drop-line', 'grid'], [web([rule({ forcedColors: true }, { stroke: 'CanvasText' })])]),
      on(['tick', 'axis-name'], [web([rule({ forcedColors: true }, { fill: 'CanvasText' })])]),
      on('ring', [web([rule({ forcedColors: true }, { stroke: 'Highlight' })])]),
      /* The axis names' plate is the canvas, as the ground is. */
      on('axis-name', [web([rule({ forcedColors: true }, { stroke: 'Canvas' })])]),
    ]
  },
)
