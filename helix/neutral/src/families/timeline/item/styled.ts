import { fn, hookOf, token } from '../../../style.js'
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
    hooks: [
      'column-gap',
      'marker-color',
      'marker-radius',
      'marker-size',
      'rail-color',
      'rail-size',
      'time-color',
    ],
    own: [
      'timeline-above',
      'timeline-arrive-display',
      'timeline-body-direction',
      'timeline-columns',
      'timeline-content-block-end',
      'timeline-content-column',
      'timeline-content-inline-end',
      'timeline-content-row',
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
      'timeline-tone',
    ],
    stylesheet: 'timeline/item/timeline-item.generated.css',
  },
  ({ hook, on, own, rule, variants }) => {
    const railSize = hook.railSize(token('border-thin'))
    const railColor = hook.railColor(token('color-border'))
    const markerSize = hook.markerSize(token('size-icon-md'))
    /* A dash and a gap, drawn again down the line, on both platforms. */
    const pendingLine = fn(
      'repeating-linear-gradient',
      'to bottom',
      [railColor, 0, token('space-2xs')],
      ['transparent', token('space-2xs'), token('space-xs')],
    )
    return [
      on('host', [
        rule({ platform: 'web' }, [
          {
            columnGap: hook.columnGap(token('space-md')),
            display: 'grid',
            gridTemplateColumns: own.columns('auto minmax(0, 1fr)'),
            gridTemplateRows: own.rows('auto minmax(0, 1fr)'),
          },
        ]),
        /* A phone's entry is its two rows, one over the other. */
        rule({ platform: 'native' }, { display: 'flex', flexDirection: 'column' }),
        variants('tone', {
          danger: { own: { tone: token('color-danger') } },
          info: { own: { tone: token('color-info') } },
          neutral: { own: { tone: token('color-foreground-muted') } },
          primary: { own: { tone: token('color-primary') } },
          success: { own: { tone: token('color-success') } },
          warning: { own: { tone: token('color-warning') } },
        }),
      ]),
      on('rail', [
        rule(
          { platform: 'web' },
          {
            alignItems: own.railAlign('normal'),
            display: 'grid',
            gridColumn: own.railColumn('auto'),
            gridRow: own.railRow('1 / -1'),
            gridTemplateColumns: own.railColumns('none'),
            gridTemplateRows: own.railRows('subgrid'),
            justifyItems: own.railJustify('center'),
          },
        ),
        /* The mark, then the line that leaves it, down the rail or along it. */
        rule(
          { platform: 'native' },
          {
            alignItems: 'center',
            display: 'flex',
            flexDirection: own.railDirection('column'),
            inlineSize: own.railInlineSize(markerSize),
          },
        ),
      ]),
      /* The line arriving from the entry above, the height of the time. */
      on({ before: 'rail' }, [
        rule(
          { platform: 'web' },
          {
            backgroundColor: railColor,
            blockSize: '100%',
            content: '""',
            display: own.arriveDisplay('block'),
            gridColumn: 1,
            gridRow: 1,
            inlineSize: railSize,
          },
        ),
        rule({ place: 'first', platform: 'web' }, { visibility: 'hidden' }),
        /* The way to an event still to come is drawn and not yet traveled. */
        rule(
          { pending: true, platform: 'web' },
          {
            backgroundColor: 'transparent',
            backgroundImage: pendingLine,
          },
        ),
      ]),
      /* The rest of the line, from under the mark to the end of the entry. */
      on({ after: 'rail' }, [
        rule({
          backgroundColor: railColor,
          content: '""',
          inlineSize: own.leaveInlineSize(railSize),
        }),
        rule(
          { platform: 'web' },
          {
            alignSelf: own.leaveAlign('stretch'),
            blockSize: own.leaveBlockSize('auto'),
            gridColumn: own.leaveColumn(1),
            gridRow: own.leaveRow(2),
            justifySelf: own.leaveJustify('auto'),
            marginBlockStart: own.leaveMarginBlock(markerSize),
          },
        ),
        rule({ platform: 'native' }, { blockSize: own.leaveBlockSize(railSize), flex: '1 1 0' }),
        rule({ place: 'last' }, { visibility: 'hidden' }),
      ]),
      on('marker', [
        rule({
          '--icon-size': token('size-icon-sm'),
          alignItems: 'center',
          alignSelf: 'start',
          aspectRatio: 1,
          borderRadius: hook.markerRadius(token('radii-full')),
          color: own.tone(hook.markerColor(token('color-foreground-subtle'))),
          display: 'inline-flex',
          inlineSize: markerSize,
          justifyContent: 'center',
        }),
        rule({ platform: 'web' }, { gridColumn: 1, gridRow: own.markerRow(2) }),
      ]),
      on('dot', [rule({ blockSize: token('size-icon-sm'), inlineSize: token('size-icon-sm') })]),
      on('time', [
        rule({
          color: hook.timeColor(token('color-foreground-muted')),
          fontFamily: token('font-sans'),
          fontSize: token('text-xs'),
          fontWeight: token('weight-medium'),
          paddingBlockEnd: token('space-2xs'),
          textAlign: own.timeAlign,
        }),
        rule(
          { platform: 'web' },
          {
            gridColumn: own.timeColumn(2),
            gridRow: own.timeRow(1),
          },
        ),
        rule(
          { place: 'even', platform: 'web' },
          {
            gridColumn: own.evenColumn(own.timeColumn(2)),
          },
        ),
        rule({ place: 'even' }, { textAlign: own.evenAlign(own.timeAlign) }),
        rule({ platform: 'native' }, { flex: '1 1 0', minInlineSize: 0 }),
      ]),
      on('content', [
        rule({
          display: 'flex',
          flexDirection: 'column',
          gap: token('space-2xs'),
          minInlineSize: 0,
          paddingBlockEnd: own.contentBlockEnd(hookOf('timeline', 'gap', token('space-lg'))),
          paddingInlineEnd: own.contentInlineEnd(token('space-none')),
        }),
        rule(
          { platform: 'web' },
          {
            gridColumn: own.contentColumn(2),
            gridRow: own.contentRow(2),
          },
        ),
        rule(
          { place: 'last' },
          {
            paddingBlockEnd: token('space-none'),
            paddingInlineEnd: token('space-none'),
          },
        ),
        rule(
          { place: 'even', platform: 'web' },
          {
            gridColumn: own.evenColumn(own.contentColumn(2)),
          },
        ),
        rule({ place: 'even' }, { textAlign: own.evenAlign }),
      ]),
      /* A phone's rows, which the timeline's layout shows, hides and turns. */
      on('head', [
        rule(
          { platform: 'native' },
          {
            columnGap: hook.columnGap(token('space-md')),
            display: own.head('flex'),
            flexDirection: 'row',
          },
        ),
        rule(
          { place: 'even', platform: 'native' },
          {
            flexDirection: own.evenDirection('row'),
          },
        ),
      ]),
      on('body', [
        rule(
          { platform: 'native' },
          {
            columnGap: hook.columnGap(token('space-md')),
            display: 'flex',
            flexDirection: own.bodyDirection('row'),
            flexGrow: 1,
          },
        ),
        rule(
          { place: 'even', platform: 'native' },
          {
            flexDirection: own.evenDirection(own.bodyDirection('row')),
          },
        ),
      ]),
      /* The side of the line before it, where the line runs down the middle. */
      on(
        ['head-lead', 'lead'],
        [
          rule(
            { platform: 'native' },
            { display: own.lead('none'), flex: own.leadFlex('0 0 auto') },
          ),
        ],
      ),
      on('beside', [
        rule({ platform: 'native' }, { display: own.leadTime('flex'), flex: '1 1 0' }),
      ]),
      on('above', [rule({ platform: 'native' }, { display: own.above('none') })]),
      on('main', [rule({ platform: 'native' }, { flex: '1 1 0', minInlineSize: 0 })]),
      /* The arriving line, as wide as the mark, so it stands over the rail. */
      on('arrive', [
        rule(
          { platform: 'native' },
          {
            alignItems: 'center',
            display: own.arriveDisplay('flex'),
            flexDirection: 'column',
            inlineSize: markerSize,
          },
        ),
      ]),
      on({ before: 'arrive' }, [
        rule(
          { platform: 'native' },
          {
            backgroundColor: railColor,
            content: '""',
            flex: '1 1 0',
            inlineSize: railSize,
          },
        ),
        rule({ place: 'first', platform: 'native' }, { visibility: 'hidden' }),
        rule(
          { pending: true, platform: 'native' },
          {
            backgroundColor: 'transparent',
            backgroundImage: pendingLine,
          },
        ),
      ]),
    ]
  },
)
