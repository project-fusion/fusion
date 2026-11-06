import { measured, native, token } from '../style.js'
import { fragment } from '../table.js'

/**
 * How Bar Chart's columns are drawn under `emphasis`, `material`, and `wash`,
 * for the chart and for each series a cell's `data-emphasis` or
 * `data-material` names: `outlined` the edge over a shade of the series,
 * `subtle` a wash under the same edge, `glass` and `frosted` the two material
 * opacities, and `gradient` into the wash the headless tier draws. A phone
 * draws the edge as a path of its own, open at the base. Bar Chart's table
 * takes it in where it stands in its cascade.
 */
export default fragment(
  'bar-chart-treatments',
  {
    parts: ['bar', 'bar-edge'],
    hooks: { barStroke: null },
    own: {
      barChartArea: null,
      barChartBase: null,
      barChartFoot: null,
      barChartSeries: null,
      barChartShade: null,
      barChartThrough: null,
    },
    props: ['emphasis', 'material', 'wash'],
  },
  ({ hook, on, own, rule }) => [
    /* The edge, and the fill faded toward the page under it, with no line across the base. */
    on('bar', [
      rule(
        { 'data-emphasis': 'outlined' },
        {
          own: { barChartFoot: own.barChartBase },
          fill: own.barChartShade,
          stroke: own.barChartSeries,
          strokeWidth: hook.barStroke(token('border-thick')),
          vectorEffect: 'non-scaling-stroke',
        },
      ),
      /* A wash under the same edge, the quiet end of the axis. */
      rule(
        { 'data-emphasis': 'subtle' },
        {
          own: { barChartArea: 0.2, barChartFoot: own.barChartBase },
          stroke: own.barChartSeries,
          strokeWidth: hook.barStroke(token('border-thick')),
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
          strokeWidth: hook.barStroke(token('border-thick')),
          vectorEffect: 'non-scaling-stroke',
        },
      ),
      rule(
        { emphasis: 'subtle', 'data-emphasis': false },
        {
          own: { barChartArea: 0.2, barChartFoot: own.barChartBase },
          stroke: own.barChartSeries,
          strokeWidth: hook.barStroke(token('border-thick')),
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
          strokeWidth: hook.barStroke(token('border-thick')),
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
  ],
)
