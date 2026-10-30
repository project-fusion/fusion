import field from '../../../fragments/field.js'
import fieldStacked from '../../../fragments/field-stacked.js'
import printExact from '../../../fragments/print-exact.js'
import { native, token } from '../../../style.js'
import { styles } from '../../../table.js'
import pinInput from './headless.js'

/**
 * Pin Input's styled tier.
 *
 * **A row of boxes, apart, as wide as its boxes**, so the row starts where
 * the label does. Each box is a drawn square, its character centered, in
 * tabular figures so the row does not move as a code is typed.
 *
 * **The box the caret is in takes the ring**, in the edge's own color with
 * no offset, and not the whole row, since the boxes say which character is
 * next. A phone lays the field that holds the code over the row, out of
 * sight, where the web's element sets it out of sight itself.
 */
export default styles(
  pinInput,
  {
    prefix: 'pin-input',
    hooks: {
      caretColor: 'currentcolor',
      cellBackgroundColor: token('color-well'),
      cellBorderColor: token('color-border'),
      cellBorderColorFocus: token('color-primary'),
      cellColor: token('color-foreground'),
      cellFontSize: token('text-lg'),
      cellRadius: token('radii-sm'),
      cellSize: token('size-control'),
      gap: token('space-xs'),
      placeholderColor: token('color-foreground-muted'),
      separatorColor: token('color-foreground-muted'),
    },
    stylesheet: 'pin-input/root/pin-input-root.generated.css',
  },
  ({ hook, include, on, rule }) => [
    include(field),
    include(fieldStacked),
    on('host', [rule({ display: 'flex', flexDirection: 'column', gap: token('space-2xs') })]),
    on('field', [
      rule({ alignSelf: 'start', display: 'flex', gap: hook.gap }),
      /* The field that holds the code lies over the row. */
      native([rule({ position: 'relative' })]),
    ]),
    /* A phone's field is out of sight over the boxes, so a press on any box
       focuses it. */
    on('control', [native([rule({ inset: 0, opacity: 0, position: 'absolute' })])]),
    on('cell', [
      rule({
        web: { all: 'unset', cursor: 'text' },
        alignItems: 'center',
        backgroundColor: hook.cellBackgroundColor,
        blockSize: hook.cellSize,
        border: [token('border-thin'), 'solid', hook.cellBorderColor],
        borderRadius: hook.cellRadius,
        boxSizing: 'border-box',
        color: hook.cellColor,
        display: 'flex',
        fontFamily: token('font-sans'),
        fontSize: hook.cellFontSize,
        fontVariantNumeric: 'tabular-nums',
        fontWeight: token('weight-medium'),
        inlineSize: hook.cellSize,
        justifyContent: 'center',
        textAlign: 'center',
        transition: ['border-color', token('duration-fast'), token('easing-standard')],
      }),
      /* The ring around the box the caret is in, against its edge. */
      rule(
        { also: { 'cell-active': true } },
        {
          borderColor: hook.cellBorderColorFocus,
          outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
          outlineOffset: 0,
        },
      ),
      rule({ invalid: true }, { borderColor: token('color-danger') }),
      /* Under the pointer the edge is muted, over the ring's edge and a
         wrong box's alike. */
      rule({ formDisabled: false, hover: true }, { borderColor: token('color-foreground-muted') }),
      rule({ formDisabled: true }, { web: { cursor: 'not-allowed' }, opacity: 0.5 }),
      rule({ readonly: true }, { backgroundColor: 'transparent' }),
      /* A bullet sits high in a small box, so a masked code is a step larger. */
      rule({ mask: true }, { fontSize: token('text-xl') }),
    ]),
    on('separator', [
      rule({ alignSelf: 'center', color: hook.separatorColor, fontSize: token('text-lg') }),
    ]),
    on('placeholder', [
      rule({ color: hook.placeholderColor, fontWeight: token('weight-regular') }),
    ]),
    /* The caret the field would draw, a bar the height of the type. */
    on('caret', [
      rule({
        backgroundColor: hook.caretColor,
        blockSize: '1em',
        inlineSize: token('border-thin'),
      }),
      native([rule({ part: { hidden: true } }, { display: 'none' })]),
    ]),
    on('placeholder', [native([rule({ part: { hidden: true } }, { display: 'none' })])]),
    include(printExact),
  ],
)
