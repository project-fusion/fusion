import chartStatus from '../../../fragments/chart-status.js'
import chartTooltip from '../../../fragments/chart-tooltip.js'
import printExact from '../../../fragments/print-exact.js'
import {
  fn,
  inherited,
  list,
  measured,
  mix,
  native,
  product,
  quotient,
  scheme,
  sum,
  token,
  web,
} from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * Area Chart's styled tier.
 *
 * **The bands are opaque, and have to be.** Each is drawn as everything
 * under its top edge and the next one down covers the rest, so a band is its
 * series' color mixed toward the page, light without letting anything through
 * it, and its top edge is drawn in the series' full color, so where one part
 * ends and the next begins is drawn. **Under `overlap` the bands let each
 * other through**, being drawn from zero one in front of another.
 *
 * **The plot and the names under it are two rows of one grid**, as Line
 * Chart lays them out, and the numbers of `value-axis` stand in a column of
 * their own beside the plot, each centered on its level, unless `value-axis`
 * is `none`. The rules stand over the bands, so they read on a fill as well
 * as on the page. **In dark a band is mixed toward a black of its own hue**,
 * three quarters of the series, so it keeps its color where a mix toward the
 * page went gray.
 *
 * **Web only:** the bands fading in and easing to new readings over
 * `--chart-move-duration`, a part a legend hides fading as its band closes,
 * the guide gliding from reading to reading, the crosshair, printing, and the strength `--area-chart-fill-strength` gives a
 * band, which a phone mixes at the resting share.
 */
