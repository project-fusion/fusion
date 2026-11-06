import { styles } from '../../../table.js'
import section from './headless.js'

/**
 * An outline section's styled tier. It has
 * no look of its own: it lays out what it holds as a block.
 */
export default styles(
  section,
  { prefix: 'outline-section', stylesheet: 'outline/section/outline-section.generated.css' },
  ({ on, rule }) => [on('host', [rule({ display: 'block' })])],
)
