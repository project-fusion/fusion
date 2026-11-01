import { token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import separator from './headless.js'

/**
 * A hairline across the panel, in the border color every row and frame in a list
 * uses, with a little air either side, the full width of the panel as the rows
 * run.
 */
export default styles(
  separator,
  {
    prefix: 'option-separator',
    hooks: {
      color: token('color-border'),
      space: token('space-2xs'),
      thickness: token('border-thin'),
    },
    stylesheet: 'option/separator/option-separator.generated.css',
  },
  ({ hook, on, rule }) => [
    /* Written out: a list hides a rule with the attribute while it filters, and a
       phone's list draws nothing for it. */
    on({ part: 'host', selector: ':host([hidden])' }, [web([rule({ display: 'none' })])]),
    on('host', [
      rule({
        borderBlockStart: [hook.thickness, 'solid', hook.color],
        display: 'block',
        marginBlock: hook.space,
      }),
    ]),
  ],
)
