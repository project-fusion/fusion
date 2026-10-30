import field from '../../../fragments/field.js'
import fieldFrame from '../../../fragments/field-frame.js'
import fieldStacked from '../../../fragments/field-stacked.js'
import printExact from '../../../fragments/print-exact.js'
import { list, native, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import input from './headless.js'

const ease = [token('duration-fast'), token('easing-standard')] as const
const ring = [token('size-focus-ring'), 'solid', token('color-focus-ring')] as const

/**
 * Input's styled tier.
 *
 * **The box is the field, and the text is stripped inside it.** The stack,
 * the hover edge, the focus ring, the wrong state, and the stripped control
 * are `field-frame`'s. What is here is the box itself, its height, and the
 * buttons it holds.
 *
 * **Read-only is flush with its ground**, a transparent fill, so a read-only
 * field never stands out of the surface it sits on.
 */
export default styles(
  input,
  {
    prefix: 'input',
    hooks: {
      backgroundColor: token('color-well'),
      borderColor: token('color-border'),
      paddingInline: token('space-xs'),
      radius: token('radii-sm'),
      size: token('size-control'),
    },
    own: { inputSize: null },
    stylesheet: 'input/root/input-root.generated.css',
  },
  ({ hook, include, on, own, rule }) => [
    include(field),
    include(fieldStacked),
    on('host', [rule({ own: { inputSize: hook.size } })]),
    on('field', [
      rule({
        alignItems: 'center',
        backgroundColor: hook.backgroundColor,
        blockSize: own.inputSize,
        border: [token('border-thin'), 'solid', hook.borderColor],
        borderRadius: hook.radius,
        color: token('color-foreground-muted'),
        display: 'flex',
        gap: token('space-2xs'),
        paddingInline: hook.paddingInline,
        transition: list(['border-color', ...ease], ['background-color', ...ease]),
      }),
    ]),
    include(fieldFrame),
    on('field', [
      /* Wrong, and the frame says so: its edge, and its ring while focused. */
      rule(
        { invalid: true },
        { borderColor: token('color-danger'), outlineColor: token('color-danger') },
      ),
      rule({ formDisabled: true }, { web: { cursor: 'not-allowed' }, opacity: 0.5 }),
      rule({ readonly: true }, { backgroundColor: 'transparent' }),
    ]),
    on('control', [rule({ blockSize: '100%' })]),
    /* Written out: the clear mark a search field draws itself, a different
       shape in every browser, which the vocabulary has no name for. */
    on({ part: 'control', selector: '[part="control"]::-webkit-search-cancel-button' }, [
      web([rule({ appearance: 'none' })]),
    ]),
    /* What sits at either end keeps its size, so the text gives way. */
    on({ region: ['start', 'end'], slotted: '*' }, [
      rule({ color: token('color-foreground-muted'), flex: '0 0 auto' }),
    ]),
    /* The buttons the field owns, dressed as one thing. */
    on(
      ['clear', 'reveal', 'voice'],
      [
        rule({
          web: { all: 'unset', cursor: 'pointer' },
          '--icon-size': token('size-icon-tight'),
          alignItems: 'center',
          borderRadius: token('radii-sm'),
          boxSizing: 'border-box',
          color: token('color-foreground-muted'),
          display: 'flex',
          flex: '0 0 auto',
          justifyContent: 'center',
          minBlockSize: token('size-icon-loose'),
          minInlineSize: token('size-icon-loose'),
          transition: ['color', ...ease],
        }),
        rule({ hover: true }, { color: token('color-foreground') }),
        rule({ focusVisible: true }, { outline: ring, outlineOffset: token('size-focus-offset') }),
        /* A revealed password is a state the reader chose, said by the mark alone. */
        rule({ also: { 'reveal-pressed': true } }, { color: token('color-foreground') }),
      ],
    ),
    /* A phone draws the cross the web draws in `clear-icon`, at the icon size. */
    on(
      ['clear-mark', 'reveal-mark'],
      [
        native([
          rule({ blockSize: token('size-icon-tight'), inlineSize: token('size-icon-tight') }),
        ]),
      ],
    ),
    /* A control prints the value it holds. */
    include(printExact),
  ],
)
