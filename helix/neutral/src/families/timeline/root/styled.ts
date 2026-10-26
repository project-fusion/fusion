import { oneOf } from '../../../render.js'
import { hookOf, native, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
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
    own: {
      timelineAbove: null,
      timelineArriveDisplay: null,
      timelineBodyDirection: null,
      timelineColumns: null,
      timelineContentBlockEnd: null,
      timelineContentColumn: null,
      timelineContentInlineEnd: null,
      timelineContentRow: null,
      timelineDirection: null,
      timelineEntryFlex: null,
      timelineEvenAlign: null,
      timelineEvenColumn: null,
      timelineEvenDirection: null,
      timelineHead: null,
      timelineLead: null,
      timelineLeadFlex: null,
      timelineLeadTime: null,
      timelineLeaveAlign: null,
      timelineLeaveBlockSize: null,
      timelineLeaveColumn: null,
      timelineLeaveInlineSize: null,
      timelineLeaveJustify: null,
      timelineLeaveMarginBlock: null,
      timelineLeaveRow: null,
      timelineMarkerRow: null,
      timelineRailAlign: null,
      timelineRailColumn: null,
      timelineRailColumns: null,
      timelineRailDirection: null,
      timelineRailInlineSize: null,
      timelineRailJustify: null,
      timelineRailRow: null,
      timelineRailRows: null,
      timelineRows: null,
      timelineTimeAlign: null,
      timelineTimeColumn: null,
      timelineTimeRow: null,
    },
    props: { layout: oneOf(['alternate', 'opposite']), orientation: oneOf(['horizontal']) },
    stylesheet: 'timeline/root/timeline-root.generated.css',
  },
  ({ hook, on, rule }) => [
    on('host', [
      rule({ display: 'flex', flexDirection: 'column' }),
      rule(
        { layout: 'opposite' },
        {
          own: {
            timelineColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
            timelineContentColumn: 3,
            timelineRailColumn: 2,
            timelineTimeAlign: 'end',
            timelineTimeColumn: 1,
            timelineTimeRow: 2,
          },
        },
      ),
      /* A phone's time stands before the line, beside what happened. */
      native([
        rule(
          { layout: 'opposite' },
          { own: { timelineHead: 'none', timelineLead: 'flex', timelineLeadFlex: '1 1 0' } },
        ),
      ]),
      rule(
        { layout: 'alternate' },
        {
          own: {
            timelineColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
            timelineContentColumn: 3,
            timelineEvenAlign: 'end',
            timelineEvenColumn: 1,
            timelineRailColumn: 2,
            timelineTimeColumn: 3,
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
              timelineEvenDirection: 'row-reverse',
              timelineLead: 'flex',
              timelineLeadFlex: '1 1 0',
              timelineLeadTime: 'none',
            },
          },
        ),
      ]),
      rule(
        { orientation: 'horizontal' },
        {
          flexDirection: 'row',
          own: {
            timelineArriveDisplay: 'none',
            /* As wide as its longest word at the least, so the web's entry
               holds its words whole. */
            timelineColumns: 'minmax(min-content, 1fr)',
            timelineContentBlockEnd: token('space-none'),
            timelineContentColumn: 1,
            timelineContentInlineEnd: hook.gap,
            timelineContentRow: 3,
            timelineDirection: 'row',
            timelineEntryFlex: '1 1 0',
            timelineEvenAlign: 'initial',
            timelineEvenColumn: 'initial',
            timelineLeaveAlign: 'center',
            timelineLeaveBlockSize: hookOf('timeline', 'rail-size', token('border-thin')),
            timelineLeaveColumn: 2,
            timelineLeaveInlineSize: 'auto',
            timelineLeaveJustify: 'stretch',
            timelineLeaveMarginBlock: token('space-none'),
            timelineLeaveRow: 1,
            timelineMarkerRow: 1,
            timelineRailAlign: 'center',
            timelineRailColumn: 1,
            timelineRailColumns: 'auto minmax(0, 1fr)',
            timelineRailJustify: 'start',
            timelineRailRow: 1,
            timelineRailRows: 'auto',
            timelineRows: 'auto auto minmax(0, 1fr)',
            timelineTimeAlign: 'initial',
            timelineTimeColumn: 1,
            timelineTimeRow: 2,
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
              timelineAbove: 'flex',
              timelineBodyDirection: 'column',
              timelineEvenDirection: 'column',
              timelineHead: 'none',
              timelineLead: 'none',
              timelineRailDirection: 'row',
              /* Across the whole entry, so the line that leaves the mark
               reaches the next one. */
              timelineRailInlineSize: '100%',
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
