import chartSpatial from '../../../fragments/chart-spatial.js'
import chartStatus from '../../../fragments/chart-status.js'
import chartTooltip from '../../../fragments/chart-tooltip.js'
import { oneOf } from '../../../render.js'
import { difference, fn, measured, mix, native, product, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * Spatial Ribbon Chart's styled tier.
 *
 * **The plot is square up to 26em tall, then as wide as its column at that
 * height**, as Spatial Scatter Chart's is: the hook sets one height, and the
 * plot always takes the width the page gives it.
 *
 * **Each face of a ribbon is its series' color, darkened by how far it turns
 * from the light**: a level top whole, a steep one and the side shaded, so a
 * ribbon reads as a band from any side. The edge is the face a step lighter
 * where it is dark and darker where it is light. The web works both out with
 * a relative color from the shade the element writes on each face; a phone's
 * drawing works out the same colors and writes them on each face, since
 * React Native draws no relative color.
 *
 * **Emphasis and material, as every chart reads them.** `outlined` is a
 * ribbon as its edges in its color over faces faded toward the page, and
 * `subtle` the same edges over a faint wash, which shows the ribbons behind.
 *
 * **Web only:** printing, and forced colors, which paint every background the
 * page's Canvas color, so the ribbons keep their colors, which are the
 * series, and take an edge in the system's text color.
 */
export default styles(
  root,
  {
    prefix: 'spatial-ribbon-chart',
    hooks: { blockSize: null },
    own: {
      spatialRibbonChartArea: null,
      spatialRibbonChartColor: null,
      spatialRibbonChartEdge: null,
      spatialRibbonChartFace: null,
      spatialRibbonChartFill: null,
      spatialRibbonChartLine: null,
      spatialRibbonChartThrough: null,
    },
    props: {
      emphasis: oneOf(['outlined', 'solid', 'subtle']),
      material: oneOf(['frosted', 'glass']),
      separation: oneOf(['filled', 'plain']),
    },
    stylesheet: 'spatial-ribbon-chart/root/spatial-ribbon-chart-root.generated.css',
  },
  ({ hook, include, on, own, rule }) => {
    const series = measured('chart-series', token('color-primary'))
    const color = own.spatialRibbonChartColor
    const face = own.spatialRibbonChartFace
    /* How far a face turns from the light, which the element writes on each face. */
    const shade = measured('spatial-ribbon-chart-shade', 0)
    return [
      include(chartSpatial),
      include(chartStatus),
      include(chartTooltip),
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
      on('ribbon', [web([rule({ own: { spatialRibbonChartColor: series } })])]),
      on('face', [
        web([
          rule({
            own: {
              spatialRibbonChartFace: fn('oklch', [
                'from',
                color,
                difference('l', product(shade, 0.5)),
                'c',
                'h',
              ]),
              spatialRibbonChartEdge: fn('oklch', [
                'from',
                face,
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
              spatialRibbonChartColor: series,
              spatialRibbonChartEdge: measured('spatial-ribbon-chart-edge', series),
              spatialRibbonChartFace: measured('spatial-ribbon-chart-face', series),
            },
          }),
        ]),
        rule({
          fill: own.spatialRibbonChartFill(face),
          fillOpacity: product(own.spatialRibbonChartArea(1), own.spatialRibbonChartThrough(1)),
          stroke: own.spatialRibbonChartLine(own.spatialRibbonChartEdge),
          strokeLinejoin: 'round',
          strokeOpacity: own.spatialRibbonChartThrough(1),
          strokeWidth: token('border-thin'),
          vectorEffect: 'non-scaling-stroke',
        }),
        rule(
          { emphasis: 'outlined' },
          {
            own: {
              spatialRibbonChartFill: mix(face, 60, token('color-background')),
              spatialRibbonChartLine: color,
            },
          },
        ),
        rule(
          { emphasis: 'subtle' },
          { own: { spatialRibbonChartArea: 0.2, spatialRibbonChartLine: color } },
        ),
      ]),
      /* `frosted` admits less, which on a mark is more ink: 0.88 against
         glass's 0.72, the material tokens every glass surface reads. */
      on('host', [
        rule(
          { material: 'glass' },
          { own: { spatialRibbonChartThrough: token('material-glass-opacity') } },
        ),
        rule(
          { material: 'frosted' },
          { own: { spatialRibbonChartThrough: token('material-frosted-opacity') } },
        ),
      ]),
      /* Print: a face is a fill, so each takes an edge in the border's ink as well. */
      on('face', [web([rule({ print: true }, { stroke: token('color-border') })])]),
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
