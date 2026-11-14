import chartTooltip from '../../../fragments/chart-tooltip.js'
import spatialHeatmapEdges from '../../../fragments/spatial-heatmap-edges.js'
import { oneOf } from '../../../render.js'
import {
  difference,
  fn,
  hookOf,
  measured,
  mix,
  native,
  product,
  scheme,
  token,
  web,
} from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * Spatial Heatmap's styled tier.
 *
 * **The drawing scales through its `viewBox`, so the sheet sets how large a
 * cell may grow**: the strip is that many cells across at 30 degrees, and
 * never wider than its box.
 *
 * **Every face is shaded from the cell's tone**, Heatmap's ramp and status
 * colors, which a page sets through `--heatmap-tone-*`: the top takes the
 * tone, and each side a step and two steps less light, which keeps the hue.
 * An empty day is the floor's tile, a little lighter than the slab. Each edge
 * is a little lighter than its face where it is dark and darker where it is
 * light. The prism the keys rest on, a hovered one, and a selected one take a
 * thicker edge, a selected one dashed. A phone's machine works out the colors
 * the web's relative colors do and writes them on each face.
 *
 * **Emphasis and material, as every chart reads them**: `outlined` is the
 * edges in the tone over faces faded toward the page, `subtle` the edges over
 * a faint wash, and `glass` and `frosted` let a share of the paint through.
 *
 * **Web only:** the hover ring, the renderer's box, printing, and forced colors.
 */
