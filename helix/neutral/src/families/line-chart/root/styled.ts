import chartStatus from '../../../fragments/chart-status.js'
import chartTooltip from '../../../fragments/chart-tooltip.js'
import printExact from '../../../fragments/print-exact.js'
import terminus from '../../../fragments/terminus.js'
import { oneOf } from '../../../render.js'
import {
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
 * Line Chart's styled tier.
 *
 * **The lines take the series palette in order**, so a legend beside the
 * chart maps the same twenty-four colors, and **every stroke keeps its weight
 * however the plot is stretched**, as `vector-effect: non-scaling-stroke`
 * keeps it on both platforms. A mark on a reading is a stroke of no length
 * with a round cap, ringed in the page's ground so it reads over the line.
 *
 * **The plot and the names under it are two rows of one grid**, so the names
 * line up with the readings without either knowing the other's size, and the
 * numbers of `value-axis` stand in a column of their own beside the plot,
 * each centered on its level.
 *
 * **`emphasis`** mixes the lines toward the page (`subtle`), thins the wash
 * (`outlined`), or fills it in (`solid`); **`material`** lets the gridlines
 * read through the lines.
 *
 * **Web only:** the lines drawing on as they arrive and easing to new
 * readings, the dashes of a `dashed` series held still while they do, the
 * hole a `ring` terminus cuts out of the lines, the crosshair, printing, and
 * forced colors.
 */
export default styles(
  root,
  {
    prefix: 'line-chart',
    hooks: {
      areaOpacity: null,
      bandColor: token('color-surface-sunken'),
      blockSize: '12em',
      dash: '6 4',
      gap: token('space-2xs'),
      gridlineColor: token('color-border'),
      markerRingColor: token('color-background'),
      markerSize: '6px',
      width: null,
    },
    props: {
      emphasis: oneOf(['outlined', 'solid', 'subtle']),
      material: oneOf(['frosted', 'glass']),
    },
    stylesheet: 'line-chart/root/line-chart-root.generated.css',
  },
  ({ hook, include, on, rule }) => {
    const series = measured('chart-series')
    const stroke = hook.width(inherited('chart-stroke', '2px'))
    const easing = token('easing-decelerate')
    return [
      include(chartStatus),
      include(chartTooltip),
      include(terminus),
      /* Two rows, the drawing and the words under it. */
      on('host', [rule({ display: 'grid', gap: hook.gap, position: 'relative' })]),
      /* The bubble's containing block, which is the plot and not the host. */
      on('plot', [rule({ blockSize: hook.blockSize, position: 'relative' })]),
      on('svg', [
        rule({ blockSize: '100%', inlineSize: '100%', overflow: 'visible' }),
        native([rule({ inset: 0, position: 'absolute' })]),
      ]),
      /* The line, kept a line however the drawing is stretched. */
      on('line', [
        rule({
          fill: 'none',
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          strokeWidth: stroke,
          vectorEffect: 'non-scaling-stroke',
        }),
      ]),
      /* The wash, flat, at the theme's material strength. */
      on('area', [
        rule({
          opacity: product(hook.areaOpacity('0.16'), token('material-opacity')),
          stroke: 'none',
        }),
      ]),
      on('baseline', [
        rule({
          stroke: token('color-border'),
          strokeWidth: token('border-thin'),
          vectorEffect: 'non-scaling-stroke',
        }),
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
          pointerEvents: 'none',
          position: 'relative',
        }),
        rule({ inlineSize: sum(measured('line-chart-axis', '3ch'), '1ch') }),
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
            { paddingInlineStart: sum(measured('line-chart-axis-size'), hook.gap) },
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
              inlineSize: measured('line-chart-axis-size'),
              insetInlineStart: 0,
              position: 'absolute',
              top: 0,
            },
          ),
        ]),
      ]),
      on('line', [rule({ stroke: series })]),
      on('terminus', [
        rule({ color: series }),
        /* A phone's `currentColor` is the color a box inherits, so the mark is painted in its series' color itself. */
        native([
          rule({ backgroundColor: series, borderColor: series }),
          rule(
            { terminus: 'ring' },
            { backgroundColor: inherited('chart-terminus-hole', 'transparent') },
          ),
        ]),
      ]),
      /* A dot in its series' color on each reading marked, ringed in the page's ground. */
      on(
        ['marker', 'marker-ring'],
        [rule({ fill: 'none', strokeLinecap: 'round', vectorEffect: 'non-scaling-stroke' })],
      ),
      on('marker', [rule({ stroke: series, strokeWidth: hook.markerSize })]),
      on('marker-ring', [
        rule({
          stroke: hook.markerRingColor,
          strokeWidth: sum(hook.markerSize, product(2, token('border-thin'))),
        }),
      ]),
      /* One hole per series, which the element writes as one mask layer each. */
      on('svg', [
        web([
          rule(
            { terminus: 'ring' },
            { maskComposite: 'intersect', maskImage: measured('_line-chart-holes') },
          ),
        ]),
      ]),
      on('area', [rule({ fill: series })]),
      /* The rule down the reading, drawn faintly. */
      on('guide', [
        rule({
          stroke: token('color-foreground-muted'),
          strokeDasharray: '3 3',
          strokeWidth: token('border-thin'),
          vectorEffect: 'non-scaling-stroke',
        }),
        /* A phone draws it as the start edge of a box down the plot. */
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
      /* A chart never animates through a value it does not have. */
      on('line', [
        web([
          rule({
            transition: list(
              ['d', token('duration-normal'), easing],
              ['stroke-dasharray', token('duration-slow'), 'step-end', 'allow-discrete'],
              ['stroke-dashoffset', token('duration-slow'), easing],
            ),
          }),
          rule(
            { startingStyle: true },
            { strokeDasharray: ['1000px', '100000px'], strokeDashoffset: '1000px' },
          ),
        ]),
        /* A series `dashed` names, and none of the drawing-on. */
        rule({ also: { 'line-dashed': true } }, { strokeDasharray: hook.dash }),
        web([
          rule(
            { also: { 'line-dashed': true }, startingStyle: true },
            { strokeDasharray: hook.dash, strokeDashoffset: 0 },
          ),
        ]),
      ]),
      on('area', [
        web([
          rule({
            transition: list(
              ['d', token('duration-normal'), easing],
              ['opacity', token('duration-slow'), easing],
            ),
          }),
          rule({ startingStyle: true }, { opacity: 0 }),
        ]),
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
        native([
          rule({
            backgroundColor: hook.bandColor,
            inlineSize: measured('chart-band-width'),
            insetBlock: 0,
            insetInlineStart: measured('chart-band-x'),
            pointerEvents: 'none',
            position: 'absolute',
          }),
        ]),
      ]),
      include(printExact),
      on('marker', [web([rule({ forcedColors: true }, { forcedColorAdjust: 'none' })])]),
      on('marker-ring', [web([rule({ forcedColors: true }, { stroke: 'Canvas' })])]),
      /* Weight moves with emphasis, and the color stays the series'. */
      on('line', [
        /* In dark, 70% of the series, so a subtle line still clears 3:1 on the page. */
        rule(
          { emphasis: 'subtle' },
          {
            stroke: scheme(
              mix(series, 45, token('color-background')),
              mix(series, 70, token('color-background')),
            ),
          },
        ),
      ]),
      on('area', [
        rule(
          { emphasis: 'subtle' },
          {
            fill: scheme(
              mix(series, 45, token('color-background')),
              mix(series, 70, token('color-background')),
            ),
          },
        ),
        rule(
          { emphasis: 'outlined' },
          { opacity: product(hook.areaOpacity('0.08'), token('material-opacity')) },
        ),
        rule(
          { emphasis: 'solid' },
          { opacity: product(hook.areaOpacity('1'), token('material-opacity')) },
        ),
      ]),
      on('line', [
        rule({ material: 'glass' }, { strokeOpacity: token('material-glass-opacity') }),
        rule({ material: 'frosted' }, { strokeOpacity: token('material-frosted-opacity') }),
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
    ]
  },
)
