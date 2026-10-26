import { sum, token } from '../style.js'
import { fragment } from '../table.js'

/**
 * A label beside its control, as a checkbox and a switch have it: the hint
 * and the feedback line up under the words rather than under the mark,
 * because the mark is the control and the words are what they describe.
 * Taken in with `field`, never instead of it. The family declares
 * `field-control-inline-size`, its mark's width.
 */
export default fragment(
  'field-inline',
  { parts: ['hint', 'feedback'], own: { fieldControlInlineSize: null } },
  ({ on, own, rule }) => [
    on(
      ['hint', 'feedback'],
      [rule({ paddingInlineStart: sum(own.fieldControlInlineSize('0px'), token('space-xs')) })],
    ),
  ],
)
