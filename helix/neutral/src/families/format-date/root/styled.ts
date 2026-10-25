import { web } from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * Format Date's styled tier, which writes
 * `helix/styled/src/format-date/root/format-date-root.generated.css`.
 *
 * **A timestamp is a piece of text and takes the text around it**: no
 * family, no size, no color, and an inline host, so a phone draws it as a
 * run inside the words around it.
 *
 * **Tabular figures, only where the reading changes under the reader.** An
 * elapsed reading counting up from `1m` to `42m` moves its own trailing edge
 * with proportional figures, and in a feed those edges are a column. A date
 * is written once and keeps the figures the text around it is set in.
 *
 * **On paper an elapsed reading has no reference point**, so print writes
 * the exact instant the `<time>` carries after it. Print is the web's.
 */
export default styles(
  root,
  { prefix: 'format-date', stylesheet: 'format-date/root/format-date-root.generated.css' },
  ({ on, rule }) => [
    on('host', [
      rule({ display: 'inline' }),
      rule({ elapsed: true }, { fontVariantNumeric: 'tabular-nums' }),
    ]),
    on({ after: 'time' }, [
      rule({ elapsed: true, print: true }, { content: web('" (" attr(datetime) ")"') }),
    ]),
  ],
)
