import field from '../../../fragments/field.js'
import fieldStacked from '../../../fragments/field-stacked.js'
import printExact from '../../../fragments/print-exact.js'
import { token } from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * Checkbox Group's styled tier, which writes
 * `helix/styled/src/checkbox-group/root/checkbox-group-root.generated.css`.
 *
 * **The host is the stack**: a name, the set, and one line under it.
 * `orientation` lays out the boxes alone, so a row of them keeps its name
 * above it. A wrong group says so on its boxes, through the hook each
 * checkbox reads, which reaches the boxes passed into `items` on a phone as
 * on the web.
 */
export default styles(
  root,
  {
    prefix: 'checkbox-group',
    hooks: ['gap'],
    stylesheet: 'checkbox-group/root/checkbox-group-root.generated.css',
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
      rule({ invalid: true }, { '--checkbox-border-color': token('color-danger') }),
    ]),
    /* A tick that is a fill prints as an empty box, which says the opposite
       of the truth. */
    include(printExact),
  ],
)
