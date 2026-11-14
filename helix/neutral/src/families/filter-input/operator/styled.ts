import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * Filter Operator's styled tier: a declaration takes no room, so the host is hidden.
 */
export default styles(
  root,
  {
    prefix: 'filter-operator',
    stylesheet: 'filter-input/operator/filter-operator.generated.css',
  },
  ({ on, rule }) => [on('host', [rule({ display: 'none' })])],
)
