import { oneOf } from '@fusion.dev/helix-neutral/render'
import { token } from '@fusion.dev/helix-neutral/style'
import { styles } from '@fusion.dev/helix-neutral/table'
import badge from './headless.js'

/** Acme's badge, filled in its tone and rounded to a pill. */
export default styles(
  badge,
  {
    prefix: 'badge',
    hooks: {
      radius: token('radius-pill'),
    },
    props: {
      tone: oneOf(['accent', 'neutral']),
    },
    stylesheet: 'badge/root/badge-root.generated.css',
  },
  ({ hook, on, rule, variants }) => [
    on('host', [rule({ display: 'inline-flex', gap: token('space-xs') })]),
    on('indicator', [
      rule({
        backgroundColor: token('color-accent'),
        borderRadius: hook.radius,
        color: token('color-on-accent'),
        fontSize: token('text-sm'),
        fontWeight: token('weight-bold'),
        paddingInline: token('space-xs'),
      }),
      variants('tone', {
        neutral: { backgroundColor: token('color-muted') },
      }),
    ]),
  ],
)
