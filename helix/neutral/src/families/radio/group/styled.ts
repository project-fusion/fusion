import field from '../../../fragments/field.js'
import fieldStacked from '../../../fragments/field-stacked.js'
import { token } from '../../../style.js'
import { styles } from '../../../table.js'
import group from './headless.js'

/**
 * Radio Group's styled tier, which writes `helix/styled/src/radio/group/radio-group.generated.css`.
 *
 * **The host is the stack**: a question, the choices, and one line under
 * them. `orientation` lays out the choices alone, so a row of them keeps its
 * question above it. A wrong group says so on its radios' circles, through
 * the hook each radio reads.
 */
export default styles(
  group,
  {
    prefix: 'radio-group',
    hooks: { gap: null },
    stylesheet: 'radio/group/radio-group.generated.css',
  },
  ({ hook, include, on, rule }) => [
    include(field),
    include(fieldStacked),
    on('host', [rule({ display: 'flex', flexDirection: 'column', gap: token('space-2xs') })]),
    /* A column, because a list of choices is read one line per answer. */
    on('items', [
      rule({ display: 'flex', flexDirection: 'column', gap: hook.gap(token('space-xs')) }),
      rule(
        { orientation: 'horizontal' },
        { columnGap: hook.gap(token('space-md')), flexDirection: 'row', flexWrap: 'wrap' },
      ),
      /* Wrong, and the set says so on the controls rather than around them. */
      rule({ invalid: true }, { '--radio-border-color': token('color-danger') }),
    ]),
  ],
)