export default styles(
  root,
  {
    prefix: 'area-chart',
    hooks: {
      blockSize: '12em',
      fillStrength: '55%',
      gap: token('space-2xs'),
      gridlineColor: token('color-border'),
      overlapOpacity: '0.3',
      width: null,
    },
    stylesheet: 'area-chart/root/area-chart-root.generated.css',
  },
  ({ hook, include, on, rule }) => {
    const series = measured('chart-series')
    const easing = token('easing-decelerate')
    /* The privates the shared chart motion sheet sets from the public hooks. */
    const move = measured('_chart-move-duration', token('duration-normal'))
    const moveEasing = measured('_chart-move-easing', easing)
    const arrive = measured('_chart-arrive-duration', token('duration-slow'))
    return [
      include(chartStatus),
      include(chartTooltip),
      /* Two rows, the drawing and the words under it. */
      on('host', [rule({ display: 'grid', gap: hook.gap, position: 'relative' })]),
      /* The bubble's containing block, which is the plot and not the host. */
      on('plot', [
        rule({
          blockSize: hook.blockSize,
          position: 'relative',
          web: { cursor: 'crosshair' },
        }),
      ]),
      on('svg', [
        rule({ blockSize: '100%', inlineSize: '100%', overflow: 'visible' }),
        native([rule({ inset: 0, position: 'absolute' })]),
      ]),
      /* Opaque, its series' color mixed toward the page. */
      on('area', [
        web([
          rule({
            fill: scheme(
              fn(
                'color-mix',
                ['in', 'oklab'],
                [series, hook.fillStrength],
                token('color-background'),
              ),
              fn(
                'color-mix',
                ['in', 'oklch'],
                [series, hook.fillStrength('75%')],
                fn('oklch', ['from', series, 0, 'c', 'h']),
              ),
            ),
            stroke: 'none',
          }),
        ]),
        native([
          rule({
            fill: scheme(
              mix(series, 55, token('color-background')),
              mix(series, 75, token('color-background')),
            ),
            stroke: 'none',
          }),
        ]),
        /* Drawn from zero, one in front of another, so each lets the ones behind through. */
        rule({ overlap: true }, { fill: series, fillOpacity: hook.overlapOpacity }),
      ]),
      /* The top edge of each band at the series' full color. */
      on('line', [
        rule({
          stroke: series,
          strokeLinejoin: 'round',
          strokeWidth: hook.width(inherited('chart-stroke', '2px')),
          vectorEffect: 'non-scaling-stroke',
        }),
        native([rule({ fill: 'none' })]),
      ]),
      on('baseline', [
        rule({
          stroke: token('color-border'),
          strokeWidth: token('border-thin'),
          vectorEffect: 'non-scaling-stroke',
        }),
      ]),
      /* Over the bands, so they read on a fill as well as on the page. */
      on('gridline', [
        rule({
          stroke: hook.gridlineColor,
          strokeOpacity: 0.7,
          strokeWidth: token('border-thin'),
          vectorEffect: 'non-scaling-stroke',
        }),
      ]),
      on('guide', [
        rule({
          stroke: token('color-foreground-muted'),
          strokeDasharray: '3 3',
          strokeWidth: token('border-thin'),
          vectorEffect: 'non-scaling-stroke',
        }),
        /* A phone draws it as the edges of a box no wider than a line down the plot. */
        native([
          rule({
            borderColor: token('color-foreground-muted'),
            borderStyle: 'dashed',
            borderWidth: product(0.5, token('border-thin')),
            insetBlock: 0,
            insetInlineStart: measured('chart-guide-x'),
            pointerEvents: 'none',
            position: 'absolute',
          }),
        ]),
        /* From reading to reading over `--chart-glide-duration`, along a curve
           that slows as it arrives. Drawn new where its reading is when a
           reading is shown from none. */
        web([
          rule({
            transition: list([
              'translate',
              measured('_chart-glide-duration', token('duration-fast')),
              token('easing-decelerate'),
            ]),
          }),
        ]),
      ]),
      /* One cell every name stands in, each placed by the room it is given. */
      on('labels', [
        web([rule({ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)' })]),
        native([rule({ blockSize: '1.4em', fontSize: token('text-xs'), position: 'relative' })]),
      ]),
      on('label', [
        rule({
          color: token('color-foreground-muted'),
          fontSize: token('text-xs'),
          inlineSize: measured('chart-label-size'),
          overflow: 'hidden',
          textAlign: 'center',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }),
        web([rule({ gridArea: '1 / 1', marginInlineStart: measured('chart-label-start') })]),
        native([
          rule({ insetInlineStart: measured('chart-label-start'), position: 'absolute', top: 0 }),
        ]),
      ]),
      /* As tall as the plot, as wide as its widest number and a character more. */
      on('axis', [
        rule({
          color: token('color-foreground-muted'),
          fontSize: token('text-xs'),
          fontVariantNumeric: 'tabular-nums',
          inlineSize: sum(measured('area-chart-axis', '3ch'), '1ch'),
          pointerEvents: 'none',
          position: 'relative',
        }),
      ]),
      /* Centered on the level it names. */
      on('tick', [
        rule({
          insetInlineEnd: 0,
          lineHeight: 1,
          position: 'absolute',
          translate: [0, '-50%'],
          whiteSpace: 'nowrap',
        }),
        native([rule({ insetBlockStart: measured('chart-tick-y') })]),
      ]),
      on('host', [
        /* Half a number's height above the plot, so the top number stands inside the box. */
        web([
          rule(
            { valueAxis: { not: 'none' } },
            {
              columnGap: 0,
              gridTemplateColumns: 'auto 1fr',
              paddingBlockStart: quotient(token('text-xs'), 2),
            },
          ),
        ]),
      ]),
      on('axis', [
        web([
          rule(
            { valueAxis: { not: 'none' } },
            { gridColumn: 1, gridRow: 1, marginInlineEnd: hook.gap },
          ),
        ]),
      ]),
      on(['plot', 'labels'], [web([rule({ valueAxis: { not: 'none' } }, { gridColumn: 2 })])]),
      /* A phone stands the axis beside the plot in the room the host leaves at
         its start, as wide as the chart measures the widest number. */
      on('host', [
        native([
          rule(
            { valueAxis: { not: 'none' } },
            { paddingInlineStart: sum(measured('area-chart-axis-size'), hook.gap) },
          ),
        ]),
      ]),
      on('axis', [
        native([
          rule(
            { valueAxis: { not: 'none' } },
            {
              /* As tall as the plot: the names' row under it is as tall as the axis' own type. */
              bottom: sum('1.4em', hook.gap),
              inlineSize: measured('area-chart-axis-size'),
              insetInlineStart: 0,
              position: 'absolute',
              top: 0,
            },
          ),
        ]),
      ]),
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
      /* A chart never animates through a value it does not have. **And the
         opacity, which the starting style sets**: without it the fade in had
         nothing to run on, and the drawing appeared at once. */
      on(
        ['area', 'line'],
        [
          web([
            rule({
              transition: list(
                ['d', move, moveEasing],
                ['opacity', arrive, easing],
                ['visibility', arrive],
              ),
            }),
            rule({ startingStyle: true }, { opacity: 0 }),
          ]),
        ],
      ),
      /* **A part a legend hid fades as its band closes**, while the bands
         above settle onto the one below and the scale fits the parts left.
         The tier below keeps the band hidden, which `visibility` here holds
         off until the fade has run. Shown again, it fades in at the arrival's
         pace as it opens. Safari moves no path's shape, so there the band
         closes at once. */
      on('area', [web([rule({ also: { 'area-hidden': true } }, { opacity: 0 })])]),
      on('line', [web([rule({ also: { 'line-hidden': true } }, { opacity: 0 })])]),
      on({ part: 'area', selector: '[part~="area-hidden"], [part~="line-hidden"]' }, [
        web([
          rule({
            transition: list(
              ['d', move, moveEasing],
              ['opacity', move, moveEasing],
              ['visibility', move],
            ),
          }),
        ]),
      ]),
      /* **Where the browser moves no path's shape, as in Safari, the scale
         takes its new levels at once**, with the bands it measures. The
         levels a new scale adds or drops still fade. */
      on(
        ['tick', 'gridline'],
        [
          web([
            rule(
              { supports: 'not (d: path("M0 0"))' },
              { transitionProperty: 'opacity, visibility' },
            ),
          ]),
        ],
      ),
      include(printExact),
    ]
  },
)
