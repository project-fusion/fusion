import { fn, token } from '../style.js'
import { fragment } from '../table.js'

const ring = [token('size-focus-ring'), 'solid', token('color-focus-ring')] as const

/**
 * The frame a text field wears, styled once: what the shared
 * field frame sheet holds, for a family whose table writes its stylesheet. Taken in with `field` and `field-stacked`,
 * before the family's own rules, which draw the frame's box.
 *
 * - **The host is a column**, so the label, the field, and the line under it
 *   stack with no margins. Flex, because a grid's one auto column is floored
 *   at the width of the `<input>` inside it.
 * - **The ring goes on the frame**, in the edge's own color and with no
 *   offset, so a focused field reads as one thicker edge. It is drawn while
 *   focus is anywhere inside the element, after the hover edge, so a focused
 *   field under the pointer keeps its ring.
 * - **A wrong field says so on the frame**, its edge and its ring, in a rule
 *   the family writes after taking this in, since a fragment declares no
 *   states. Under forced colors the family thickens the edge as well, since a
 *   danger edge is painted the system color.
 * - **A read-only field is flush with its ground**, `transparent`, in a rule a
 *   family with `readonly` writes, since a fragment cannot read a prop every
 *   family that takes it may not have.
 * - **The control is stripped**, so the caret, the selection, and a phone's
 *   keyboard stay the platform's. The value is `text-field`, a step over the
 *   label at every density, at least `--helix-text-field-min`, the size below
 *   which iOS Safari zooms into a focused field.
 * - **A placeholder is regular**, where the value is medium, in the muted ink.
 */
export default fragment('field-frame', { parts: ['field', 'control'] }, ({ on, rule }) => [
  on('host', [rule({ display: 'flex', flexDirection: 'column', gap: token('space-2xs') })]),
  on('field', [
    rule({ formDisabled: false, hover: true }, { borderColor: token('color-border-hover') }),
    rule(
      { within: { host: ['focusWithin'] } },
      { borderColor: token('color-primary'), outline: ring, outlineOffset: 0 },
    ),
  ]),
  on('control', [
    rule({
      web: { all: 'unset' },
      boxSizing: 'border-box',
      color: token('color-foreground'),
      flex: '1 1 auto',
      fontFamily: token('font-sans'),
      fontSize: fn('max', token('text-field-min'), token('text-field')),
      fontWeight: token('weight-medium'),
      minInlineSize: 0,
    }),
  ]),
  on({ placeholder: 'control' }, [
    rule({ color: token('color-foreground-muted'), fontWeight: token('weight-regular') }),
  ]),
])
