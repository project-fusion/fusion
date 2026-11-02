import { hookOf, token } from '../../../style.js'
import { styles } from '../../../table.js'
import size from './headless.js'

/**
 * Pagination Size's styled tier.
 *
 * **One row**, since it stands in a footer beside a run of page numbers, where a
 * label over its field would make the whole row two lines tall. The trigger takes
 * the height of the controls beside it. With nothing to choose from it draws
 * nothing.
 */
export default styles(
  size,
  {
    prefix: 'pagination-size',
    hooks: { gap: token('space-xs') },
    stylesheet: 'pagination/size/pagination-size.generated.css',
  },
  ({ hook, on, rule }) => [
    on('host', [rule({ display: 'inline-flex' }), rule({ empty: true }, { display: 'none' })]),
    on('control', [rule({ alignItems: 'center', flexDirection: 'row', gap: hook.gap })]),
    on('control-label', [rule({ paddingBlockEnd: token('space-none'), whiteSpace: 'nowrap' })]),
    on('control-trigger', [
      rule({ blockSize: hookOf('pagination', 'size', token('size-control')) }),
    ]),
  ],
)
