import { token } from '../style.js'
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
      paddingBlockEnd: token('space-2xs'),
    }),
  ]),
])
