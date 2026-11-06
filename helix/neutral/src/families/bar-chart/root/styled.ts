import barChartLayout from '../../../fragments/bar-chart-layout.js'
import chartStatus from '../../../fragments/chart-status.js'
import chartTooltip from '../../../fragments/chart-tooltip.js'
import printExact from '../../../fragments/print-exact.js'
import { oneOf } from '../../../render.js'
import {
  fn,
  list,
  measured,
  mix,
  native,
  product,
  quotient,
  scheme,
  token,
  web,
} from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * Bar Chart's styled tier.
 *
 * **The columns take the series palette in order**, so a chart with one
 * series uses the first color and a chart with four uses the first four, and
 * a cell's `data-tone` takes the token it names. **Only the far end of a
 * column is rounded**, so it sits flat on the rule it is measured from: the
 * web clips the square shape, and a phone draws the corners into the path,
 * in the plot's measured points.
 *
 * **Emphasis and material are two knobs.** `--_bar-chart-area` is how much
 * of the fill emphasis draws and `--_bar-chart-through` how much of it
 * material lets past, and the paint multiplies them. `outlined` fades the
 * fill toward the page under an edge in the series color, `subtle` washes it
 * under the same edge, and neither draws the edge across the base, which
 * stands on the baseline. `glass` lets the gridlines read through, and
 * `wash="gradient"` fades each column toward its base.
 *
 * **The plot and the names are two rows of one grid**, or two columns under
 * `orientation="horizontal"`, and the numbers of a scale stand in a column
 * or a row of their own beside the plot, each centered on its level.
 *
 * **Web only:** the columns growing in and easing to new readings, the
 * crosshair, printing, and the fade of the other categories easing in. A
 * phone mixes a tone's swatch at the resting share.
 */
