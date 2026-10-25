import { web } from '../style.js'
import { fragment } from '../table.js'

/**
 * Colors printed as drawn, for a family whose fill is what it says: a
 * checkbox's tick, a switch's track. The web's alone, as printing is.
 */
export default fragment('print-exact', { parts: [] }, ({ on, rule }) => [
  on('host', [rule({ print: true }, { printColorAdjust: web('exact') })]),
])
