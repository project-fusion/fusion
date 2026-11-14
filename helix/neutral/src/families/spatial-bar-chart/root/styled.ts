import chartSpatial from '../../../fragments/chart-spatial.js'
import chartStatus from '../../../fragments/chart-status.js'
import chartTooltip from '../../../fragments/chart-tooltip.js'
import { oneOf } from '../../../render.js'
import {
  difference,
  fn,
  measured,
  mix,
  native,
  product,
  quotient,
  token,
  web,
} from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * Spatial Bar Chart's styled tier.
 *
 * **The plot is square up to 26em tall, then as wide as its column at that
 * height**, as Spatial Scatter Chart's is: the hook sets one height, and the
 * plot always takes the width the page gives it.
 *
 * **Each face of a bar is its tone's or its series' color, darkened by how
 * far it turns from the light**: the top whole, and the sides the steps the
 * projection gives them, so a bar reads as a block from any side. The edge
 * is the face a step lighter where it is dark and darker where it is light.
 * The web works both out with a relative color from the shade the element
 * writes on each face; a phone's drawing works out the same colors and
 * writes them on each face, since React Native draws no relative color.
 *
 * **Emphasis and material, as every chart reads them.** `outlined` is a bar
 * as its edges in its color over faces faded toward the page, and `subtle`
 * the same edges over a faint wash. **`muted` draws every bar in the neutral
 * ink**, the top with the most of it and each side less as it turns from the
 * light, so a bar whose cell names a tone is the one in color: a third of the
 * ink on a top, about a sixth on the side nearer the light, and a sixteenth
 * on the far one.
 *
 * **A row's bar size rides on the gap** on the web, which a block box lays
 * nothing out with and the browser resolves to pixels from any length; the
 * element reads it back and draws each bar that wide. A phone reads the
 * `barSize` hook the element sets on itself, in points.
 *
 * **Web only:** the glow under a toned bar, which a phone's drawing has no
 * blur for, printing, and forced colors, which paint every background the
 * page's Canvas color, so the bars keep their colors and take an edge in the
 * system's text color.
 */
