import { fn, product, token } from '../style.js'
import { fragment } from '../table.js'

/**
 * A label above its control, as every field whose control is a box has it,
 * and the groups of checkboxes and radios. The label sits a step further from
 * the control than the hint under it does: padding rather than a larger gap,
 * which would move both. Taken in with `field`, never instead of it.
 */
export default fragment('field-stacked', { parts: ['label'] }, ({ on, rule }) => [
  on('label', [
    rule({
      display: 'block',
      fontSize: token('text-field-label'),
      /* Tight, as a label over a box is a heading for it, and **rounded to a
         whole pixel**, so the field under the label starts on one: unrounded
         the line was 15.6 at `md`, and every edge and mark below sat between
         pixels. An inline field's label reads at the body's leading instead,
         in `field-inline`. */
      lineHeight: fn('round', product(token('leading-tight'), '1em'), '1px'),
      paddingBlockEnd: token('space-2xs'),
    }),
  ]),
])
