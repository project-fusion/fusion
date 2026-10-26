import { token } from '../../../style.js'
import { styles } from '../../../table.js'
import group from './headless.js'

/**
 * Tag Group's styled tier, which writes
 * `helix/styled/src/tag/group/tag-group.generated.css`.
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
    },
    stylesheet: 'tag/group/tag-group.generated.css',
  },
  ({ hook, on, rule }) => [
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