export default styles(
  root,
  {
    prefix: 'spatial-bar-chart',
    hooks: {
      barSize: null,
      blockSize: null,
      toneAccent: token('color-accent'),
      toneDanger: token('color-danger'),
      toneInfo: token('color-info'),
      toneMuted: token('color-foreground-subtle'),
      tonePrimary: token('color-primary'),
      toneSuccess: token('color-success'),
      toneWarning: token('color-warning-mark'),
    },
    own: {
      spatialBarChartArea: null,
      spatialBarChartColor: null,
      spatialBarChartEdge: null,
      spatialBarChartFace: null,
      spatialBarChartFill: null,
      spatialBarChartLine: null,
      spatialBarChartThrough: null,
    },
    props: {
      emphasis: oneOf(['muted', 'outlined', 'solid', 'subtle']),
      material: oneOf(['frosted', 'glass']),
      separation: oneOf(['filled', 'plain']),
    },
    stylesheet: 'spatial-bar-chart/root/spatial-bar-chart-root.generated.css',
  },
  ({ hook, include, on, own, rule }) => {
    const series = measured('chart-series', token('color-primary'))
    const color = own.spatialBarChartColor
    const face = own.spatialBarChartFace
    /* How far a face turns from the light, which the element writes on each face. */
    const shade = measured('spatial-bar-chart-shade', 0)
    return [
      include(chartSpatial),
      include(chartStatus),
      include(chartTooltip),
      /* The tones a cell can name with `data-tone`, from the tokens, as Bar
         Chart's are. A bar whose tone has no property here takes its series'
         color, which the element writes as the fallback. The mark warning is
         amber in light, since a bar is a shape. */
      on('host', [
        rule({
          '--spatial-bar-chart-tone-accent': token('color-accent'),
          '--spatial-bar-chart-tone-danger': token('color-danger'),
          '--spatial-bar-chart-tone-info': token('color-info'),
          '--spatial-bar-chart-tone-muted': token('color-foreground-subtle'),
          '--spatial-bar-chart-tone-primary': token('color-primary'),
          '--spatial-bar-chart-tone-success': token('color-success'),
          '--spatial-bar-chart-tone-warning': token('color-warning-mark'),
        }),
      ]),
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
      on('fallback', [
        web([
          rule({ layout: 'diagonal' }, { columnGap: hook.barSize('normal') }),
          rule({ layout: 'row' }, { columnGap: hook.barSize('normal') }),
        ]),
      ]),
      /* A row's floor: each place as a thin outline in the border's ink. */
      on('floor', [
        rule({
          fill: 'none',
          stroke: token('color-border'),
          strokeLinejoin: 'round',
          strokeWidth: token('border-thin'),
          vectorEffect: 'non-scaling-stroke',
        }),
      ]),
      /* A name under a toned bar takes the tone, and the value over the bar the full ink. */
      on({ part: 'tick', selector: ':host [part="tick"][data-tone]' }, [
        web([rule({ fill: measured('chart-series', token('color-foreground-muted')) })]),
      ]),
      on('tick', [
        native([
          rule(
            { 'data-toned': true },
            { color: measured('chart-series', token('color-foreground-muted')) },
          ),
        ]),
      ]),
      on('value', [
        rule({ fontVariantNumeric: 'tabular-nums', fontWeight: token('weight-semibold') }),
        web([rule({ fill: token('color-foreground') })]),
        /* A phone's value is words over the drawing, centered at the place core
           gives it, as the box's numbers are. */
        native([
          rule({
            color: token('color-foreground'),
            fontFamily: token('font-sans'),
            fontSize: measured('spatial-label-size', token('text-xs')),
            left: measured('spatial-label-x'),
            lineHeight: 1,
            pointerEvents: 'none',
            position: 'absolute',
            top: measured('spatial-label-y'),
            translate: ['-50%', '-50%'],
            whiteSpace: 'nowrap',
          }),
        ]),
        web([rule({ forcedColors: true }, { fill: 'CanvasText' })]),
      ]),
      on('bar', [web([rule({ own: { spatialBarChartColor: series } })])]),
      on('face', [
        web([
          rule({
            own: {
              spatialBarChartFace: fn('oklch', [
                'from',
                color,
                difference('l', product(shade, 0.5)),
                'c',
                'h',
              ]),
              spatialBarChartEdge: fn('oklch', [
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
              spatialBarChartColor: series,
              spatialBarChartEdge: measured('spatial-bar-chart-edge', series),
              spatialBarChartFace: measured('spatial-bar-chart-face', series),
            },
          }),
          /* A toned bar's edges under `outlined` and `subtle` are its tone's. */
          rule({ 'data-tone': 'accent' }, { own: { spatialBarChartColor: hook.toneAccent } }),
          rule({ 'data-tone': 'danger' }, { own: { spatialBarChartColor: hook.toneDanger } }),
          rule({ 'data-tone': 'info' }, { own: { spatialBarChartColor: hook.toneInfo } }),
          rule({ 'data-tone': 'muted' }, { own: { spatialBarChartColor: hook.toneMuted } }),
          rule({ 'data-tone': 'primary' }, { own: { spatialBarChartColor: hook.tonePrimary } }),
          rule({ 'data-tone': 'success' }, { own: { spatialBarChartColor: hook.toneSuccess } }),
          rule({ 'data-tone': 'warning' }, { own: { spatialBarChartColor: hook.toneWarning } }),
        ]),
        rule({
          fill: own.spatialBarChartFill(face),
          fillOpacity: product(own.spatialBarChartArea(1), own.spatialBarChartThrough(1)),
          stroke: own.spatialBarChartLine(own.spatialBarChartEdge),
          strokeLinejoin: 'round',
          strokeOpacity: own.spatialBarChartThrough(1),
          strokeWidth: token('border-thin'),
          vectorEffect: 'non-scaling-stroke',
        }),
        rule(
          { emphasis: 'outlined' },
          {
            own: {
              spatialBarChartFill: mix(face, 60, token('color-background')),
              spatialBarChartLine: color,
            },
          },
        ),
        rule(
          { emphasis: 'subtle' },
          { own: { spatialBarChartArea: 0.2, spatialBarChartLine: color } },
        ),
        /* A phone's drawing writes the muted ink as each face's colors. */
        web([
          rule(
            { emphasis: 'muted' },
            {
              own: {
                spatialBarChartFill: fn(
                  'color-mix',
                  ['in', 'oklab'],
                  [token('color-foreground'), difference('30%', product(shade, '66%'))],
                  token('color-surface'),
                ),
                spatialBarChartLine: mix(token('color-foreground'), 10, 'transparent'),
              },
            },
          ),
        ]),
      ]),
      on(
        {
          part: 'face',
          selector: ':host([emphasis="muted"]) [part~="bar"][data-tone] [part="face"]',
        },
        [
          web([
            rule({
              own: {
                spatialBarChartFill: fn(
                  'color-mix',
                  ['in', 'oklab'],
                  [color, difference('100%', product(shade, '130%'))],
                  token('color-surface'),
                ),
              },
            }),
          ]),
        ],
      ),
      /* The glow under a toned bar, in its tone, shown only where it is the one bar in color. */
      on('glow', [web([rule({ emphasis: 'muted' }, { fill: mix(series, 40, 'transparent') })])]),
      /* `frosted` admits less, which on a mark is more ink: 0.88 against
         glass's 0.72, the material tokens every glass surface reads. */
      on('host', [
        rule(
          { material: 'glass' },
          { own: { spatialBarChartThrough: token('material-glass-opacity') } },
        ),
        rule(
          { material: 'frosted' },
          { own: { spatialBarChartThrough: token('material-frosted-opacity') } },
        ),
      ]),
      /* **Centered on its point, and a fiftieth of a hairline across**: inside
         the drawing a pixel is one of the `viewBox`'s units, which in a row of
         small bars is a hundred pixels or more on the page, so a mark one unit
         tall put the bubble half of that over the bar. */
      on({ part: 'mark', selector: 'foreignObject > [part="mark"]' }, [
        web([
          rule({
            blockSize: quotient(token('border-thin'), 50),
            inlineSize: quotient(token('border-thin'), 50),
            translate: ['-50%', '-50%'],
          }),
        ]),
      ]),
      /* The outline again over every bar, faint and dashed: where the bar
         shows, the ring covers it, and where others hide it, this says where
         it stands. */
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
      on(['grid', 'floor'], [web([rule({ forcedColors: true }, { stroke: 'CanvasText' })])]),
      on(['tick', 'axis-name'], [web([rule({ forcedColors: true }, { fill: 'CanvasText' })])]),
      on(['ring', 'ring-behind'], [web([rule({ forcedColors: true }, { stroke: 'Highlight' })])]),
      on('glow', [web([rule({ forcedColors: true }, { display: 'none' })])]),
      /* The axis names' plate is the canvas, as the ground is. */
      on('axis-name', [web([rule({ forcedColors: true }, { stroke: 'Canvas' })])]),
    ]
  },
)
