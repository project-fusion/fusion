import { hookOf, native, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import group from './headless.js'

/**
 * A group of options, in its styled tier.
 *
 * **Air above a group, and never above the first one**, which would be a gap
 * between the panel's own padding and its first row.
 *
 * **The heading stands on the same inset as the rows under it**, through the hook
 * they read, so a heading and the words it names start on one line.
 */
export default styles(
  group,
  {
    prefix: 'option-group',
    stylesheet: 'option/group/option-group.generated.css',
  },
  ({ on, rule }) => [
    on('host', [rule({ display: 'block' })]),
    /* Written out: an owner hides what a filter leaves out with the attribute, and a
       phone's owner draws nothing for it. */
    on({ part: 'host', selector: ':host([hidden])' }, [web([rule({ display: 'none' })])]),
    /* Written out: the first of its type among whatever the owner holds, which
       the vocabulary's `child` does not say. A phone hears it from the owner. */
    on({ part: 'host', selector: ':host(:not(:first-of-type))' }, [
      web([rule({ marginBlockStart: token('space-xs') })]),
    ]),
    on('label', [
      rule({
        color: token('color-foreground-muted'),
        display: 'block',
        fontFamily: token('font-sans'),
        fontSize: token('text-xs'),
        fontWeight: token('weight-medium'),
        paddingBlock: token('space-2xs'),
        paddingInline: hookOf('option', 'padding', token('space-xs')),
      }),
      native([
        rule({ part: { 'data-later': true } }, { marginBlockStart: token('space-xs') }),
        rule({ hidden: true }, { display: 'none' }),
      ]),
    ]),
  ],
)
