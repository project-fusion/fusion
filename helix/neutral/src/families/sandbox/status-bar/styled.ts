import { native, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import bar from './headless.js'

/**
 * Sandbox Status Bar's styled tier.
 *
 * **A row of small muted words under a line**, its readouts at the end. What
 * follows the start region opens the gap that separates the two ends, which
 * ever readout that is, so the bar does not need to know what there was to
 * report.
 *
 * **The readouts change under the pointer** while text is selected in the
 * editor above, so a drag that crosses the bar does not start selecting it.
 *
 * **The caret's digits are of one width**, or the bar shifts each time the
 * column crosses a power of ten, and the eye is pulled to a number that did
 * not change.
 */
export default styles(
  bar,
  {
    prefix: 'sandbox-status-bar',
    hooks: {
      color: token('color-foreground-muted'),
    },
    stylesheet: 'sandbox/status-bar/sandbox-status-bar.generated.css',
  },
  ({ hook, on, rule }) => [
    on('host', [
      rule({
        alignItems: 'center',
        backgroundColor: token('color-background'),
        borderBlockStart: [token('border-thin'), 'solid', token('color-border')],
        color: hook.color,
        display: 'flex',
        flexDirection: 'row',
        fontSize: token('text-xs'),
        gap: token('space-sm'),
        lineHeight: token('leading-tight'),
        padding: [token('space-2xs'), token('space-sm')],
        web: { userSelect: 'none' },
      }),
    ]),
    /* Written out: the web's start region adds no box, so what follows it
       takes the free space before it. A phone's region is a box, and takes
       the free space itself. */
    on({ part: 'caret', selector: 'slot:not([name]) + *' }, [
      web([rule({ marginInlineStart: 'auto' })]),
    ]),
    on({ region: 'default' }, [native([rule({ flexGrow: 1 })])]),
    on('caret', [rule({ fontVariantNumeric: 'tabular-nums' })]),
  ],
)
