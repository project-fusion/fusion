import { measured, mix, native, quotient, sum, token, web } from '../style.js'
import { fragment } from '../table.js'

/**
 * How a Bar Chart lays out its plot, the names of its categories, and the
 * numbers of its scales, which turn with `orientation`: under columns the
 * names are a row and the scales columns beside the plot, the primary at the
 * start and `secondary`'s at the end; turned sideways the names are a column
 * at the start and the scales rows, the primary under the bars and
 * `secondary`'s over them.
 *
 * **The web lays them out in the host's grid, and a phone around the plot**,
 * in the room the host's padding leaves, each as long as the plot, since a
 * phone's grid places no cell by its column.
 *
 * **A number of the second scale is text**, so its series' color is mixed
 * toward the ink until it reads as text.
 */
export default fragment(
  'bar-chart-layout',
  {
    parts: ['host', 'axis', 'label', 'labels', 'plot', 'tick'],
    hooks: { blockSize: '12em', gap: token('space-2xs') },
    own: { barChartAxisInk: null },
    props: ['orientation', 'secondary', 'valueAxis'],
  },
  ({ hook, on, own, rule }) => {
    const sideways = { orientation: 'horizontal' } as const
    const upright = { orientation: { not: 'horizontal' } } as const
    return [
      /* The names, each placed by the room it is given. */
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
      /* Categories down the side: the names in a column of their own. */
      on('host', [web([rule(sideways, { gridTemplateColumns: 'auto 1fr' })])]),
      on('labels', [
        web([
          rule(sideways, { gridColumn: 1, gridRow: 1 }),
          rule(sideways, {
            alignSelf: 'start',
            blockSize: hook.blockSize,
            gridTemplateColumns: 'auto',
            gridTemplateRows: 'minmax(0, 1fr)',
          }),
        ]),
      ]),
      on('plot', [web([rule(sideways, { gridColumn: 2, gridRow: 1 })])]),
      /* Each name centered on its bar, one line tall. */
      on('label', [
        web([
          rule(sideways, {
            alignSelf: 'start',
            inlineSize: 'auto',
            insetBlockStart: sum(
              measured('chart-label-start'),
              quotient(measured('chart-label-size'), 2),
            ),
            marginInlineStart: 0,
            position: 'relative',
            textAlign: 'end',
            translate: [0, '-50%'],
          }),
        ]),
      ]),
      /* The numbers of a scale, in a column of their own beside the plot. */
      on('host', [web([rule({ has: 'secondary' }, { gridTemplateColumns: 'auto 1fr auto' })])]),
      on('axis', [
        web([
          rule(
            { part: { 'data-axis': 'primary' }, has: 'secondary' },
            { gridColumn: 1, gridRow: 1 },
          ),
        ]),
      ]),
      on('plot', [web([rule({ has: 'secondary' }, { gridColumn: 2, gridRow: 1 })])]),
      on('axis', [
        web([
          rule(
            { part: { 'data-axis': 'secondary' }, has: 'secondary' },
            {
              gridColumn: 3,
              gridRow: 1,
            },
          ),
        ]),
      ]),
      on('labels', [web([rule({ has: 'secondary' }, { gridColumn: 2, gridRow: 2 })])]),
      /* Turned sideways, the two scales are rows: the primary under the bars, the secondary over them. */
      on('host', [
        web([
          rule(
            { ...sideways, has: 'secondary' },
            {
              gridTemplateColumns: 'auto 1fr',
              gridTemplateRows: 'auto 1fr auto',
            },
          ),
        ]),
      ]),
      on('axis', [
        web([
          rule(
            { ...sideways, part: { 'data-axis': 'secondary' }, has: 'secondary' },
            {
              gridColumn: 2,
              gridRow: 1,
            },
          ),
        ]),
      ]),
      on('labels', [web([rule({ ...sideways, has: 'secondary' }, { gridColumn: 1, gridRow: 2 })])]),
      on('plot', [web([rule({ ...sideways, has: 'secondary' }, { gridColumn: 2, gridRow: 2 })])]),
      on('axis', [
        web([
          rule(
            { ...sideways, part: { 'data-axis': 'primary' }, has: 'secondary' },
            {
              gridColumn: 2,
              gridRow: 3,
            },
          ),
        ]),
      ]),
      /* One scale's numbers under `value-axis`, placed as the primary is with two. */
      on('host', [
        web([
          rule(
            { ...upright, lacks: 'secondary', valueAxis: { not: 'none' } },
            {
              columnGap: 0,
              gridTemplateColumns: 'auto 1fr',
            },
          ),
          /* Half a number's height above the plot, so the top number stands inside the box. */
          rule(
            [
              { ...upright, valueAxis: { not: 'none' } },
              { ...upright, has: 'secondary' },
            ],
            { paddingBlockStart: quotient(token('text-xs'), 2) },
          ),
        ]),
      ]),
      on('axis', [
        web([
          rule(
            {
              ...upright,
              part: { 'data-axis': 'primary' },
              lacks: 'secondary',
              valueAxis: { not: 'none' },
            },
            {
              gridColumn: 1,
              gridRow: 1,
              marginInlineEnd: hook.gap,
            },
          ),
        ]),
      ]),
      on(
        ['plot', 'labels'],
        [
          web([
            rule({ ...upright, lacks: 'secondary', valueAxis: { not: 'none' } }, { gridColumn: 2 }),
          ]),
        ],
      ),
      on('host', [
        web([
          rule(
            { ...sideways, lacks: 'secondary', valueAxis: { not: 'none' } },
            { gridTemplateRows: '1fr auto' },
          ),
        ]),
      ]),
      on('axis', [
        web([
          rule(
            {
              ...sideways,
              part: { 'data-axis': 'primary' },
              lacks: 'secondary',
              valueAxis: { not: 'none' },
            },
            {
              gridColumn: 2,
              gridRow: 2,
            },
          ),
        ]),
      ]),
      /* Relative, so a tick's percentage resolves against the axis, as long as the plot. */
      on('axis', [
        rule({
          color: token('color-foreground-muted'),
          fontSize: token('text-xs'),
          fontVariantNumeric: 'tabular-nums',
          pointerEvents: 'none',
          position: 'relative',
        }),
        rule(upright, { inlineSize: measured('bar-chart-axis', '3ch') }),
        web([rule(sideways, { blockSize: '1lh' })]),
        /* A number in the series color is text, so it is mixed toward the ink until it reads as text. */
        rule(
          { part: { 'data-axis': 'secondary' } },
          {
            own: {
              barChartAxisInk: mix(measured('bar-chart-secondary'), 45, token('color-foreground')),
            },
            color: own.barChartAxisInk(token('color-foreground-muted')),
          },
        ),
      ]),
      /* Centered on the level it names. */
      on('tick', [
        rule({ position: 'absolute' }),
        rule(upright, { insetInlineEnd: 0, lineHeight: 1, translate: [0, '-50%'] }),
        rule(sideways, { translate: ['-50%', 0] }),
        web([rule({ ...sideways, dir: 'rtl' }, { translate: ['50%', 0] })]),
        /* The last number across ends at the plot's end, rather than past it. */
        web([
          rule({ ...sideways, child: 'last' }, { translate: ['-100%', 0] }),
          rule({ ...sideways, child: 'last', dir: 'rtl' }, { translate: ['100%', 0] }),
        ]),
        native([
          rule(
            { ...upright, part: { 'data-axis': 'secondary' } },
            {
              insetInlineEnd: 'auto',
              insetInlineStart: 0,
            },
          ),
          rule(upright, { insetBlockStart: measured('chart-tick-at') }),
          rule(sideways, { insetInlineStart: measured('chart-tick-at') }),
        ]),
      ]),
      /* Written out: a tick of the secondary scale, which stands at the plot's far side. */
      on(
        {
          part: 'tick',
          selector:
            ':host(:not([orientation="horizontal"])) [part="axis"][data-axis="secondary"] [part="tick"]',
        },
        [web([rule({ insetInlineEnd: 'auto', insetInlineStart: 0 })])],
      ),
      /* A phone stands the scales and the names around the plot in the room
         the host leaves for them, each as long as the plot: the numbers in a
         column beside columns and a row under or over bars, and the names of
         bars in a column at the start, as wide as the chart measures them. */
      on('host', [
        native([
          rule(
            { ...upright, valueAxis: { not: 'none' } },
            { paddingInlineStart: sum(measured('bar-chart-axis-size'), hook.gap) },
          ),
          rule(
            { ...upright, has: 'secondary' },
            {
              paddingInlineEnd: sum(measured('bar-chart-other-size'), hook.gap),
              paddingInlineStart: sum(measured('bar-chart-axis-size'), hook.gap),
            },
          ),
          rule(sideways, { paddingInlineStart: sum(measured('bar-chart-labels-size'), hook.gap) }),
          rule(
            { ...sideways, valueAxis: { not: 'none' } },
            { paddingBlockEnd: sum('1.4em', hook.gap) },
          ),
          rule(
            { ...sideways, has: 'secondary' },
            {
              paddingBlockEnd: sum('1.4em', hook.gap),
              paddingBlockStart: sum('1.4em', hook.gap),
            },
          ),
        ]),
      ]),
      on('labels', [
        native([
          rule(sideways, {
            /* The plot's own height: the names' column sets a smaller type, which an `em` would read. */
            blockSize: measured('bar-chart-plot-size'),
            insetBlockStart: 0,
            inlineSize: measured('bar-chart-labels-size'),
            insetInlineStart: 0,
            position: 'absolute',
          }),
          rule({ ...sideways, has: 'secondary' }, { insetBlockStart: sum('1.4em', hook.gap) }),
        ]),
      ]),
      on('label', [
        native([
          rule(sideways, {
            inlineSize: 'auto',
            insetBlockStart: sum(
              measured('chart-label-start'),
              quotient(measured('chart-label-size'), 2),
            ),
            insetInlineEnd: 0,
            insetInlineStart: 'auto',
            textAlign: 'end',
            translate: [0, '-50%'],
          }),
        ]),
      ]),
      on('axis', [
        native([
          rule(upright, {
            /* As tall as the plot: the names' row under it is as tall as the axis' own type. */
            bottom: sum('1.4em', hook.gap),
            inlineSize: measured('bar-chart-axis-size'),
            insetInlineStart: 0,
            position: 'absolute',
            top: 0,
          }),
          rule(
            { ...upright, part: { 'data-axis': 'secondary' } },
            {
              inlineSize: measured('bar-chart-other-size'),
              insetInlineEnd: 0,
              insetInlineStart: 'auto',
            },
          ),
          rule(sideways, {
            blockSize: '1.4em',
            bottom: 0,
            insetInlineEnd: 0,
            insetInlineStart: sum(measured('bar-chart-labels-size'), hook.gap),
            position: 'absolute',
          }),
          rule({ ...sideways, part: { 'data-axis': 'secondary' } }, { bottom: 'auto', top: 0 }),
        ]),
      ]),
    ]
  },
)
