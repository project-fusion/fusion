import datePickerHeader from '../../../fragments/date-picker-header.js'
import {
  difference,
  fn,
  measured,
  mix,
  native,
  product,
  quotient,
  scheme,
  sum,
  token,
  web,
} from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * Date Picker's styled tier.
 *
 * **Two sizes, the track and the day.** A column track is wider than a day, the
 * day centered in it, and the space between days belongs to the track, so a
 * range paints the whole track and runs unbroken. **A single date is a ring on
 * its day**, round because the day is square, and a range's ends are the solid
 * mark, in the primary fill, as a Switch that is on takes it: a chosen date is a
 * value set. A day of a neighboring month is quieter and takes no press.
 *
 * **The track and the row step with density**, a control's height and 4 under
 * it, and on a touch screen the row grows to the target and a track as far as
 * the calendar's own box allows.
 *
 * **A phone marks a cell by what it is**, as the web reads its attributes: the
 * day today, chosen, outside the month, or barred, and the cell in a range or its
 * preview. The controls stand on the first month and the last alone.
 */
export default styles(
  root,
  {
    prefix: 'date-picker',
    hooks: {
      columns: null,
      daySize: null,
      feedbackColor: token('color-danger'),
      rangeColor: null,
      rangePreviewColor: null,
      rowSize: null,
      selectedBackgroundColor: token('color-primary-surface'),
      trackSize: null,
    },
    own: {
      columns: null,
      day: null,
      month: null,
      names: null,
      reach: null,
      row: null,
      track: null,
    },
    stylesheet: 'date-picker/root/date-picker-root.generated.css',
  },
  ({ hook, include, on, own, rule }) => {
    /* The web's own selectors, for what the vocabulary reads on no part. */
    const sel3 =
      '[part~="cell"][aria-selected]:is([data-range-start], [data-range-middle], [data-range-end])'
    const sel4 =
      '[part~="cell"][data-range-preview]:is([data-range-start], [data-range-middle], [data-range-end])'
    const sel5 =
      '[part~="cell"][data-range-start], [part~="cell"][aria-selected]:not([data-range-middle]):not([data-range-end])'
    const sel6 =
      '[part~="cell"][data-range-end], [part~="cell"][aria-selected]:not([data-range-middle]):not([data-range-start])'
    const sel7 = '[part~="cell"][aria-disabled]'
    const sel8 = '[part~="cell"]:focus-visible'
    const sel9 =
      '[part~="cell"][aria-selected]:not([data-range-start]):not([data-range-middle]):not([data-range-end]) [part~="day"]'
    const sel10 =
      ':host([invalid]) [part~="cell"][aria-selected] [part~="day"], :host(:state(invalid)) [part~="cell"][aria-selected] [part~="day"]'
    const sel11 =
      ':host([invalid]) [part~="cell"]:focus-visible [part~="day"], :host(:state(invalid)) [part~="cell"]:focus-visible [part~="day"]'
    const ring = {
      outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
      outlineOffset: token('size-focus-offset'),
    }
    const danger = {
      outline: [token('size-focus-ring'), 'solid', token('color-danger')],
      outlineOffset: token('size-focus-offset'),
    }
    const band = hook.rangeColor(
      scheme(mix(token('color-foreground'), 10, 'transparent'), token('color-selected')),
    )
    const preview = hook.rangePreviewColor(scheme(token('color-well'), token('color-hover')))
    const solid = {
      backgroundColor: hook.selectedBackgroundColor,
      color: token('color-foreground-on-primary'),
    }
    const pitch = difference(token('size-control'), token('space-2xs'))
    const startCorners = {
      borderEndStartRadius: token('radii-sm'),
      borderStartStartRadius: token('radii-sm'),
    }
    const endCorners = {
      borderEndEndRadius: token('radii-sm'),
      borderStartEndRadius: token('radii-sm'),
    }
    const glyph = {
      '--icon-size': token('size-icon-tight'),
      blockSize: token('size-icon-tight'),
      inlineSize: token('size-icon-tight'),
    }
    return [
      on('host', [
        rule({
          own: {
            day: hook.daySize(product(token('size-control'), 0.75)),
            row: hook.rowSize(pitch),
            track: hook.trackSize(token('size-control')),
            /* The names' row keeps the week's pitch as a mouse sees it, since
               nothing in it is pressed. */
            names: hook.rowSize(pitch),
            month: product(own.track, 7),
          },
          display: 'inline-block',
          /* Figures of one width, so days and years line up digit over digit. */
          fontVariantNumeric: 'tabular-nums',
        }),
        /* On a touch screen the row grows to the target, and a track as far as
           the calendar's own box allows. */
        rule(
          { coarsePointer: true },
          {
            own: {
              row: hook.rowSize(token('size-target')),
              reach: hook.trackSize(fn('max', token('size-target'), token('size-control'))),
              month: product(own.reach, 7),
            },
          },
        ),
        rule(
          { formDisabled: true },
          {
            '--_field-disabled-opacity': 1,
            cursor: 'not-allowed',
            opacity: token('opacity-disabled'),
          },
        ),
        rule({ print: true }, { boxShadow: 'none', printColorAdjust: 'exact' }),
      ]),
      /* Two months to a row, the rest underneath, and one to a row where two
         do not fit: a row that wraps, held to the width of the columns. */
      on('months', [
        rule({ alignItems: 'start', gap: token('space-md') }),
        web([
          rule({
            own: { columns: hook.columns(measured('date-picker-column-count', 1)) },
            display: 'flex',
            flexWrap: 'wrap',
            maxInlineSize: sum(
              product(own.columns, own.month),
              product(difference(own.columns, 1), token('space-md')),
            ),
          }),
        ]),
        native([
          rule({
            display: 'grid',
            gridTemplateColumns: fn(
              'repeat',
              hook.columns(measured('date-picker-column-count', 1)),
              'max-content',
            ),
            justifyContent: 'start',
          }),
        ]),
      ]),
      /* A phone's month takes the seven tracks the web's widest row is, and its header
         is a row whose heading takes the room between the controls, holding a control's
         place where the month draws none, as the web's three columns do. */
      on('month', [native([rule({ inlineSize: product(own.track, 7) })])]),
      include(datePickerHeader),
      on({ region: ['previous-icon', 'next-icon'], slotted: '*' }, [
        rule(glyph),
        web([rule({ dir: 'rtl' }, { scale: '-1 1' })]),
      ]),
      on('week', [
        rule({ display: 'grid' }),
        web([
          rule({ gridTemplateColumns: fn('repeat', 7, fn('minmax', own.day, own.track)) }),
          rule(
            { coarsePointer: true },
            { gridTemplateColumns: fn('repeat', 7, fn('minmax', own.day, own.reach)) },
          ),
        ]),
        native([rule({ gridTemplateColumns: fn('repeat', 7, own.track) })]),
      ]),
      /* One row of the grid, the pitch the weeks keep. */
      on('weekday', [
        rule({
          alignItems: 'center',
          blockSize: own.names,
          color: token('color-foreground-muted'),
          display: 'inline-flex',
          fontSize: token('text-xs'),
          fontWeight: token('weight-medium'),
          justifyContent: 'center',
        }),
        web([rule({ inlineSize: 'auto' })]),
        native([rule({ inlineSize: own.track })]),
      ]),
      on('cell', [
        rule({
          alignItems: 'center',
          blockSize: own.row,
          cursor: 'pointer',
          display: 'inline-flex',
          justifyContent: 'center',
        }),
        web([rule({ inlineSize: 'auto' })]),
        native([rule({ inlineSize: own.track })]),
        rule({ part: { 'data-outside': true } }, { cursor: 'default' }),
        /* A calendar that is off or read-only takes no press. */
        rule([{ formDisabled: true }, { readonly: true }], { cursor: 'inherit' }),
        native([
          rule(
            [
              { also: { 'cell-range-start': true } },
              { also: { 'cell-range-middle': true } },
              { also: { 'cell-range-end': true } },
            ],
            { backgroundColor: band },
          ),
          rule({ part: { 'data-range-preview': true } }, { backgroundColor: preview }),
          rule({ also: { 'cell-range-start': true } }, startCorners),
          rule({ also: { 'cell-range-end': true } }, endCorners),
        ]),
      ]),
      /* The web marks a chosen cell with `aria-selected` and a barred one with
         `aria-disabled`, which the vocabulary reads on no part. */
      on({ part: 'cell', selector: sel3 }, [web([rule({ backgroundColor: band })])]),
      on({ part: 'cell', selector: sel4 }, [web([rule({ backgroundColor: preview })])]),
      on({ part: 'cell', selector: sel5 }, [web([rule(startCorners)])]),
      on({ part: 'cell', selector: sel6 }, [web([rule(endCorners)])]),
      on({ part: 'cell', selector: sel7 }, [web([rule({ cursor: 'default' })])]),
      on({ part: 'cell', selector: sel8 }, [web([rule({ outline: 'none' })])]),
      on({ part: 'cell', selector: '[part~="cell"][aria-selected][data-range-middle]' }, [
        web([
          rule(
            { forcedColors: true },
            {
              outline: [token('border-thin'), 'solid', 'Highlight'],
              outlineOffset: product(token('border-thin'), '-1'),
            },
          ),
        ]),
      ]),
      on('day', [
        rule({
          alignItems: 'center',
          blockSize: own.day,
          borderRadius: token('radii-sm'),
          display: 'inline-flex',
          fontSize: token('text-sm'),
          inlineSize: own.day,
          justifyContent: 'center',
          transition: ['background-color', token('duration-fast'), token('easing-standard')],
        }),
        rule(
          { also: { 'day-today': true } },
          { boxShadow: ['inset', 0, 0, 0, token('border-thin'), token('color-border')] },
        ),
        rule({ also: { 'day-outside': true } }, { color: token('color-foreground-muted') }),
        /* Not on a calendar that is off or read-only, and not on a chosen
           day, which steps its own fill instead, as a solid Button does. */
        rule(
          {
            also: { 'day-disabled': false, 'day-outside': false, 'day-selected': false },
            formDisabled: false,
            readonly: false,
            within: { cell: { hover: true } },
          },
          { backgroundColor: token('color-surface-sunken') },
        ),
        native([
          rule(
            { part: { 'data-ring': true } },
            { boxShadow: [0, 0, 0, quotient(difference(own.row, own.day), 2), band] },
          ),
        ]),
        rule({ also: { 'day-selected': true } }, solid),
        rule(
          {
            also: { 'day-disabled': false, 'day-outside': false, 'day-selected': true },
            formDisabled: false,
            readonly: false,
            within: { cell: { hover: true } },
          },
          { backgroundColor: hook.selectedBackgroundColor(token('color-primary-surface-hover')) },
        ),
        /* A step past the hover under a press, not on a chosen day. */
        rule(
          {
            also: { 'day-disabled': false, 'day-outside': false, 'day-selected': false },
            formDisabled: false,
            readonly: false,
            within: { cell: { active: true } },
          },
          { backgroundColor: token('color-press') },
        ),
        /* Not on a filler day, which keeps the quieter look above. */
        rule(
          { also: { 'day-disabled': true, 'day-outside': false }, formDisabled: false },
          { color: token('color-foreground-subtle'), opacity: token('opacity-disabled') },
        ),
        /* Forced colors paint every fill Canvas: the chosen day takes the
           Highlight pair, a filler day GrayText, and today an outline in the
           text color inside the day, which gives way to the focus ring. */
        web([
          rule(
            { also: { 'day-selected': true }, forcedColors: true },
            { backgroundColor: 'Highlight', color: 'HighlightText', forcedColorAdjust: 'none' },
          ),
          rule({ also: { 'day-outside': true }, forcedColors: true }, { color: 'GrayText' }),
          rule(
            { also: { 'day-today': true }, forcedColors: true },
            {
              outline: [token('border-thin'), 'solid', 'CanvasText'],
              outlineOffset: product(token('border-thin'), '-1'),
            },
          ),
          rule(
            {
              also: { 'day-today': true },
              forcedColors: true,
              within: { cell: { focusVisible: true } },
            },
            ring,
          ),
        ]),
        rule({ within: { cell: { focusVisible: true } } }, ring),
        native([
          rule({ invalid: true, part: { 'data-selected': true } }, danger),
          rule(
            { invalid: true, within: { cell: { focusVisible: true } } },
            { outlineColor: token('color-danger') },
          ),
        ]),
      ]),
      on({ part: 'day', selector: sel9 }, [
        web([rule({ boxShadow: [0, 0, 0, quotient(difference(own.row, own.day), 2), band] })]),
      ]),
      /* Every chosen day takes the danger ring, a range's middle as well, where the web
         reads the cell's `aria-selected`. */
      on({ part: 'day', selector: sel10 }, [web([rule(danger)])]),
      on({ part: 'day', selector: sel11 }, [web([rule({ outlineColor: token('color-danger') })])]),
      on('grid', [
        rule(
          { invalid: true, part: { 'data-unset': true } },
          { borderRadius: token('radii-sm'), ...danger },
        ),
      ]),
      on('feedback', [
        rule({
          color: hook.feedbackColor,
          fontFamily: token('font-sans'),
          fontSize: token('text-sm'),
          margin: [token('space-sm'), token('space-none'), token('space-none')],
        }),
      ]),
      on({ region: 'header', slotted: '*' }, [
        rule({ display: 'block', marginBlockEnd: token('space-sm') }),
      ]),
      on({ region: 'footer', slotted: '*' }, [
        rule({ display: 'block', marginBlockStart: token('space-sm') }),
      ]),
    ]
  },
)
