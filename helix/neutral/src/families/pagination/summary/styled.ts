import { hookOf, token } from '../../../style.js'
import { styles } from '../../../table.js'
import summary from './headless.js'

/**
 * Pagination Summary's styled tier: prose beside the controls, in the muted ink,
 * with tabular figures so a count that changes does not shuffle the words around
 * it.
 */
export default styles(
  summary,
  {
    prefix: 'pagination-summary',
    hooks: {
      foregroundColor: token('color-foreground-muted'),
    },
    stylesheet: 'pagination/summary/pagination-summary.generated.css',
  },
  ({ hook, on, rule }) => [
    on('host', [
      rule({
        color: hook.foregroundColor,
        display: 'inline-block',
        fontFamily: token('font-sans'),
        fontSize: hookOf('pagination', 'font-size', token('text-sm')),
        fontVariantNumeric: 'tabular-nums',
      }),
    ]),
  ],
)
