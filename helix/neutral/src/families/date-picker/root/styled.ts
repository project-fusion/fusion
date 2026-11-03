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
 * mark. Grays, the same call Time's range takes: `surface-inverse` is the ground
 * that stays dark while the page goes light. A day of a neighboring month is
 * quieter and takes no press.
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
      periodSize: null,
      rangeColor: null,
      rangePreviewColor: null,
      rowSize: null,
      selectedBackgroundColor: token('color-surface-inverse'),
      trackSize: null,
    },
    own: { day: null, row: null, track: null },
    stylesheet: 'date-picker/root/date-picker-root.generated.css',
  },
  ({ hook, on, own, rule }) => {
    /* The web's own selectors, for what the vocabulary reads on no part. */
    const sel0 =
      '[part="previous"]:hover:not(:disabled, [aria-disabled="true"]), [part="next"]:hover:not(:disabled, [aria-disabled="true"])'
    const sel1 =
      ':host(:not(:disabled)) [part="previous"]:disabled, :host(:not(:disabled)) [part="previous"][aria-disabled="true"], :host(:not(:disabled)) [part="next"]:disabled, :host(:not(:disabled)) [part="next"][aria-disabled="true"]'
    const sel2 = '[part~="period"]:hover:not([aria-disabled])'
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
      color: token('color-foreground-inverse'),
    }
    const spent = { cursor: 'default', opacity: token('opacity-disabled') }
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
    const reach = {
      content: '""',
      inset: quotient(difference(token('size-target'), '100%'), '-2'),
      position: 'absolute',
    }
    return [
      on('host', [
        rule({
          own: {
            day: hook.daySize(product(token('size-control'), 0.75)),
            row: hook.rowSize('2.25rem'),
            track: hook.trackSize('2.5rem'),
          },
          display: 'inline-block',
        }),
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
      on('months', [
        rule({
          alignItems: 'start',
          display: 'grid',
          gap: token('space-md'),
          gridTemplateColumns: fn(
            'repeat',
            hook.columns(measured('date-picker-column-count', 1)),
            'max-content',
          ),
          justifyContent: 'start',
        }),
      ]),
      /* A phone's month takes the seven tracks the web's widest row is, and its header
         is a row whose heading takes the room between the controls, holding a control's
         place where the month draws none, as the web's three columns do. */
      on('month', [native([rule({ inlineSize: product(own.track, 7) })])]),
      on('header', [
        rule({
          alignItems: 'center',
          display: 'grid',
          gap: token('space-2xs'),
          gridTemplateColumns: [own.day, '1fr', own.day],
          marginBlockEnd: token('space-lg'),
        }),
        native([rule({ display: 'flex', flexDirection: 'row' })]),
      ]),
      on('heading', [
        rule({
          fontSize: token('text-sm'),
          fontWeight: token('weight-medium'),
          gridColumn: 2,
          textAlign: 'center',
        }),
        native([
          rule({ flexBasis: 0, flexGrow: 1 }),
          rule(
            { part: { 'data-lone-start': true } },
            {
              marginInlineStart: sum(own.day, token('space-2xs')),
            },
          ),
          rule(
            { part: { 'data-lone-end': true } },
            {
              marginInlineEnd: sum(own.day, token('space-2xs')),
            },
          ),
        ]),
      ]),
      on(
        ['previous', 'next'],
        [
          rule({
            web: { all: 'unset' },
            boxSizing: 'border-box',
            alignItems: 'center',
            blockSize: own.day,
            borderRadius: token('radii-sm'),
            color: token('color-foreground-muted'),
            cursor: 'pointer',
            display: 'inline-flex',
            inlineSize: own.day,
            justifyContent: 'center',
            position: 'relative',
          }),
          rule({ focusVisible: true }, ring),
          rule({ active: true }, { backgroundColor: token('color-press') }),
          native([
            rule({ formDisabled: false, part: { disabled: true } }, spent),
            rule({ part: { 'data-hidden': true } }, { display: 'none' }),
          ]),
        ],
      ),
      /* The web says the end of the months with `aria-disabled`, and stays focusable. */
      on({ part: 'previous', selector: sel0 }, [
        web([
          rule(
            { canHover: true },
            { backgroundColor: token('color-surface-sunken'), color: token('color-foreground') },
          ),
        ]),
      ]),
      on({ part: 'previous', selector: sel1 }, [web([rule(spent)])]),
      on('previous', [rule({ gridColumn: 1 })]),
      on('next', [rule({ gridColumn: 3 })]),
      on({ after: 'previous' }, [web([rule(reach)])]),
      on({ after: 'next' }, [web([rule(reach)])]),
      on(['previous-mark', 'next-mark'], [rule(glyph)]),
      on({ region: ['previous-icon', 'next-icon'], slotted: '*' }, [
        rule(glyph),
        web([rule({ dir: 'rtl' }, { scale: '-1 1' })]),
      ]),
      on('heading-button', [
        rule({
          web: { all: 'unset' },
          boxSizing: 'border-box',
          borderRadius: token('radii-sm'),
          cursor: 'pointer',
          paddingInline: token('space-2xs'),
        }),
        rule(
          { hover: true, part: { disabled: false } },
          { backgroundColor: token('color-surface-sunken') },
        ),
        rule({ focusVisible: true }, ring),
        native([rule({ part: { 'data-hidden': true } }, { display: 'none' })]),
      ]),
      on('heading-text', [native([rule({ part: { 'data-hidden': true } }, { display: 'none' })])]),
      on('periods', [
        rule({
          display: 'grid',
          gap: token('space-2xs'),
          inlineSize: product(own.track, 7),
        }),
      ]),
      on('period-row', [
        rule({
          display: 'grid',
          gap: token('space-2xs'),
          gridTemplateColumns: 'repeat(3, 1fr)',
        }),
      ]),
      /* The web bars a month or a year with `aria-disabled`. */
      on({ part: 'period', selector: sel2 }, [
        web([rule({ canHover: true }, { backgroundColor: token('color-surface-sunken') })]),
      ]),
      on('period', [
        rule({
          alignItems: 'center',
          blockSize: hook.periodSize(product(own.row, 1.5)),
          borderRadius: token('radii-sm'),
          cursor: 'pointer',
          display: 'inline-flex',
          fontSize: token('text-sm'),
          justifyContent: 'center',
          transition: ['background-color', token('duration-fast'), token('easing-standard')],
        }),
        rule(
          { also: { 'period-current': true } },
          {
            boxShadow: ['inset', 0, 0, 0, token('border-thin'), token('color-border')],
          },
        ),
        rule({ also: { 'period-selected': true } }, solid),
        rule(
          { also: { 'period-disabled': true }, formDisabled: false },
          {
            color: token('color-foreground-subtle'),
            ...spent,
          },
        ),
        rule({ focusVisible: true }, ring),
      ]),
      on('week', [rule({ display: 'grid', gridTemplateColumns: fn('repeat', 7, own.track) })]),
      on('weekday', [
        rule({
          alignItems: 'center',
          blockSize: own.track,
          color: token('color-foreground-muted'),
          display: 'inline-flex',
          fontSize: token('text-xs'),
          fontWeight: token('weight-medium'),
          inlineSize: own.track,
          justifyContent: 'center',
          paddingBlockEnd: quotient(own.track, 2),
        }),
      ]),
      on('cell', [
        rule({
          alignItems: 'center',
          blockSize: own.row,
          cursor: 'pointer',
          display: 'inline-flex',
          inlineSize: own.track,
          justifyContent: 'center',
        }),
        rule({ part: { 'data-outside': true } }, { cursor: 'default' }),
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
        rule(
          {
            also: { 'day-disabled': false, 'day-outside': false },
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
          { also: { 'day-disabled': true }, formDisabled: false },
          { color: token('color-foreground-subtle'), opacity: token('opacity-disabled') },
        ),
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
