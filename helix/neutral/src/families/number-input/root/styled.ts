import field from '../../../fragments/field.js'
import fieldFrame from '../../../fragments/field-frame.js'
import fieldStacked from '../../../fragments/field-stacked.js'
import printExact from '../../../fragments/print-exact.js'
import { difference, list, quotient, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import numberInput from './headless.js'

const ease = [token('duration-fast'), token('easing-standard')] as const

/**
 * Number Input's styled tier.
 *
 * **The frame is a text field's**, `field-frame`'s stack, hover edge, focus
 * ring, and wrong state, so a number lines up with an Input beside it in a
 * form. What is here is the box, and a button at each end inside it, so the
 * whole control reads as one field.
 *
 * **The number is centered in tabular figures**, since its digits change
 * under a held stepper and proportional ones would shift as it counts.
 *
 * **Each stepper is square at the field's height**, ruled off from the
 * number, and dimmed at the end of the range so the field keeps its width.
 */
export default styles(
  numberInput,
  {
    prefix: 'number-input',
    hooks: {
      backgroundColor: token('color-well'),
      borderColor: token('color-border'),
      paddingInline: token('space-field'),
      radius: token('radii-sm'),
      size: token('size-control'),
      stepperBackgroundColor: 'transparent',
      stepperBackgroundColorHover: token('color-surface'),
      stepperBorderColor: token('color-border'),
      stepperColor: token('color-foreground-muted'),
      stepperColorHover: token('color-foreground'),
      stepperIconSize: token('size-icon'),
      stepperSize: token('size-control'),
    },
    stylesheet: 'number-input/root/number-input-root.generated.css',
  },
  ({ hook, include, on, rule }) => [
    include(field),
    include(fieldStacked),
    on('field', [
      rule({
        alignItems: 'center',
        backgroundColor: hook.backgroundColor,
        blockSize: hook.size,
        border: [token('border-thin'), 'solid', hook.borderColor],
        borderRadius: hook.radius,
        boxSizing: 'border-box',
        display: 'flex',
        /* The field clips its own corners, which rounds the steppers. */
        overflow: 'hidden',
        transition: ['border-color', ...ease],
      }),
    ]),
    include(fieldFrame),
    on('field', [
      /* Wrong, and the frame says so: its edge, and its ring while focused. */
      rule(
        { invalid: true },
        { borderColor: token('color-danger'), outlineColor: token('color-danger') },
      ),
      /* A danger edge is painted the system color, so a wrong field thickens its edge. */
      rule({ forcedColors: true, invalid: true }, { borderWidth: token('border-thick') }),
      rule(
        { formDisabled: true },
        { web: { cursor: 'not-allowed' }, opacity: token('opacity-disabled') },
      ),
      /* Read-only is flush with its ground: no recess, the ground showing through. */
      rule({ readonly: true }, { backgroundColor: 'transparent' }),
    ]),
    on('control', [
      rule({
        fontVariantNumeric: 'tabular-nums',
        paddingInline: hook.paddingInline,
        textAlign: 'center',
      }),
    ]),
    /* A unit or an icon at either end: quieter than the number, and never shrinking. */
    on({ region: ['start', 'end'], slotted: '*' }, [
      rule({ color: token('color-foreground-muted'), flex: '0 0 auto' }),
    ]),
    on({ region: 'start', slotted: '*' }, [rule({ paddingInlineStart: token('space-xs') })]),
    on({ region: 'end', slotted: '*' }, [rule({ paddingInlineEnd: token('space-xs') })]),
    /* Square, at the field's own height, each ruled off from the number. */
    on(
      ['decrement', 'increment'],
      [
        rule({
          web: { all: 'unset', cursor: 'pointer' },
          alignItems: 'center',
          alignSelf: 'stretch',
          backgroundColor: hook.stepperBackgroundColor,
          position: 'relative',
          boxSizing: 'border-box',
          color: hook.stepperColor,
          display: 'flex',
          flex: 'none',
          inlineSize: hook.stepperSize,
          justifyContent: 'center',
          transition: list(['background-color', ...ease], ['color', ...ease]),
        }),
      ],
    ),
    on('decrement', [
      rule({ borderInlineEnd: [token('border-thin'), 'solid', hook.stepperBorderColor] }),
    ]),
    on('increment', [
      rule({ borderInlineStart: [token('border-thin'), 'solid', hook.stepperBorderColor] }),
    ]),
    on(
      ['decrement', 'increment'],
      [
        rule(
          { disabled: false, hover: true },
          { backgroundColor: hook.stepperBackgroundColorHover, color: hook.stepperColorHover },
        ),
        /* Spent at an end, and dimmed, so the field keeps its width. A field that
           is disabled has faded already, so a stepper does not fade again. */
        rule(
          { disabled: true, formDisabled: false },
          { web: { cursor: 'default' }, opacity: token('opacity-disabled') },
        ),
      ],
    ),
    /* The icons, drawn or passed in, at one size. */
    on(
      ['decrement-mark', 'increment-mark'],
      [rule({ blockSize: hook.stepperIconSize, inlineSize: hook.stepperIconSize })],
    ),
    on({ region: ['decrement-icon', 'increment-icon'], slotted: '*' }, [
      rule({ blockSize: hook.stepperIconSize, inlineSize: hook.stepperIconSize }),
    ]),
    /* The press reaches `--helix-size-target`, in a transparent box, so nothing
       drawn moves. Where the control is already that size the box sits inside it. */
    on({ after: 'increment' }, [
      web([
        rule({
          content: '""',
          inset: quotient(difference(token('size-target'), '100%'), '-2'),
          position: 'absolute',
        }),
      ]),
    ]),
    on({ after: 'decrement' }, [
      web([
        rule({
          content: '""',
          inset: quotient(difference(token('size-target'), '100%'), '-2'),
          position: 'absolute',
        }),
      ]),
    ]),
    /* The label is the surface a reader drags under `scrub`, and says so with the cursor. */
    on('label', [
      web([
        rule({ scrub: true }, { cursor: 'ew-resize', touchAction: 'none', userSelect: 'none' }),
        rule({ formDisabled: true, scrub: true }, { cursor: 'default' }),
        rule({ readonly: true, scrub: true }, { cursor: 'default' }),
      ]),
    ]),
    /* A control prints the value it holds. */
    include(printExact),
  ],
)
