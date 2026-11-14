import { token } from '@fusion.dev/helix-neutral/style'
import { styles } from '@fusion.dev/helix-neutral/table'
import tabs from './headless.js'

/** Acme's tab set: its tabs in a row, over a hairline. */
export default styles(
  tabs,
  {
    prefix: 'tabs',
    hooks: {
      gap: token('space-xs'),
    },
    stylesheet: 'tabs/root/tabs-root.generated.css',
  },
  ({ hook, on, rule }) => [
    on('host', [rule({ display: 'block' })]),
    on('tabs', [
      rule({
        borderBlockEnd: ['1px', 'solid', token('color-line')],
        display: 'flex',
        gap: hook.gap,
      }),
    ]),
  ],
)
