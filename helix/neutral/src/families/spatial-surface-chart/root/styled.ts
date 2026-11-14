import chartSpatial from '../../../fragments/chart-spatial.js'
import chartStatus from '../../../fragments/chart-status.js'
import chartTooltip from '../../../fragments/chart-tooltip.js'
import { oneOf } from '../../../render.js'
import { difference, fn, measured, mix, native, product, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * Spatial Surface Chart's styled tier.
 *
 * **The plot is square up to 26em tall, then as wide as its column at that
 * height**, as Spatial Scatter Chart's is, and the host's row ends where the
 * plot does.
 *
 * **The ramp a height is shaded along runs low to high**: one hue getting
 * louder, as the heatmap's is, so a reader compares two places by weight. The
 * 3D renderer reads the same two hooks, with the same defaults. **The high
 * end is held at a lightness of 0.33 or more**, as Heatmap's top step is: the
 * ink theme's light 700 is 0.11, and the upper surface, shaded darker still
 * as it turns from the light, drew pure black. **The low end starts at
 * 35%**, where Heatmap's first step does: at 15% the lowest faces were the
 * plate's gray.
 *
 * **A face takes its height's color on the ramp, less light as it turns
 * from the light**, which the element writes as its shade, the shade taking
 * its share of the face's own lightness. It is ruled along the grid a little
 * lighter than itself where it is dark and a little darker where it is
 * light, the step every spatial chart's edge takes. A contour line is its
 * height's color a step stronger than the face under it, so it reads over
 * the face. The web works these out with relative colors from the level and
 * the shade the element writes on each face; a phone's drawing works out the
 * same colors and writes them on each face and line, since React Native draws
 * no relative color.
 *
 * **Emphasis and material, as every chart reads them.** `outlined` is a
 * wireframe in the ramp's colors over a surface faded toward the page, and
 * `subtle` the same wireframe over a faint surface the grid behind shows
 * through, so a reading the surface hid from this side can be seen.
 *
 * **Web only:** printing, and forced colors, where the faces keep their
 * colors, which are the reading, and every line is drawn in the system's
 * text color.
 */
export default styles(
  root,
  {
    prefix: 'spatial-surface-chart',
    hooks: {
      blockSize: null,
      high: token('color-primary-strong'),
      low: mix(token('color-primary-strong'), 35, token('color-surface-sunken')),
    },
    own: {
      spatialSurfaceChartArea: null,
      spatialSurfaceChartColor: null,
      spatialSurfaceChartContour: null,
      spatialSurfaceChartFill: null,
      spatialSurfaceChartHigh: null,
      spatialSurfaceChartLine: null,
      spatialSurfaceChartLit: null,
      spatialSurfaceChartLow: null,
      spatialSurfaceChartRule: null,
      spatialSurfaceChartThrough: null,
    },
    props: {
      emphasis: oneOf(['outlined', 'solid', 'subtle']),
      material: oneOf(['frosted', 'glass']),
      separation: oneOf(['filled', 'plain']),
    },
    stylesheet: 'spatial-surface-chart/root/spatial-surface-chart-root.generated.css',
  },
  ({ hook, include, on, own, rule }) => {
    const high = own.spatialSurfaceChartHigh
    const low = own.spatialSurfaceChartLow
    const lit = own.spatialSurfaceChartLit
    const color = own.spatialSurfaceChartColor
    /* How high a face or a line stands, and how far a face turns from the
       light, which the element writes on each. */
    const level = measured('spatial-surface-chart-level', 0)
    const shade = measured('spatial-surface-chart-shade', 0)
    /* The ramp at a level, as a mix of its two ends. */
    const ramp = fn('color-mix', ['in', 'oklab'], [high, product(level, '100%')], low)
    return [
      include(chartSpatial),
      include(chartStatus),
      include(chartTooltip),
      on('host', [
        web([
          rule({
            own: {
              spatialSurfaceChartHigh: hook.high,
              spatialSurfaceChartLow: hook.low,
            },
          }),
        ]),
      ]),
      /* **The row stops where the plot does.** The plot's cap is a share of
         the row, and a row with no height set cannot resolve that share while
         it is sized, so the row took the plot's square: at 640 the host was
         592 tall around a 364 plot, an empty band of 228 under the chart. */
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
      on('face', [
        web([
          rule({
            own: {
              spatialSurfaceChartColor: ramp,
              spatialSurfaceChartLit: fn('oklch', [
                'from',
                color,
                product('l', difference(1, shade)),
                'c',
                'h',
              ]),
              spatialSurfaceChartRule: fn('oklch', [
                'from',
                lit,
                'calc(l + clamp(-0.08, (0.6 - l) * 1000, 0.1))',
                'c',
                'h',
              ]),
            },
          }),
        ]),
        /* A phone's drawing writes each face's colors, worked out as the web's are. */
        native([
          rule({
            own: {
              spatialSurfaceChartColor: measured(
                'spatial-surface-chart-color',
                token('color-primary-strong'),
              ),
              spatialSurfaceChartLit: measured(
                'spatial-surface-chart-face',
                token('color-primary-strong'),
              ),
              spatialSurfaceChartRule: measured(
                'spatial-surface-chart-edge',
                token('color-primary-strong'),
              ),
            },
          }),
        ]),
        rule({
          fill: own.spatialSurfaceChartFill(lit),
          fillOpacity: product(own.spatialSurfaceChartArea(1), own.spatialSurfaceChartThrough(1)),
          stroke: own.spatialSurfaceChartLine(own.spatialSurfaceChartRule),
          strokeLinejoin: 'round',
          strokeOpacity: own.spatialSurfaceChartThrough(1),
          strokeWidth: token('border-thin'),
          vectorEffect: 'non-scaling-stroke',
        }),
        rule(
          { emphasis: 'outlined' },
          {
            own: {
              spatialSurfaceChartFill: mix(lit, 60, token('color-background')),
              spatialSurfaceChartLine: color,
            },
          },
        ),
        rule(
          { emphasis: 'subtle' },
          { own: { spatialSurfaceChartArea: 0.2, spatialSurfaceChartLine: color } },
        ),
      ]),
      on('contour', [
        web([
          rule({
            own: {
              spatialSurfaceChartContour: fn('oklch', [
                'from',
                ramp,
                'calc(l + clamp(-0.18, (0.6 - l) * 1000, 0.22))',
                'c',
                'h',
              ]),
            },
          }),
        ]),
        native([
          rule({
            own: {
              spatialSurfaceChartContour: measured(
                'spatial-surface-chart-contour',
                token('color-primary-strong'),
              ),
            },
          }),
        ]),
        rule({
          fill: 'none',
          stroke: own.spatialSurfaceChartContour,
          strokeWidth: token('border-thick'),
          vectorEffect: 'non-scaling-stroke',
        }),
      ]),
      /* `frosted` admits less, which on a mark is more ink: 0.88 against
         glass's 0.72, the material tokens every glass surface reads. */
      on('host', [
        rule(
          { material: 'glass' },
          { own: { spatialSurfaceChartThrough: token('material-glass-opacity') } },
        ),
        rule(
          { material: 'frosted' },
          { own: { spatialSurfaceChartThrough: token('material-frosted-opacity') } },
        ),
      ]),
      on('face', [web([rule({ print: true }, { stroke: token('color-border') })])]),
      on('contour', [web([rule({ forcedColors: true }, { stroke: 'CanvasText' })])]),
      on('face', [
        web([rule({ forcedColors: true }, { forcedColorAdjust: 'none', stroke: 'CanvasText' })]),
      ]),
      on('grid', [web([rule({ forcedColors: true }, { stroke: 'CanvasText' })])]),
      on(['tick', 'axis-name'], [web([rule({ forcedColors: true }, { fill: 'CanvasText' })])]),
      on('ring', [web([rule({ forcedColors: true }, { stroke: 'Highlight' })])]),
      /* The axis names' plate is the canvas, as the ground is. */
      on('axis-name', [web([rule({ forcedColors: true }, { stroke: 'Canvas' })])]),
    ]
  },
)