export default styles(
  root,
  {
    prefix: 'bar-chart',
    hooks: {
      bandColor: token('color-surface-sunken'),
      barRadius: quotient(token('radii-sm'), 2),
      barStroke: token('border-thick'),
      blockSize: '12em',
      gap: token('space-2xs'),
      gridlineColor: token('color-border'),
      lineColor: null,
      lineWidth: null,
      toneAccent: token('color-accent'),
      toneDanger: token('color-danger'),
      toneInfo: token('color-info'),
      toneMuted: token('color-foreground-subtle'),
      tonePrimary: token('color-primary'),
      toneSuccess: token('color-success'),
      toneWarning: token('color-warning-mark'),
    },
    own: {
      barChartArea: null,
      barChartBase: null,
      barChartCorners: null,
      barChartFoot: null,
      barChartSeries: null,
      barChartShade: null,
      barChartThrough: null,
    },
    props: {
      emphasis: oneOf(['outlined', 'solid', 'subtle']),
      material: oneOf(['frosted', 'glass']),
      wash: oneOf(['gradient']),
    },
    stylesheet: 'bar-chart/root/bar-chart-root.generated.css',
  },
  ({ hook, include, on, own, rule }) => {
    const easing = token('easing-decelerate')
    const radius = hook.barRadius
    const half = quotient(hook.barStroke, 2)
    const sideways = { orientation: 'horizontal' } as const
    const upright = { orientation: { not: 'horizontal' } } as const
    return [
      include(chartStatus),
      include(chartTooltip),
      /* Two rows, the drawing and the words under it. */
      on('host', [rule({ display: 'grid', gap: hook.gap, position: 'relative' })]),
      /* The bubble's containing block, which is the plot and not the host. */
      on('plot', [rule({ blockSize: hook.blockSize, position: 'relative' })]),
      on('svg', [
        rule({ blockSize: '100%', inlineSize: '100%', overflow: 'visible' }),
        native([rule({ inset: 0, position: 'absolute' })]),
      ]),
      /* A phone's canvases of the columns, the reading's columns, and the lines, over the rules. */
      on(
        ['columns', 'columns-svg', 'lines-svg'],
        [native([rule({ inset: 0, position: 'absolute' })])],
      ),
      /* The line the columns stand on, kept a line however the drawing is stretched. */
      on('baseline', [
        rule({
          stroke: token('color-border'),
          strokeWidth: token('border-thin'),
          vectorEffect: 'non-scaling-stroke',
        }),
      ]),
      /* Rounded at the far end only, which depends on which way it grows. */
      on('bar', [
        rule({
          own: {
            barChartBase: [0, 0, half, 0],
            barChartCorners: [radius, radius, 0, 0],
            barChartSeries: measured('chart-series'),
          },
          fill: own.barChartSeries,
          fillOpacity: product(own.barChartArea(1), own.barChartThrough(1)),
          strokeOpacity: own.barChartThrough(1),
          web: {
            clipPath: [
              fn('inset', [own.barChartFoot(0), 'round', own.barChartCorners]),
              'fill-box',
            ],
          },
        }),
        /* In dark the shade is a darker step of the series itself, where a mix toward the
           black page went gray; a phone mixes more of the series instead. */
        web([
          rule({
            own: {
              barChartShade: scheme(
                mix(own.barChartSeries, 60, token('color-background')),
                fn('oklch', ['from', own.barChartSeries, 'calc(l * 0.7)', 'min(c, 0.14)', 'h']),
              ),
            },
          }),
        ]),
        native([
          rule({
            own: {
              barChartShade: scheme(
                mix(own.barChartSeries, 60, token('color-background')),
                mix(own.barChartSeries, 70, token('color-background')),
              ),
            },
          }),
        ]),
        rule(sideways, {
          own: { barChartBase: [0, 0, 0, half], barChartCorners: [0, radius, radius, 0] },
        }),
        /* Below zero, the far end is the other end, and the base is the edge nearer zero. */
        rule(
          { also: { 'bar-end-negative': true } },
          {
            own: { barChartCorners: [0, 0, radius, radius] },
          },
        ),
        rule(
          { ...sideways, also: { 'bar-end-negative': true } },
          {
            own: { barChartCorners: [radius, 0, 0, radius] },
          },
        ),
        rule({ also: { 'bar-negative': true } }, { own: { barChartBase: [half, 0, 0, 0] } }),
        rule(
          { ...sideways, also: { 'bar-negative': true } },
          {
            own: { barChartBase: [0, half, 0, 0] },
          },
        ),
        /* A stack is one column, so only its far ends are rounded. */
        rule({ also: { 'bar-end': false }, stacked: true }, { own: { barChartCorners: 0 } }),
      ]),
      on('bar-edge', [native([rule({ own: { barChartSeries: measured('chart-series') } })])]),
      /* Written out: a dense chart's columns are a `path` and not a `rect`, which no part says. */
      on({ part: 'bar', selector: ':host path[part~="bar"]' }, [
        web([rule({ own: { barChartCorners: 0 } })]),
      ]),
      on('line', [rule({ own: { barChartSeries: measured('chart-series') } })]),
      include(barChartLayout),
      /* The tones a cell can name with `data-tone`, from the tokens: the web's
         element points a column at its tone's hook, and a phone reads it here.
         A tone with no hook keeps its series' color. */
      on(
        ['bar', 'bar-edge'],
        [
          native([
            rule({ 'data-tone': 'accent' }, { own: { barChartSeries: hook.toneAccent } }),
            rule({ 'data-tone': 'danger' }, { own: { barChartSeries: hook.toneDanger } }),
            rule({ 'data-tone': 'info' }, { own: { barChartSeries: hook.toneInfo } }),
            rule({ 'data-tone': 'muted' }, { own: { barChartSeries: hook.toneMuted } }),
            rule({ 'data-tone': 'primary' }, { own: { barChartSeries: hook.tonePrimary } }),
            rule({ 'data-tone': 'success' }, { own: { barChartSeries: hook.toneSuccess } }),
            rule({ 'data-tone': 'warning' }, { own: { barChartSeries: hook.toneWarning } }),
          ]),
        ],
      ),
      on('host', [
        rule({
          '--bar-chart-tone-accent': token('color-accent'),
          '--bar-chart-tone-danger': token('color-danger'),
          '--bar-chart-tone-info': token('color-info'),
          '--bar-chart-tone-muted': token('color-foreground-subtle'),
          '--bar-chart-tone-primary': token('color-primary'),
          '--bar-chart-tone-success': token('color-success'),
          '--bar-chart-tone-warning': token('color-warning-mark'),
        }),
      ]),
      /* Written out: the categories the bubble is not about, faded, while a group is active. */
      on(
        {
          part: 'group',
          selector: '[part="plot"]:has([data-active]) [part~="group"]:not([data-active])',
        },
        [web([rule({ opacity: 0.45 })])],
      ),
      on('group', [web([rule({ transition: ['opacity', token('duration-fast'), easing] })])]),
      /* A phone fades its canvas of every column, and draws the category shown again over it. */
      on('columns', [native([rule({ 'data-faded': true }, { opacity: 0.45 })])]),
      /* A chart never animates through a value it does not have. */
      on('bar', [
        web([
          rule({
            transition: list(
              ['height', token('duration-normal'), easing],
              ['width', token('duration-normal'), easing],
              ['x', token('duration-normal'), easing],
              ['y', token('duration-normal'), easing],
            ),
          }),
        ]),
      ]),
      /* Written out: the columns drawn again over a path of them stand where the reader moved them. */
      on(
        {
          part: 'bar',
          selector:
            ':host :where([part~="group"]:has(> path) ~ [part~="group-active"]) [part~="bar"]',
        },
        [web([rule({ transition: 'none' })])],
      ),
      /* A column grows in from its base: its geometry, which only a web block writes. */
      on('bar', [
        rule({ ...upright, startingStyle: true }, { web: { height: 0, y: 100 } }),
        rule({ ...sideways, startingStyle: true }, { web: { width: 0 } }),
      ]),
      on('plot', [rule({ web: { cursor: 'crosshair' } })]),
      on('gridline', [
        rule({
          stroke: hook.gridlineColor,
          strokeWidth: token('border-thin'),
          vectorEffect: 'non-scaling-stroke',
        }),
      ]),
      on('band', [
        rule({ fill: hook.bandColor }),
        /* A phone draws it as a box behind the columns' canvas, as long as the plot across the measure. */
        native([
          rule({ backgroundColor: hook.bandColor, pointerEvents: 'none', position: 'absolute' }),
          rule(upright, {
            inlineSize: measured('chart-band-width'),
            insetBlock: 0,
            insetInlineStart: measured('chart-band-x'),
          }),
          rule(sideways, {
            blockSize: measured('chart-band-height'),
            insetBlockStart: measured('chart-band-y'),
            insetInline: 0,
          }),
        ]),
      ]),
      /* A series drawn as a line across the columns, under `lines`. */
      on('line', [
        rule({
          fill: 'none',
          stroke: hook.lineColor(own.barChartSeries(token('color-series-1'))),
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          strokeWidth: hook.lineWidth(measured('_chart-stroke', '2px')),
          vectorEffect: 'non-scaling-stroke',
        }),
      ]),
      /* The edge, and the fill faded toward the page under it, with no line across the base. */
      on('bar', [
        rule(
          { 'data-emphasis': 'outlined' },
          {
            own: { barChartFoot: own.barChartBase },
            fill: own.barChartShade,
            stroke: own.barChartSeries,
            strokeWidth: hook.barStroke,
            vectorEffect: 'non-scaling-stroke',
          },
        ),
        /* A wash under the same edge, the quiet end of the axis. */
        rule(
          { 'data-emphasis': 'subtle' },
          {
            own: { barChartArea: 0.2, barChartFoot: own.barChartBase },
            stroke: own.barChartSeries,
            strokeWidth: hook.barStroke,
            vectorEffect: 'non-scaling-stroke',
          },
        ),
        /* Gradient, into the wash the headless tier draws, for each series. */
        rule({ wash: 'gradient' }, { fill: measured('chart-bar-wash') }),
        rule(
          { emphasis: 'outlined', 'data-emphasis': false },
          {
            own: { barChartFoot: own.barChartBase },
            fill: own.barChartShade,
            stroke: own.barChartSeries,
            strokeWidth: hook.barStroke,
            vectorEffect: 'non-scaling-stroke',
          },
        ),
        rule(
          { emphasis: 'subtle', 'data-emphasis': false },
          {
            own: { barChartArea: 0.2, barChartFoot: own.barChartBase },
            stroke: own.barChartSeries,
            strokeWidth: hook.barStroke,
            vectorEffect: 'non-scaling-stroke',
          },
        ),
        /* Glass lets the gridlines read through; frosted admits less. */
        rule(
          { 'data-material': 'glass' },
          {
            own: { barChartThrough: token('material-glass-opacity') },
          },
        ),
        rule(
          { material: 'glass', 'data-material': false },
          {
            own: { barChartThrough: token('material-glass-opacity') },
          },
        ),
        rule(
          { material: 'frosted', 'data-material': false },
          {
            own: { barChartThrough: token('material-frosted-opacity') },
          },
        ),
        native([rule({ stroke: 'none' })]),
      ]),
      /* A phone draws the edge `outlined` and `subtle` ask for as a path of its own, open at the base. */
      on('bar-edge', [
        native([
          rule({
            fill: 'none',
            stroke: own.barChartSeries,
            strokeOpacity: own.barChartThrough(1),
            strokeWidth: hook.barStroke,
            vectorEffect: 'non-scaling-stroke',
          }),
          rule(
            { 'data-material': 'glass' },
            {
              own: { barChartThrough: token('material-glass-opacity') },
            },
          ),
          rule(
            { 'data-material': false, material: 'glass' },
            {
              own: { barChartThrough: token('material-glass-opacity') },
            },
          ),
          rule(
            { 'data-material': false, material: 'frosted' },
            {
              own: { barChartThrough: token('material-frosted-opacity') },
            },
          ),
        ]),
      ]),
      on('bar-wash-start', [
        rule({
          stopColor: measured('chart-series'),
          stopOpacity: product(1, token('material-opacity')),
        }),
      ]),
      /* The far stop keeps some color, so a column keeps its edge at its base. */
      on('bar-wash-end', [
        rule({
          stopColor: measured('chart-series'),
          stopOpacity: product(0.35, token('material-opacity')),
        }),
      ]),
      include(printExact),
      /* The summary is said and not shown. */
      on('summary', [
        web([
          rule({
            blockSize: '1px',
            clipPath: 'inset(50%)',
            inlineSize: '1px',
            margin: token('space-none'),
            overflow: 'hidden',
            position: 'absolute',
            whiteSpace: 'nowrap',
          }),
        ]),
      ]),
    ]
  },
)
