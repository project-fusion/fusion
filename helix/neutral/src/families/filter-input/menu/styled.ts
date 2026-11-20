import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * Filter Menu's styled tier: no box of its own, since the trigger and the menu it
 * draws each draw themselves, and a box here would take a gap of the field's row.
 */
export default styles(
  root,
  {
    prefix: 'filter-menu',
    stylesheet: 'filter-input/menu/filter-menu.generated.css',
  },
  ({ on, rule }) => [on('host', [rule({ display: 'contents' })])],
)
