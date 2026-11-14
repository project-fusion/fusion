import { styles } from '../../../table.js'
import edge from './headless.js'

/**
 * Canvas Edge's styled tier: a declaration the board reads, which occupies
 * no space, `none` rather than `contents`, since it has nothing to give the
 * board's layout.
 */
export default styles(
  edge,
  {
    prefix: 'canvas-edge',
    stylesheet: 'canvas/edge/canvas-edge.generated.css',
  },
  ({ on, rule }) => [on('host', [rule({ display: 'none' })])],
)
