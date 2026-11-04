import chartStatus from '../../../fragments/chart-status.js'
import chartTooltip from '../../../fragments/chart-tooltip.js'
import printExact from '../../../fragments/print-exact.js'
import { fn, inherited, measured, mix, native, product, sum, token, web } from '../../../style.js'
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
 * their own beside the plot, each centered on its level. The rules stand over
 * the bands, so they read on a fill as well as on the page.
 *
 * **Web only:** the bands fading in and easing to new readings, the
 * crosshair, printing, and the strength `--area-chart-fill-strength` gives a
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
            fill: fn(
              'color-mix',
              ['in', 'oklab'],
              [series, hook.fillStrength],
              token('color-background'),
            ),
            stroke: 'none',
          }),
        ]),
        native([rule({ fill: mix(series, 55, token('color-background')), stroke: 'none' })]),
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
          position: 'absolute',
          translate: [0, '-50%'],
          whiteSpace: 'nowrap',
        }),
        native([rule({ insetBlockStart: measured('chart-tick-y') })]),
      ]),
      on('host', [web([rule({ valueAxis: true }, { gridTemplateColumns: 'auto 1fr' })])]),
      on('axis', [web([rule({ valueAxis: true }, { gridColumn: 1, gridRow: 1 })])]),
      on(['plot', 'labels'], [web([rule({ valueAxis: true }, { gridColumn: 2 })])]),
      /* A phone stands the axis beside the plot in the room the host leaves at
         its start, as wide as the chart measures the widest number. */
      on('host', [
        native([
          rule(
            { valueAxis: true },
            { paddingInlineStart: sum(measured('area-chart-axis-size'), hook.gap) },
          ),
        ]),
      ]),
      on('axis', [
        native([
          rule(
            { valueAxis: true },
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
      /* A chart never animates through a value it does not have. */
      on(
        ['area', 'line'],
        [
          web([
            rule({ transition: ['d', token('duration-normal'), easing] }),
            rule({ startingStyle: true }, { opacity: 0 }),
          ]),
        ],
      ),
      include(printExact),
    ]
  },
)
