import { difference, fn, sum, token } from '../style.js'
import { fragment } from '../table.js'

/**
 * A label beside its control, as a checkbox and a switch have it: the hint
 * and the feedback line up under the words rather than under the mark,
 * because the mark is the control and the words are what they describe.
 * Taken in with `field`, never instead of it. The family declares
 * `field-control-inline-size`, its mark's width, and
 * `field-control-block-size`, its mark's height.
 */
export default fragment(
  'field-inline',
  {
    parts: ['label', 'hint', 'feedback'],
    own: { fieldControlBlockSize: null, fieldControlInlineSize: null },
  },
  ({ on, own, rule }) => [
    /* The words beside a mark read at the density they are in, as a button's
       do, and at the body's leading, since a label beside a mark is read as a
       sentence. */
    on('label', [rule({ fontSize: token('text-control'), lineHeight: token('leading-normal') })]),
    on(
      ['hint', 'feedback'],
      [
        rule({ paddingInlineStart: sum(own.fieldControlInlineSize('0px'), token('space-xs')) }),
        /* On a touch screen the row grows to the target with its words level
           with the top of the mark, so the hint rises by the band that adds,
           which lies over it as the row's own press. */
        rule(
          { coarsePointer: true },
          {
            marginBlockStart: difference(
              token('space-2xs'),
              fn(
                'max',
                '0px',
                difference(token('size-target'), own.fieldControlBlockSize(token('size-target'))),
              ),
            ),
          },
        ),
      ],
    ),
  ],
)
