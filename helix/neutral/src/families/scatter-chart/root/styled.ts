import chartStatus from '../../../fragments/chart-status.js'
import chartTooltip from '../../../fragments/chart-tooltip.js'
import printExact from '../../../fragments/print-exact.js'
import { difference, list, measured, native, product, sum, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * Scatter Chart's styled tier.
 *
 * **Both axes are measured, so both carry numbers**: the levels up beside the
 * plot, the levels across under it, and what each axis measures at its far
 * end. The web lays them out in the plane's grid, the name up top across both
 * columns, so the column the levels sit in is as wide as its widest level and
 * no wider. A phone stands the plot and the levels across in the room the
 * levels up leave at the start, as wide as the chart measures the widest.
 *
 * **A point is a dot in its series' color with a ring of the page around
 * it**, a stroke of no length with a round cap that keeps its weight however
 * the plot is stretched, so where two points overlap each keeps its edge. A
 * layer of points takes the opacity, so a cluster reads darker where it is
 * denser. Under `size-by` a point's diameter runs from the point size to the
 * bubble size by the weight the chart writes, already a square root so the
 * area follows the measure.
 *
 * **Web only:** every other level across hidden once the chart is narrow,
 * which a phone's chart leaves out of its list, the point the reading rests
 * on growing as it arrives, the crosshair, printing, and forced colors.
 */
export default styles(
  root,
  {
    prefix: 'scatter-chart',
    hooks: {
      blockSize: '14em',
      bubbleSize: '40px',
      gap: token('space-xs'),
      gridlineColor: token('color-border'),
      pointOpacity: '0.8',
      pointRingColor: token('color-background'),
      pointSize: '8px',
      trendDash: '4 3',
      trendWidth: '1.5px',
    },
    own: { scatterChartDiameter: null },
    stylesheet: 'scatter-chart/root/scatter-chart-root.generated.css',
  },
  ({ hook, include, on, own, rule }) => {
    const series = measured('chart-series')
    const diameter = own.scatterChartDiameter(hook.pointSize)
    const beside = sum(measured('scatter-chart-axis-size'), hook.gap)
    return [
      include(chartStatus),
      include(chartTooltip),
      on('host', [
        rule({ display: 'block', position: 'relative' }),
        web([rule({ containerType: 'inline-size' })]),
      ]),
      /* The name up top spans both columns, the levels up beside the plot,
         the levels across under it, and the name across at their far end. */
      on('plane', [
        web([
          rule({
            columnGap: hook.gap,
            display: 'grid',
            gridTemplateColumns: 'auto minmax(0, 1fr)',
            gridTemplateRows: 'auto auto auto auto',
            rowGap: hook.gap,
          }),
        ]),
        native([rule({ display: 'flex', flexDirection: 'column', rowGap: hook.gap })]),
      ]),
      on('plot', [
        rule({ blockSize: hook.blockSize, position: 'relative' }),
        web([rule({ cursor: 'crosshair', gridColumn: 2, gridRow: 2 })]),
        native([rule({ marginInlineStart: beside })]),
      ]),
      on('svg', [
        rule({ blockSize: '100%', inlineSize: '100%', overflow: 'visible' }),
        native([rule({ inset: 0, position: 'absolute' })]),
      ]),
      /* A phone's canvas of a layer of points, over the rules. */
      on(['points', 'points-svg'], [native([rule({ inset: 0, position: 'absolute' })])]),
      /* A series' line of best fit, under `trend`: dashed, so it reads as drawn
         from the points, in the series' color. */
      on('trend', [
        rule({
          fill: 'none',
          stroke: series,
          strokeDasharray: hook.trendDash,
          strokeLinecap: 'round',
          strokeWidth: hook.trendWidth,
          vectorEffect: 'non-scaling-stroke',
        }),
      ]),
      on('gridline', [
        rule({
          stroke: hook.gridlineColor,
          strokeWidth: token('border-thin'),
          vectorEffect: 'non-scaling-stroke',
        }),
      ]),
      on(
        ['point', 'point-ring', 'point-active'],
        [
          rule({
            own: {
              scatterChartDiameter: sum(
                hook.pointSize,
                product(
                  measured('chart-point-weight', 0),
                  difference(hook.bubbleSize, hook.pointSize),
                ),
              ),
            },
          }),
        ],
      ),
      /* A layer takes the opacity, so a point and its ring fade as one. */
      on('points', [rule({ opacity: hook.pointOpacity })]),
      on(
        ['point', 'point-ring'],
        [rule({ fill: 'none', strokeLinecap: 'round', vectorEffect: 'non-scaling-stroke' })],
      ),
      on('point', [rule({ stroke: series, strokeWidth: diameter })]),
      on('point-ring', [
        rule({
          stroke: hook.pointRingColor,
          strokeWidth: sum(diameter, product(2, token('border-thin'))),
        }),
      ]),
      /* The row the reading rests on, drawn again over the rest, larger and whole. */
      on('point-active', [
        rule({
          backgroundColor: series,
          blockSize: diameter,
          borderRadius: token('radii-full'),
          boxShadow: [0, 0, 0, token('border-thin'), hook.pointRingColor],
          inlineSize: diameter,
          pointerEvents: 'none',
          position: 'absolute',
          scale: 1.5,
          translate: ['-50%', '-50%'],
        }),
        web([
          rule({
            insetBlockStart: measured('chart-point-y'),
            insetInlineStart: measured('chart-point-x'),
            transition: list(['scale', token('duration-fast'), token('easing-decelerate')]),
          }),
          rule({ startingStyle: true }, { scale: 1 }),
        ]),
        native([rule({ left: measured('chart-point-x'), top: measured('chart-point-y') })]),
      ]),
      /* Every level in one cell of its axis, each moved to its place. */
      on(['x-axis', 'y-axis'], [web([rule({ display: 'grid' })])]),
      on('x-axis', [
        web([rule({ gridColumn: 2, gridRow: 3 })]),
        native([
          rule({
            blockSize: '1em',
            fontSize: token('text-xs'),
            marginInlineStart: beside,
            position: 'relative',
          }),
        ]),
      ]),
      on('y-axis', [
        web([rule({ gridColumn: 1, gridRow: 2 })]),
        native([
          rule({
            blockSize: measured('scatter-chart-plot-height'),
            fontSize: token('text-xs'),
            inlineSize: measured('scatter-chart-axis-size'),
            left: 0,
            position: 'absolute',
            top: measured('scatter-chart-plot-top'),
          }),
        ]),
      ]),
      on(
        ['x-tick', 'y-tick'],
        [
          rule({
            color: token('color-foreground-muted'),
            fontSize: token('text-xs'),
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1,
            whiteSpace: 'nowrap',
          }),
          web([rule({ gridArea: '1 / 1', position: 'relative' })]),
          native([rule({ position: 'absolute' })]),
        ],
      ),
      on('x-tick', [
        rule({ translate: ['-50%', 0] }),
        web([rule({ insetInlineStart: measured('chart-tick'), justifySelf: 'start' })]),
        native([rule({ left: measured('chart-tick'), top: 0 })]),
        /* The level at the far end ends at the plot's edge. */
        rule({ part: { 'data-edge': 'end' } }, { translate: ['-100%', 0] }),
      ]),
      on('y-tick', [
        rule({ translate: [0, '-50%'] }),
        web([
          rule({ alignSelf: 'start', insetBlockStart: measured('chart-tick'), justifySelf: 'end' }),
        ]),
        native([rule({ right: 0, top: measured('chart-tick') })]),
      ]),
      /* Every other level across once the chart is narrow, counted from the far end. */
      on({ part: 'x-tick', selector: '[part="x-tick"]:nth-last-child(even)' }, [
        web([rule({ inlineSize: { below: '30rem' } }, { visibility: 'hidden' })]),
      ]),
      on(
        ['x-name', 'y-name'],
        [
          rule({
            color: token('color-foreground-muted'),
            fontSize: token('text-xs'),
            fontWeight: token('weight-medium'),
          }),
        ],
      ),
      /* What is measured across, at the far end of the axis it names. */
      on('x-name', [
        web([rule({ gridColumn: 2, gridRow: 4, justifySelf: 'end' })]),
        native([rule({ alignSelf: 'flex-end' })]),
      ]),
      /* Over the axis it names, across both columns. */
      on('y-name', [
        web([rule({ gridColumn: '1 / 3', gridRow: 1, justifySelf: 'start' })]),
        native([rule({ alignSelf: 'flex-start' })]),
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
      include(printExact),
      /* Forced colors keep a point's series color, ringed in the system's text color. */
      on('point', [web([rule({ forcedColors: true }, { forcedColorAdjust: 'none' })])]),
      on('point-ring', [web([rule({ forcedColors: true }, { stroke: 'CanvasText' })])]),
      on('point-active', [
        web([
          rule(
            { forcedColors: true },
            {
              boxShadow: [0, 0, 0, token('border-thick'), 'Highlight'],
              forcedColorAdjust: 'none',
            },
          ),
        ]),
      ]),
    ]
  },
)
