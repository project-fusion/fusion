import { token } from '../../../style.js'
import { styles } from '../../../table.js'
import group from './headless.js'

/**
 * A speed dial group's styled tier. Its
 * hooks are the dial's, `--speed-dial-*`.
 *
 * **A column, lined up on the end the trigger is on**, as the dial's own
 * actions are, which the dial hands down. **Its name is small and muted on
 * a chip of its own**, as a menu heads its sections, since the dial floats
 * over a page.
 */
export default styles(
  group,
  {
    prefix: 'speed-dial',
    hooks: {
      gap: token('space-sm'),
      groupLabelColor: token('color-foreground-muted'),
      groupLabelFontSize: token('text-xs'),
      labelBackgroundColor: token('color-surface-overlay'),
    },
    own: { speedDialAlign: null },
    stylesheet: 'speed-dial/group/speed-dial-group.generated.css',
  },
  ({ hook, on, own, rule }) => [
    on('host', [rule({ display: 'block' })]),
    on('group', [
      rule({
        alignItems: own.speedDialAlign('flex-end'),
        display: 'flex',
        flexDirection: 'column',
        gap: hook.gap,
      }),
    ]),
    on('label', [
      rule({
        backgroundColor: hook.labelBackgroundColor,
        borderRadius: token('radii-sm'),
        color: hook.groupLabelColor,
        fontFamily: token('font-sans'),
        fontSize: hook.groupLabelFontSize,
        fontWeight: token('weight-medium'),
        padding: [token('space-2xs'), token('space-xs')],
        whiteSpace: 'nowrap',
      }),
      rule({ hidden: true }, { display: 'none' }),
    ]),
  ],
)
