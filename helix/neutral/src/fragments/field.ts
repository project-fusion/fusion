import { token } from '../style.js'
import { fragment } from '../table.js'
import visuallyHidden from './visually-hidden.js'

/**
 * The label, hint, and feedback every field draws, styled once: what the shared
 * field sheet holds, for a family whose table writes its stylesheet. A family takes it in with `include(field)`, and
 * with `field-inline` or `field-stacked` for where its label sits.
 *
 * **Every placeholder is left to the field that has one.** `::placeholder`
 * matches nothing in a checkbox, a radio, a switch, or a group of them, and a
 * text field writes its own rule.
 */
export default fragment('field', { parts: ['label', 'hint', 'feedback'] }, ({ on, rule }) => [
  on('label', [
    rule({
      color: token('color-foreground'),
      fontFamily: token('font-sans'),
      fontSize: token('text-sm'),
      fontWeight: token('weight-medium'),
      lineHeight: token('leading-tight'),
    }),
    /* Named but not shown, which is what an `aria-label` on the host becomes. */
    rule({ part: { 'data-hidden': true } }, [visuallyHidden]),
  ]),
  /* The mark is drawn and not named: a screen reader says "required" from
     the control's own state. The empty alternative names it nothing where a
     browser can say so. */
  on({ after: 'label' }, [
    rule(
      { has: 'required' },
      { color: token('color-danger'), content: '"*"', marginInlineStart: token('space-2xs') },
    ),
    rule(
      { has: 'required', platform: 'web', supports: '(content: "*" / "")' },
      { content: '"*" / ""' },
    ),
  ]),
  /* The space above is the one margin here that is not zero. */
  on(
    ['hint', 'feedback'],
    [
      rule({
        fontFamily: token('font-sans'),
        fontSize: token('text-xs'),
        lineHeight: token('leading-normal'),
        margin: token('space-none'),
        marginBlockStart: token('space-2xs'),
      }),
    ],
  ),
  on('hint', [rule({ color: token('color-foreground-muted') })]),
  /* Instead of the hint, never beside it, a step heavier. */
  on('feedback', [rule({ color: token('color-danger'), fontWeight: token('weight-medium') })]),
  on(['label', 'hint'], [rule({ disabled: true }, { opacity: 0.5 })]),
])
