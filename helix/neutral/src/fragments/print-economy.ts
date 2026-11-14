import { web } from '../style.js'
import { fragment } from '../table.js'

/**
 * Ink saved on paper: backgrounds a printer may leave out. Most families
 * print this way, and a family whose marks are its content prints
 * `print-exact`. The web's alone, as printing is.
 */
export default fragment('print-economy', { parts: [] }, ({ on, rule }) => [
  on('host', [rule({ print: true }, { printColorAdjust: web('economy') })]),
])
