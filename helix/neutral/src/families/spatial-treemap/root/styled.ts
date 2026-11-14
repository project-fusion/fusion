import chartSpatial from '../../../fragments/chart-spatial.js'
import chartStatus from '../../../fragments/chart-status.js'
import chartTooltip from '../../../fragments/chart-tooltip.js'
import { oneOf } from '../../../render.js'
import { difference, fn, measured, mix, native, product, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * Spatial Treemap's styled tier.
 *
 * **The plot is square up to 26em tall, then as wide as its column at that
 * height**, as Spatial Scatter Chart's is: the hook sets one height, and the
 * plot always takes the width the page gives it.
 *
 * **Each face of a block is its group's color, darkened by how far it turns
 * from the light**: the top whole, and the sides the steps the projection
 * gives them, so a block reads as a block from any side. The edge is the face
 * a step lighter where it is dark and darker where it is light. The web works
 * both out with a relative color from the shade the element writes on each
 * face; a phone's drawing works out the same colors and writes them on each
 * face, since React Native draws no relative color.
 *
 * **Emphasis and material, as every chart reads them.** `outlined` is a
 * block as its edges in its color over faces faded toward the page, and
 * `subtle` the same edges over a faint wash, which shows the blocks behind.
 * **The outline again over every block, faint and dashed**: where the block
 * shows, the ring covers it, and where others hide it, this says where it
 * stands.
 *
 * **Web only:** printing, and forced colors, which paint every background the
 * page's Canvas color, so the blocks keep their colors, which are the groups,
 * and take an edge in the system's text color.
 */
export default styles(
  root,
  {
    prefix: 'spatial-treemap',
    hooks: { blockSize: null },
    own: {
      spatialTreemapArea: null,
      spatialTreemapColor: null,
      spatialTreemapEdge: null,
      spatialTreemapFace: null,
      spatialTreemapFill: null,
      spatialTreemapLine: null,
      spatialTreemapThrough: null,
    },
    props: {
      emphasis: oneOf(['outlined', 'solid', 'subtle']),
      material: oneOf(['frosted', 'glass']),
      separation: oneOf(['filled', 'plain']),
    },
    stylesheet: 'spatial-treemap/root/spatial-treemap-root.generated.css',
  },
  ({ hook, include, on, own, rule }) => {
    const series = measured('chart-series', token('color-primary'))
    const color = own.spatialTreemapColor
    const face = own.spatialTreemapFace
    /* How far a face turns from the light, which the element writes on each face. */
    const shade = measured('spatial-treemap-shade', 0)
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
      on('block', [web([rule({ own: { spatialTreemapColor: series } })])]),
      on('face', [
        web([
          rule({
            own: {
              spatialTreemapFace: fn('oklch', [
                'from',
                color,
                difference('l', product(shade, 0.5)),
                'c',
                'h',
              ]),
              spatialTreemapEdge: fn('oklch', [
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
              spatialTreemapColor: series,
              spatialTreemapEdge: measured('spatial-treemap-edge', series),
              spatialTreemapFace: measured('spatial-treemap-face', series),
            },
          }),
        ]),
        rule({
          fill: own.spatialTreemapFill(face),
          fillOpacity: product(own.spatialTreemapArea(1), own.spatialTreemapThrough(1)),
          stroke: own.spatialTreemapLine(own.spatialTreemapEdge),
          strokeLinejoin: 'round',
          strokeOpacity: own.spatialTreemapThrough(1),
          strokeWidth: token('border-thin'),
          vectorEffect: 'non-scaling-stroke',
        }),
        rule(
          { emphasis: 'outlined' },
          {
            own: {
              spatialTreemapFill: mix(face, 60, token('color-background')),
              spatialTreemapLine: color,
            },
          },
        ),
        rule(
          { emphasis: 'subtle' },
          { own: { spatialTreemapArea: 0.2, spatialTreemapLine: color } },
        ),
      ]),
      /* `frosted` admits less, which on a mark is more ink: 0.88 against
         glass's 0.72, the material tokens every glass surface reads. */
      on('host', [
        rule(
          { material: 'glass' },
          { own: { spatialTreemapThrough: token('material-glass-opacity') } },
        ),
        rule(
          { material: 'frosted' },
          { own: { spatialTreemapThrough: token('material-frosted-opacity') } },
        ),
      ]),
      on('ring-behind', [
        rule({
          fill: 'none',
          opacity: 0.6,
          pointerEvents: 'none',
          stroke: token('color-foreground'),
          strokeDasharray: ['3px', '2px'],
          strokeWidth: token('border-thin'),
          vectorEffect: 'non-scaling-stroke',
        }),
      ]),
      /* Print: a face is a fill, so each takes an edge in the border's ink as well. */
      on('face', [web([rule({ print: true }, { stroke: token('color-border') })])]),
      on('face', [
        web([rule({ forcedColors: true }, { forcedColorAdjust: 'none', stroke: 'CanvasText' })]),
      ]),
      on('grid', [web([rule({ forcedColors: true }, { stroke: 'CanvasText' })])]),
      on(['tick', 'axis-name'], [web([rule({ forcedColors: true }, { fill: 'CanvasText' })])]),
      on(['ring', 'ring-behind'], [web([rule({ forcedColors: true }, { stroke: 'Highlight' })])]),
      /* The axis names' plate is the canvas, as the ground is. */
      on('axis-name', [web([rule({ forcedColors: true }, { stroke: 'Canvas' })])]),
    ]
  },
)
