import tab from './families/tabs/tab/headless.js'
import { styles } from './table.js'

/*
 * Fails the typecheck where `helix system parts` has not run, or where a table
 * stops being checked against the names it writes: the unused directives below
 * are then the errors. Never compiled by the family compiler, which reads
 * `src/families` alone.
 */
export default styles(tab, { prefix: 'guard', stylesheet: 'guard.css' }, ({ on, rule }) => [
  on('tab', [rule({ display: 'block' })]),
  // @ts-expect-error A part the render does not draw.
  on('tabb', [rule({ display: 'block' })]),
  // @ts-expect-error A region the render does not hold.
  on({ region: 'nowhere' }, [rule({ display: 'block' })]),
  // @ts-expect-error A part the render does not draw, through a pseudo-element.
  on({ before: 'tabb' }, [rule({ display: 'block' })]),
])
