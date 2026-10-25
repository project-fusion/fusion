import { web } from '../style.js'
import { declarations } from '../table.js'

/**
 * Named but not shown: a box one point square that clips what it holds, out
 * of the flow, which a screen reader still reads. A rule takes it into its
 * `set`, as a field's hidden label does.
 *
 * **The clip is the web's**, and a native view keeps the rest, which hides
 * the words as well: a box that small with its overflow hidden draws nothing
 * a reader can see, and the screen reader still finds it.
 */
export default declarations('visually-hidden', {
  blockSize: '1px',
  clipPath: web('inset(50%)'),
  inlineSize: '1px',
  overflow: 'hidden',
  position: 'absolute',
  whiteSpace: 'nowrap',
})
