import { hookOf, native, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import { prop } from '../../../tree.js'
import root from './headless.js'

/**
 * A timeline's styled tier, which writes
 * `helix/styled/src/timeline/root/timeline-root.generated.css`.
 *
 * **A column of entries with no gap**, since the line has to be continuous
 * and a gap is empty space between the boxes that draw it. The spacing is
 * each entry's own padding, which the line runs through.
 *
 * **The layouts are handed down** as private values each entry reads, and an
 * entry inside a group takes them through it. The order an entry is read in
 * never moves, only where it is drawn:
 *
 * - Unset, the line runs down the start edge, each time over what happened.
 * - `opposite`, the line down the middle, the time on the start side.
 * - `alternate`, the line down the middle, every other entry on the start side.
 * - `orientation="horizontal"`, the line across the top, the entries side by
 *   side, each time and what happened under its mark. A layout is set aside.
 *
 * A phone has no subgrid, so it reads its own private values for the rows
 * each entry draws there, beside the web's grid. Print is the web's.
 */
export default styles(
  root,
  {
    prefix: 'timeline',
    hooks: {
      gap: token('space-lg'),
    },
    own: [
      'timeline-above',
      'timeline-arrive-display',
      'timeline-body-direction',
      'timeline-columns',
      'timeline-content-block-end',
      'timeline-content-column',
      'timeline-content-inline-end',
      'timeline-content-row',
      'timeline-direction',
      'timeline-entry-flex',
      'timeline-even-align',
      'timeline-even-column',
      'timeline-even-direction',
      'timeline-head',
      'timeline-lead',
      'timeline-lead-flex',
      'timeline-lead-time',
      'timeline-leave-align',
      'timeline-leave-block-size',
      'timeline-leave-column',
      'timeline-leave-inline-size',
      'timeline-leave-justify',
      'timeline-leave-margin-block',
      'timeline-leave-row',
      'timeline-marker-row',
      'timeline-rail-align',
      'timeline-rail-column',
      'timeline-rail-columns',
      'timeline-rail-direction',
      'timeline-rail-inline-size',
      'timeline-rail-justify',
      'timeline-rail-row',
      'timeline-rail-rows',
      'timeline-rows',
      'timeline-time-align',
      'timeline-time-column',
      'timeline-time-row',
    ],
    props: [prop('layout', ['alternate', 'opposite']), prop('orientation', ['horizontal'])],
    stylesheet: 'timeline/root/timeline-root.generated.css',
  },
  ({ hook, on, rule }) => [
    on('host', [
      rule({ display: 'flex', flexDirection: 'column' }),
      rule(
        { layout: 'opposite' },
        {
          own: {
            columns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
            contentColumn: 3,
            railColumn: 2,
            timeAlign: 'end',
            timeColumn: 1,
            timeRow: 2,
          },
        },
      ),
      /* A phone's time stands before the line, beside what happened. */
      native([
        rule({ layout: 'opposite' }, { own: { head: 'none', lead: 'flex', leadFlex: '1 1 0' } }),
      ]),
      rule(
        { layout: 'alternate' },
        {
          own: {
            columns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
            contentColumn: 3,
            evenAlign: 'end',
            evenColumn: 1,
            railColumn: 2,
            timeColumn: 3,
          },
        },
      ),
      /* A phone's even entry turns its rows round the line, and the side
         before the line is empty. */
      native([
        rule(
          { layout: 'alternate' },
          {
            own: {
              evenDirection: 'row-reverse',
              lead: 'flex',
              leadFlex: '1 1 0',
              leadTime: 'none',
            },
          },
        ),
      ]),
      rule(
        { orientation: 'horizontal' },
        {
          flexDirection: 'row',
          own: {
            arriveDisplay: 'none',
            /* As wide as its longest word at the least, so the web's entry
               holds its words whole. */
            columns: 'minmax(min-content, 1fr)',
            contentBlockEnd: token('space-none'),
            contentColumn: 1,
            contentInlineEnd: hook.gap,
            contentRow: 3,
            direction: 'row',
            entryFlex: '1 1 0',
            evenAlign: 'initial',
            evenColumn: 'initial',
            leaveAlign: 'center',
            leaveBlockSize: hookOf('timeline', 'rail-size', token('border-thin')),
            leaveColumn: 2,
            leaveInlineSize: 'auto',
            leaveJustify: 'stretch',
            leaveMarginBlock: token('space-none'),
            leaveRow: 1,
            markerRow: 1,
            railAlign: 'center',
            railColumn: 1,
            railColumns: 'auto minmax(0, 1fr)',
            railJustify: 'start',
            railRow: 1,
            railRows: 'auto',
            rows: 'auto auto minmax(0, 1fr)',
            timeAlign: 'initial',
            timeColumn: 1,
            timeRow: 2,
          },
        },
      ),
      /* A phone's entry is the mark and its line, then the time, then what
         happened. */
      native([
        rule(
          { orientation: 'horizontal' },
          {
            own: {
              above: 'flex',
              bodyDirection: 'column',
              evenDirection: 'column',
              head: 'none',
              lead: 'none',
              railDirection: 'row',
              /* Across the whole entry, so the line that leaves the mark
               reaches the next one. */
              railInlineSize: '100%',
            },
          },
        ),
      ]),
      rule({ print: true }, { printColorAdjust: 'economy' }),
    ]),
    /* **An entry across is never narrower than its words**: the web's is as
       wide as its longest word, and a phone's six of its ems, which follow
       the reader's text size. A timeline wider than its room overflows, and
       a Scroll Area around it scrolls it, on a phone too, where the area
       lays the timeline out at its own width and the entries share it. */
    on({ region: 'default', slotted: '*' }, [
      rule({ orientation: 'horizontal' }, { flex: '1 1 0' }),
      web([rule({ orientation: 'horizontal' }, { minInlineSize: 'min-content' })]),
      native([rule({ orientation: 'horizontal' }, { minInlineSize: '6em' })]),
    ]),
    /* The entry that says more are on their way, in the time's ink. */
    on('loading', [
      rule({
        color: hookOf('timeline', 'time-color', token('color-foreground-muted')),
        fontFamily: token('font-sans'),
        fontSize: token('text-xs'),
        paddingBlockStart: hook.gap,
      }),
      rule({ orientation: 'horizontal' }, { paddingBlockStart: token('space-none') }),
    ]),
  ],
)
