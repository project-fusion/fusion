import { first, fn, hookOf, native, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import item from './headless.js'

/**
 * A timeline entry's styled tier, which writes
 * `helix/styled/src/timeline/item/timeline-item.generated.css`.
 *
 * **On the web the rail is a subgrid, and that is the whole of the
 * alignment.** The mark sits on what happened rather than at the top of the
 * entry, and the distance between them is the time's height, which only
 * layout knows. Sharing the entry's rows tells the rail, so the line above
 * the mark covers exactly the time. A phone has no subgrid and draws the two
 * rows as two views instead, with the arriving line beside the time.
 *
 * **Each entry draws the line that arrives at it and the line that leaves
 * it**, hidden on the first and the last, which their places say with no
 * script. The line to an entry still to come is dashed.
 *
 * **A ring, not a disc**: a column of filled circles is a column of traffic
 * lights. The tone colors the mark and nothing else, and the mark paints no
 * fill of its own, so it is right on any surface.
 *
 * **Each layout is handed down by the timeline** as private values the
 * entry's grid reads, falling back to the column it draws on its own.
 */
export default styles(
  item,
  {
    prefix: 'timeline',
    hooks: {
      columnGap: token('space-md'),
      markerColor: token('color-foreground-subtle'),
      markerRadius: token('radii-full'),
      markerSize: token('size-icon-md'),
      railColor: token('color-border'),
      railSize: token('border-thin'),
      timeColor: token('color-foreground-muted'),
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
      timelineTone: null,
    },
    stylesheet: 'timeline/item/timeline-item.generated.css',
  },
  ({ hook, on, own, rule, variants }) => {
    const railSize = hook.railSize
    const railColor = hook.railColor
    const markerSize = hook.markerSize
    /* A dash and a gap, drawn again down the line, on both platforms. */
    const pendingLine = fn(
      'repeating-linear-gradient',
      'to bottom',
      [railColor, 0, token('space-2xs')],
      ['transparent', token('space-2xs'), token('space-xs')],
    )
    return [
      on('host', [
        web([
          rule([
            {
              columnGap: hook.columnGap,
              display: 'grid',
              gridTemplateColumns: own.timelineColumns('auto minmax(0, 1fr)'),
              gridTemplateRows: own.timelineRows('auto minmax(0, 1fr)'),
            },
          ]),
        ]),
        /* A phone's entry is its two rows, one over the other. */
        native([rule({ display: 'flex', flexDirection: 'column' })]),
        variants('tone', {
          danger: { own: { timelineTone: token('color-danger') } },
          info: { own: { timelineTone: token('color-info') } },
          neutral: { own: { timelineTone: token('color-foreground-muted') } },
          primary: { own: { timelineTone: token('color-primary') } },
          success: { own: { timelineTone: token('color-success') } },
          warning: { own: { timelineTone: token('color-warning') } },
        }),
      ]),
      on('rail', [
        web([
          rule({
            alignItems: own.timelineRailAlign('normal'),
            display: 'grid',
            gridColumn: own.timelineRailColumn('auto'),
            gridRow: own.timelineRailRow('1 / -1'),
            gridTemplateColumns: own.timelineRailColumns('none'),
            gridTemplateRows: own.timelineRailRows('subgrid'),
            justifyItems: own.timelineRailJustify('center'),
          }),
        ]),
        /* The mark, then the line that leaves it, down the rail or along it. */
        native([
          rule({
            alignItems: 'center',
            display: 'flex',
            flexDirection: own.timelineRailDirection('column'),
            inlineSize: own.timelineRailInlineSize(markerSize),
          }),
        ]),
      ]),
      /* The line arriving from the entry above, the height of the time. */
      on({ before: 'rail' }, [
        web([
          rule({
            backgroundColor: railColor,
            blockSize: '100%',
            content: '""',
            display: own.timelineArriveDisplay('block'),
            gridColumn: 1,
            gridRow: 1,
            inlineSize: railSize,
          }),
          rule({ place: 'first' }, { visibility: 'hidden' }),
          /* The way to an event still to come is drawn and not yet traveled. */
          rule(
            { pending: true },
            {
              backgroundColor: 'transparent',
              backgroundImage: pendingLine,
            },
          ),
        ]),
      ]),
      /* The rest of the line, from under the mark to the end of the entry. */
      on({ after: 'rail' }, [
        rule({
          backgroundColor: railColor,
          content: '""',
          inlineSize: own.timelineLeaveInlineSize(railSize),
        }),
        web([
          rule({
            alignSelf: own.timelineLeaveAlign('stretch'),
            blockSize: own.timelineLeaveBlockSize('auto'),
            gridColumn: own.timelineLeaveColumn(1),
            gridRow: own.timelineLeaveRow(2),
            justifySelf: own.timelineLeaveJustify('auto'),
            marginBlockStart: own.timelineLeaveMarginBlock(markerSize),
          }),
        ]),
        native([rule({ blockSize: own.timelineLeaveBlockSize(railSize), flex: '1 1 0' })]),
        rule({ place: 'last' }, { visibility: 'hidden' }),
      ]),
      on('marker', [
        rule({
          '--icon-size': token('size-icon-sm'),
          alignItems: 'center',
          alignSelf: 'start',
          aspectRatio: 1,
          borderRadius: hook.markerRadius,
          color: first(own.timelineTone, hook.markerColor),
          display: 'inline-flex',
          inlineSize: markerSize,
          justifyContent: 'center',
        }),
        web([rule({ gridColumn: 1, gridRow: own.timelineMarkerRow(2) })]),
      ]),
      on('dot', [rule({ blockSize: token('size-icon-sm'), inlineSize: token('size-icon-sm') })]),
      on('time', [
        rule({
          color: hook.timeColor,
          fontFamily: token('font-sans'),
          fontSize: token('text-xs'),
          fontWeight: token('weight-medium'),
          paddingBlockEnd: token('space-2xs'),
          textAlign: own.timelineTimeAlign,
        }),
        web([
          rule({
            gridColumn: own.timelineTimeColumn(2),
            gridRow: own.timelineTimeRow(1),
          }),
          rule(
            { place: 'even' },
            {
              gridColumn: first(own.timelineEvenColumn, own.timelineTimeColumn, 2),
            },
          ),
        ]),
        rule({ place: 'even' }, { textAlign: first(own.timelineEvenAlign, own.timelineTimeAlign) }),
        native([rule({ flex: '1 1 0', minInlineSize: 0 })]),
      ]),
      on('content', [
        rule({
          display: 'flex',
          flexDirection: 'column',
          gap: token('space-2xs'),
          minInlineSize: 0,
          paddingBlockEnd: first(
            own.timelineContentBlockEnd,
            hookOf('timeline', 'gap'),
            token('space-lg'),
          ),
          paddingInlineEnd: own.timelineContentInlineEnd(token('space-none')),
        }),
        web([
          rule({
            gridColumn: own.timelineContentColumn(2),
            gridRow: own.timelineContentRow(2),
          }),
        ]),
        rule(
          { place: 'last' },
          {
            paddingBlockEnd: token('space-none'),
            paddingInlineEnd: token('space-none'),
          },
        ),
        web([
          rule(
            { place: 'even' },
            {
              gridColumn: first(own.timelineEvenColumn, own.timelineContentColumn, 2),
            },
          ),
        ]),
        rule({ place: 'even' }, { textAlign: own.timelineEvenAlign }),
      ]),
      /* A phone's rows, which the timeline's layout shows, hides and turns. */
      on('head', [
        native([
          rule({
            columnGap: hook.columnGap,
            display: own.timelineHead('flex'),
            flexDirection: 'row',
          }),
          rule(
            { place: 'even' },
            {
              flexDirection: own.timelineEvenDirection('row'),
            },
          ),
        ]),
      ]),
      on('body', [
        native([
          rule({
            columnGap: hook.columnGap,
            display: 'flex',
            flexDirection: own.timelineBodyDirection('row'),
            flexGrow: 1,
          }),
          rule(
            { place: 'even' },
            {
              flexDirection: first(own.timelineEvenDirection, own.timelineBodyDirection, 'row'),
            },
          ),
        ]),
      ]),
      /* The side of the line before it, where the line runs down the middle. */
      on(
        ['head-lead', 'lead'],
        [
          native([
            rule({ display: own.timelineLead('none'), flex: own.timelineLeadFlex('0 0 auto') }),
          ]),
        ],
      ),
      on('beside', [native([rule({ display: own.timelineLeadTime('flex'), flex: '1 1 0' })])]),
      on('above', [native([rule({ display: own.timelineAbove('none') })])]),
      on('main', [native([rule({ flex: '1 1 0', minInlineSize: 0 })])]),
      /* The arriving line, as wide as the mark, so it stands over the rail. */
      on('arrive', [
        native([
          rule({
            alignItems: 'center',
            display: own.timelineArriveDisplay('flex'),
            flexDirection: 'column',
            inlineSize: markerSize,
          }),
        ]),
      ]),
      on({ before: 'arrive' }, [
        native([
          rule({
            backgroundColor: railColor,
            content: '""',
            flex: '1 1 0',
            inlineSize: railSize,
          }),
          rule({ place: 'first' }, { visibility: 'hidden' }),
          rule(
            { pending: true },
            {
              backgroundColor: 'transparent',
              backgroundImage: pendingLine,
            },
          ),
        ]),
      ]),
    ]
  },
)
