import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * Filter Field's styled tier: a declaration takes no room, so the host is hidden.
 */
export default styles(
  root,
  {
    prefix: 'filter-field',
    stylesheet: 'filter-input/field/filter-field.generated.css',
  },
  ({ on, rule }) => [on('host', [rule({ display: 'none' })])],
)
