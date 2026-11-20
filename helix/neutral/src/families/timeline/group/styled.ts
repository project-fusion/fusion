import { hookOf, token } from '../../../style.js'
import { styles } from '../../../table.js'
import group from './headless.js'

/**
 * A timeline group's styled tier.
 *
 * **The heading is a section label**, small and heavy at the start edge, and
 * the space under a group is the space between two entries, so a day reads
 * as part of the same record. The entries are a column, or a row where the
 * timeline runs across. Print keeps a group on one page, and is the web's.
 */
export default styles(
  group,
  {
    prefix: 'timeline-group',
    own: { timelineDirection: null, timelineEntryFlex: null },
    hooks: {
      headingColor: token('color-foreground'),
    },
    stylesheet: 'timeline/group/timeline-group.generated.css',
  },
  ({ hook, on, own, rule }) => [
    on('host', [
      rule({ display: 'block', paddingBlockEnd: hookOf('timeline', 'gap', token('space-lg')) }),
      rule({ place: 'last' }, { paddingBlockEnd: token('space-none') }),
      rule({ print: true }, { breakInside: 'avoid-page' }),
    ]),
    on('heading', [
      rule({
        color: hook.headingColor,
        fontSize: token('text-sm'),
        fontWeight: token('weight-semibold'),
        paddingBlockEnd: token('space-sm'),
      }),
    ]),
    on('entries', [rule({ display: 'flex', flexDirection: own.timelineDirection('column') })]),
    on({ region: 'default', slotted: '*' }, [
      rule({ flex: own.timelineEntryFlex('0 1 auto'), minInlineSize: 0 }),
    ]),
  ],
)
