import { token } from '@fusion.dev/helix-neutral/style'
import { styles } from '@fusion.dev/helix-neutral/table'
import tab from './headless.js'

/** Acme's tab: muted at rest, and underlined in the accent while chosen. */
export default styles(
  tab,
  {
    prefix: 'tabs-tab',
    hooks: {
      color: token('color-muted'),
      selectedColor: token('color-ink'),
    },
    stylesheet: 'tabs/tab/tab.generated.css',
  },
  ({ hook, on, rule }) => [
    on('host', [rule({ display: 'inline-flex' })]),
    on('tab', [
      rule({
        borderBlockEnd: ['2px', 'solid', 'transparent'],
        color: hook.color,
        paddingBlock: token('space-xs'),
        paddingInline: token('space-sm'),
      }),
      rule(
        { selected: true },
        { borderBlockEndColor: token('color-accent'), color: hook.selectedColor },
      ),
    ]),
  ],
)
