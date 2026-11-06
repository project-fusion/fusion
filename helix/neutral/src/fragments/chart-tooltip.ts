import { measured, native, token } from '../style.js'
import { fragment } from '../table.js'

/**
 * The reading bubble a chart draws on a phone: a Tooltip hung on the `mark`,
 * a point the tree places at `--chart-mark-x` and `--chart-mark-y` of the
 * plot, holding the reading's row as a label over a cell for each column,
 * each a dot in its series color, the column's name, and its value.
 *
 * **A phone's alone, for now.** The web sets the same bubble from the shared
 * `chart/tooltip.css`, which the charts not yet written once also read, so a
 * family that takes this in keeps importing that sheet on the web.
 */
export default fragment(
  'chart-tooltip',
  {
    parts: [
      'mark',
      'plot',
      'tooltip',
      'tooltip-trigger',
      'tooltip-cell',
      'tooltip-label',
      'tooltip-name',
      'tooltip-value',
    ],
  },
  ({ on, rule }) => [
    /* The bubble's trigger is a point of the plot, where the mark is, at
       `--chart-mark-x` and `--chart-mark-y` of it, which the chart measures. */
    on('tooltip-trigger', [
      native([
        rule({
          blockSize: '1px',
          inlineSize: '1px',
          left: measured('chart-mark-x'),
          pointerEvents: 'none',
          position: 'absolute',
          top: measured('chart-mark-y'),
        }),
      ]),
    ]),
    on('mark', [native([rule({ blockSize: '1px', inlineSize: '1px', pointerEvents: 'none' })])]),
    on('tooltip-label', [
      native([rule({ fontWeight: token('weight-medium'), marginBlockEnd: token('space-2xs') })]),
    ]),
    /* The bubble's words in its own ink, as the web's slotted words inherit it from the surface. */
    on(
      ['tooltip-label', 'tooltip-cell'],
      [
        native([
          rule({
            color: token('color-foreground-inverse'),
            fontFamily: token('font-sans'),
            fontSize: token('text-xs'),
          }),
        ]),
      ],
    ),
    on('tooltip-cell', [
      native([
        rule({
          alignItems: 'center',
          columnGap: token('space-sm'),
          display: 'flex',
          flexDirection: 'row',
        }),
      ]),
    ]),
    /* A dot in the series color, which the tree makes transparent on a cell
         nothing was plotted from, so the columns line up as the web's do. */
    on({ before: 'tooltip-cell' }, [
      native([
        rule({
          backgroundColor: measured('chart-series'),
          blockSize: '0.5em',
          borderRadius: token('radii-full'),
          content: '""',
          inlineSize: '0.5em',
        }),
      ]),
    ]),
    on('tooltip-name', [native([rule({ flexGrow: 1, opacity: 0.72 })])]),
    on('tooltip-value', [native([rule({ fontVariantNumeric: 'tabular-nums' })])]),
    on('plot', [
      native([
        rule(
          { focusVisible: true },
          {
            outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
            outlineOffset: token('size-focus-offset'),
          },
        ),
      ]),
    ]),
  ],
)