export default styles(
  root,
  {
    prefix: 'spatial-heatmap',
    hooks: {
      cellSize: '1.25rem',
      leftShade: 0.07,
      rightShade: 0.14,
      selectedColor: null,
    },
    own: {
      spatialHeatmapArea: null,
      spatialHeatmapEdge: null,
      spatialHeatmapFace: null,
      spatialHeatmapFar: null,
      spatialHeatmapFill: null,
      spatialHeatmapInk: null,
      spatialHeatmapLeft: null,
      spatialHeatmapLine: null,
      spatialHeatmapRight: null,
      spatialHeatmapThrough: null,
      spatialHeatmapTop: null,
    },
    props: {
      emphasis: oneOf(['outlined', 'solid', 'subtle']),
      material: oneOf(['frosted', 'glass']),
      separation: oneOf(['filled', 'plain']),
    },
    stylesheet: 'spatial-heatmap/root/spatial-heatmap-root.generated.css',
  },
  ({ hook, include, on, own, rule }) => {
    const sunken = token('color-surface-sunken')
    const far = own.spatialHeatmapFar
    const top = own.spatialHeatmapTop
    const face = own.spatialHeatmapFace
    const edge = own.spatialHeatmapEdge
    const ink = own.spatialHeatmapInk
    const through = own.spatialHeatmapThrough(1)
    const thick = token('border-thick')
    const faces = [
      'left-face',
      'right-face',
      'top-face',
      'base-left',
      'base-right',
      'base-top',
    ] as const
    const drawn = {
      own: {
        spatialHeatmapInk: fn('oklch', ['from', face, 'clamp(0, (0.6 - l) * 1000, 1)', 0, 0]),
        spatialHeatmapEdge: fn('oklch', [
          'from',
          face,
          'calc(l + clamp(-0.08, (0.6 - l) * 1000, 0.1))',
          'c',
          'h',
        ]),
      },
      fill: face,
      stroke: edge,
      strokeLinejoin: 'round',
      strokeWidth: token('border-thin'),
      vectorEffect: 'non-scaling-stroke',
    }
    return [
      include(chartTooltip),
      /* A grid of one track, so the footer is as wide as the strip. The ramp's far
         end, the strong primary, which dark holds under a lightness of 0.87. */
      on('host', [
        web([
          rule({
            own: {
              spatialHeatmapFar: scheme(
                token('color-primary-strong'),
                fn('oklch', ['from', token('color-primary-strong'), 'min(l, 0.87)', 'c', 'h']),
              ),
            },
            display: 'grid',
            gridTemplateColumns: fn('minmax', 0, 'max-content'),
          }),
        ]),
        /* A phone's column, across its box as the web's grid is, the strip and
           the footer at its start. */
        native([
          rule({
            alignItems: 'flex-start',
            alignSelf: 'stretch',
            display: 'flex',
            flexDirection: 'column',
          }),
        ]),
      ]),
      on('strip', [
        web([
          rule({
            inlineSize: product(product(measured('spatial-heatmap-span', 1), 0.866), hook.cellSize),
            maxInlineSize: '100%',
            position: 'relative',
          }),
        ]),
        /* A phone's strip is the size its machine works out from the same arithmetic. */
        native([
          rule({
            blockSize: measured('heatmap-strip-height'),
            inlineSize: measured('heatmap-strip-width'),
            position: 'relative',
          }),
        ]),
      ]),
      on({ region: 'renderer', slotted: '*' }, [web([rule({ inset: 0, position: 'absolute' })])]),
      /* The ground, where a page asks for one, holds the strip and its labels. */
      on('host', [
        web([
          rule(
            { separation: 'filled' },
            {
              backgroundColor: token('color-surface-filled'),
              borderRadius: token('radii-md'),
              boxSizing: 'border-box',
              inlineSize: 'fit-content',
              maxInlineSize: '100%',
              padding: token('space-md'),
            },
          ),
        ]),
      ]),
      on('drawing', [
        web([
          rule({
            blockSize: 'auto',
            display: 'block',
            inlineSize: '100%',
            overflow: 'visible',
            touchAction: 'pan-y',
            userSelect: 'none',
          }),
        ]),
        native([rule({ inset: 0, position: 'absolute' })]),
      ]),
      on(
        ['cell', 'base'],
        [
          web([
            rule({
              own: {
                spatialHeatmapLeft: fn('oklch', [
                  'from',
                  top,
                  difference('l', hook.leftShade),
                  'c',
                  'h',
                ]),
                spatialHeatmapRight: fn('oklch', [
                  'from',
                  top,
                  difference('l', hook.rightShade),
                  'c',
                  'h',
                ]),
              },
            }),
          ]),
        ],
      ),
      /* A cell with no tone is the floor's own tile; each tone is Heatmap's, through its hook, so a page sets one for both. */
      on('cell', [
        web([
          rule({ own: { spatialHeatmapTop: mix(token('color-surface'), 60, sunken) } }),
          rule(
            { 'data-tone': '1' },
            { own: { spatialHeatmapTop: hookOf('heatmap', 'tone-1', mix(far, 35, sunken)) } },
          ),
          rule(
            { 'data-tone': '2' },
            { own: { spatialHeatmapTop: hookOf('heatmap', 'tone-2', mix(far, 51, sunken)) } },
          ),
          rule(
            { 'data-tone': '3' },
            { own: { spatialHeatmapTop: hookOf('heatmap', 'tone-3', mix(far, 68, sunken)) } },
          ),
          rule(
            { 'data-tone': '4' },
            { own: { spatialHeatmapTop: hookOf('heatmap', 'tone-4', mix(far, 84, sunken)) } },
          ),
          rule(
            { 'data-tone': '5' },
            { own: { spatialHeatmapTop: hookOf('heatmap', 'tone-5', far) } },
          ),
          rule(
            { 'data-tone': 'accent' },
            { own: { spatialHeatmapTop: hookOf('heatmap', 'tone-accent', token('color-accent')) } },
          ),
          rule(
            { 'data-tone': 'danger' },
            { own: { spatialHeatmapTop: hookOf('heatmap', 'tone-danger', token('color-danger')) } },
          ),
          rule(
            { 'data-tone': 'info' },
            { own: { spatialHeatmapTop: hookOf('heatmap', 'tone-info', token('color-info')) } },
          ),
          rule(
            { 'data-tone': 'muted' },
            { own: { spatialHeatmapTop: hookOf('heatmap', 'tone-muted', sunken) } },
          ),
          rule(
            { 'data-tone': 'primary' },
            {
              own: { spatialHeatmapTop: hookOf('heatmap', 'tone-primary', token('color-primary')) },
            },
          ),
          rule(
            { 'data-tone': 'success' },
            {
              own: { spatialHeatmapTop: hookOf('heatmap', 'tone-success', token('color-success')) },
            },
          ),
          rule(
            { 'data-tone': 'warning' },
            {
              own: {
                spatialHeatmapTop: hookOf('heatmap', 'tone-warning', token('color-warning-mark')),
              },
            },
          ),
        ]),
      ]),
      /* The slab: a step darker than an empty tile, so the empty days read as tiles let into it. */
      on('base', [
        web([rule({ own: { spatialHeatmapTop: mix(token('color-border'), 45, sunken) } })]),
      ]),
      on(['top-face', 'base-top'], [web([rule({ own: { spatialHeatmapFace: top } })])]),
      on(
        ['left-face', 'base-left'],
        [web([rule({ own: { spatialHeatmapFace: own.spatialHeatmapLeft } })])],
      ),
      on(
        ['right-face', 'base-right'],
        [web([rule({ own: { spatialHeatmapFace: own.spatialHeatmapRight } })])],
      ),
      /* The ink a ring takes and the edge each face draws, worked out from the face. */
      on({ part: 'cell', inner: '> *' }, [web([rule(drawn)])]),
      on({ part: 'base', inner: '> *' }, [web([rule(drawn)])]),
      /* A selected prism has dashed edges, so it reads apart from the one the keys rest on. */
      on({ part: 'cell', inner: '> *' }, [
        web([
          rule(
            { also: { 'cell-selected': true } },
            {
              stroke: hook.selectedColor(ink),
              strokeDasharray: ['3px', '2px'],
              strokeWidth: thick,
            },
          ),
          rule(
            { also: { 'cell-active': true } },
            { stroke: ink, strokeDasharray: 'none', strokeWidth: thick },
          ),
          /* Emphasis decides what a prism draws and material how much comes through. */
          rule({
            fill: own.spatialHeatmapFill(face),
            fillOpacity: product(own.spatialHeatmapArea(1), through),
            stroke: own.spatialHeatmapLine(edge),
            strokeOpacity: through,
          }),
          rule(
            { emphasis: 'outlined' },
            {
              own: {
                spatialHeatmapFill: mix(face, 60, token('color-background')),
                spatialHeatmapLine: face,
              },
            },
          ),
          rule(
            { emphasis: 'subtle' },
            { own: { spatialHeatmapArea: 0.2, spatialHeatmapLine: face } },
          ),
        ]),
      ]),
      on('host', [
        web([
          rule(
            { material: 'glass' },
            { own: { spatialHeatmapThrough: token('material-glass-opacity') } },
          ),
          rule(
            { material: 'frosted' },
            { own: { spatialHeatmapThrough: token('material-frosted-opacity') } },
          ),
        ]),
      ]),
      /* A phone's faces, in the colors its machine works out for each, as the web's are. */
      on(faces, [
        native([
          rule({
            fill: measured('spatial-heatmap-fill', sunken),
            stroke: measured('spatial-heatmap-stroke', token('color-border')),
            strokeDasharray: measured('spatial-heatmap-dash', 'none'),
            strokeLinejoin: 'round',
            strokeWidth: measured('spatial-heatmap-width', token('border-thin')),
            vectorEffect: 'non-scaling-stroke',
          }),
        ]),
      ]),
      on('strip', [
        rule(
          { focusVisible: true },
          {
            outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
            outlineOffset: token('size-focus-offset'),
          },
        ),
      ]),
      include(spatialHeatmapEdges),
      on('host', [
        web([
          rule([{ empty: true }, { error: true }, { loading: true }], {
            gridTemplateColumns: fn('minmax', 0, '1fr'),
          }),
        ]),
      ]),
      on('strip', [
        web([rule([{ empty: true }, { error: true }, { loading: true }], { gridArea: '1 / 1' })]),
      ]),
      /* Forced colors: the tones are the reading, so the faces keep them, and every edge is CanvasText. */
      on({ part: 'cell', inner: '> *' }, [
        web([rule({ forcedColors: true }, { forcedColorAdjust: 'none', stroke: 'CanvasText' })]),
      ]),
      on({ part: 'base', inner: '> *' }, [
        web([rule({ forcedColors: true }, { fill: 'Canvas', stroke: 'CanvasText' })]),
      ]),
      on({ part: 'cell', inner: '> *' }, [
        web([
          rule(
            [
              { forcedColors: true, also: { 'cell-active': true } },
              { forcedColors: true, also: { 'cell-selected': true } },
            ],
            { stroke: 'Highlight', strokeWidth: thick },
          ),
        ]),
      ]),
      /* **The ring under a hovering pointer is last**, over the edge that
         emphasis draws, the dashes of a selected prism, and the edges print
         and forced colors draw, so a pointer always finds its prism. */
      on({ part: 'cell', inner: '> *' }, [
        web([
          rule(
            { canHover: true, hover: true },
            { stroke: ink, strokeDasharray: 'none', strokeWidth: thick },
          ),
        ]),
      ]),
    ]
  },
)
