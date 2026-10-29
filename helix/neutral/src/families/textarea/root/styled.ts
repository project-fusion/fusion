import field from '../../../fragments/field.js'
import fieldFrame from '../../../fragments/field-frame.js'
import fieldStacked from '../../../fragments/field-stacked.js'
import printExact from '../../../fragments/print-exact.js'
import {
  difference,
  list,
  mix,
  native,
  product,
  quotient,
  sum,
  token,
  web,
} from '../../../style.js'
import { styles } from '../../../table.js'
import textarea from './headless.js'

const ease = [token('duration-fast'), token('easing-standard')] as const
const ring = [token('size-focus-ring'), 'solid', token('color-focus-ring')] as const

/**
 * Textarea's styled tier, which writes
 * `helix/styled/src/textarea/root/textarea-root.generated.css`.
 *
 * **The same frame as Input**, so a form of mixed fields reads as one set:
 * the stack, the hover edge, the focus ring, and the stripped control are
 * `field-frame`'s, and the box is the field. What is here is the box's
 * padding, the lines of the text, and the buttons at its first line.
 *
 * **The text keeps the lines a reader types**, `pre-wrap`, and breaks a word
 * too long for the box. The web's box drags down only, by `--textarea-resize`,
 * and not while it grows with its text.
 */
export default styles(
  textarea,
  {
    prefix: 'textarea',
    hooks: {
      backgroundColor: token('color-well'),
      borderColor: token('color-border'),
      padding: token('space-xs'),
      radius: token('radii-sm'),
      resize: 'vertical',
    },
    stylesheet: 'textarea/root/textarea-root.generated.css',
  },
  ({ hook, include, on, rule }) => [
    include(field),
    include(fieldStacked),
    on('field', [
      rule({
        backgroundColor: hook.backgroundColor,
        border: [token('border-thin'), 'solid', hook.borderColor],
        borderRadius: hook.radius,
        display: 'flex',
        gap: token('space-2xs'),
        padding: hook.padding,
        position: 'relative',
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
    ]),
    on('control', [
      rule({
        lineHeight: token('leading-normal'),
        overflowWrap: 'break-word',
        whiteSpace: 'pre-wrap',
        web: { resize: hook.resize },
      }),
      /* Nothing to drag while the box follows its text. */
      rule({ autoGrow: true }, { web: { overflow: 'hidden', resize: 'none' } }),
    ]),
    /* Written out: the control beside the dictation button keeps a gap for
       it, which the vocabulary has no name for, since the button is the
       web's alone. */
    on(
      {
        part: 'control',
        selector: '[part="field"]:has([part~="voice"]) [part="control"]',
      },
      [web([rule({ paddingInlineEnd: sum(token('size-icon-loose'), token('space-2xs')) })])],
    ),
    /* What sits at either end keeps its size at the first line. */
    on({ region: ['start', 'end'], slotted: '*' }, [
      rule({
        alignSelf: 'flex-start',
        color: token('color-foreground-muted'),
        flex: '0 0 auto',
      }),
    ]),
    /* The buttons the field owns, dressed as Input's, at the first line. */
    on(
      ['clear', 'voice'],
      [
        rule({
          web: { all: 'unset', cursor: 'pointer' },
          '--icon-size': token('size-icon-tight'),
          alignItems: 'center',
          alignSelf: 'flex-start',
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
      ],
    ),
    /* The dictation button sits on the first line, inset by the padding as
       the text is. */
    on('voice', [
      web([
        rule({
          backgroundColor: 'transparent',
          blockSize: token('size-icon-loose'),
          inlineSize: token('size-icon-loose'),
          insetBlockStart: sum(
            hook.padding,
            quotient(
              difference(product('1em', token('leading-normal')), token('size-icon-loose')),
              2,
            ),
          ),
          insetInlineEnd: hook.padding,
          overflow: 'hidden',
          position: 'absolute',
        }),
        rule(
          { hover: true },
          { backgroundColor: mix(token('color-foreground'), 8, 'transparent') },
        ),
      ]),
    ]),
    on('field', [
      rule({ formDisabled: true }, { web: { cursor: 'not-allowed' }, opacity: 0.5 }),
      /* Flush with its ground. */
      rule({ readonly: true }, { backgroundColor: 'transparent' }),
    ]),
    /* A phone draws the cross the web draws in `clear-icon`, at the icon size. */
    on('clear-mark', [
      native([rule({ blockSize: token('size-icon-tight'), inlineSize: token('size-icon-tight') })]),
    ]),
    /* A control prints the value it holds, in its fill. */
    include(printExact),
  ],
)
