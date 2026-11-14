import { styles } from '../../../table.js'
import stop from './headless.js'

/**
 * Strands Stop's styled tier: an instruction to the ribbon around it, which
 * draws nothing and takes no room in the content it is placed in, on paper
 * as on screen.
 */
export default styles(
  stop,
  {
    prefix: 'strands-stop',
    stylesheet: 'strands/stop/strands-stop.generated.css',
  },
  ({ on, rule }) => [on('host', [rule({ display: 'none' })])],
)
