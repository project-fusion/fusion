import { token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import group from './headless.js'

/**
 * Tag Group's styled tier.
 *
 * **A row of tags that wraps**, a step of space between them either way, so
 * a set of filters under a search field reads as one block. The `empty` part
 * takes focus once the last tag is removed, and draws the ring a tag draws
 * round what it holds.
 */
export default styles(
  group,
  {
    prefix: 'tag-group',
    hooks: {
      gap: token('space-2xs'),
      moveDuration: null,
      moveEasing: null,
    },
    stylesheet: 'tag/group/tag-group.generated.css',
  },
  ({ hook, on, rule }) => [
    /* Tags close a gap at the pace of a change that answers a hand. The group
       reads these from its script, so they are set here rather than read with a
       fallback, and a page setting either on the element wins over this rule. A
       phone moves nothing: its tags stand in their new places at once. */
    on('host', [
      web([
        rule({
          '--tag-group-move-duration': token('duration-normal'),
          '--tag-group-move-easing': token('easing-standard'),
        }),
        /* Where a leaving tag's copy fades, so the box the copy is placed against:
           the layout motion lays it there. */
        rule({ position: 'relative' }),
      ]),
    ]),
    on('host', [rule({ display: 'flex', flexWrap: 'wrap', gap: hook.gap })]),
    on('empty', [
      rule(
        { focusVisible: true },
        {
          borderRadius: token('radii-sm'),
          outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
          outlineOffset: token('size-focus-offset'),
        },
      ),
    ]),
  ],
)
