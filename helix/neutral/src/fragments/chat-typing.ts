import { web } from '../style.js'
import { declarations } from '../table.js'

/**
 * The box of the three dots that say somebody is typing, drawn by two elements of
 * the family under one part name: a message's `indicator` while a streamed turn
 * waits for its first token, and the chat's `indicator` in the status band while
 * `typing` names someone. One fragment, so the two keep one pace and one shape.
 *
 * **On the web one box and three gradients, with no children**, so the dots are a
 * single part a sheet can size, color, or replace. **A phone draws no such gradient
 * or position animation**, so it draws three dots in the box, at the same pace.
 */
export default declarations('chat-typing', {
  backgroundImage: web(
    'radial-gradient(circle closest-side, currentColor 90%, transparent), radial-gradient(circle closest-side, currentColor 90%, transparent), radial-gradient(circle closest-side, currentColor 90%, transparent)',
  ),
  backgroundPosition: web('0% 50%, 50% 50%, 100% 50%'),
  backgroundRepeat: web('no-repeat'),
  backgroundSize: web('20% 30%, 20% 30%, 20% 30%'),
  blockSize: web('1lh'),
  display: web('block'),
  inlineSize: web('1.75em'),
  opacity: 0.7,
})
