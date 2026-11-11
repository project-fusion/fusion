import { difference, native, product, quotient, sum, token, web } from '../style.js'
import { fragment } from '../table.js'

/**
 * Date Picker's month header and its periods: the heading between the two
 * controls, the controls themselves, the button that opens the months or
 * the years, and the grid of periods it opens, the chosen one in the chosen
 * day's fill. Date Picker's table takes it in after the months.
 */
export default fragment(
  'date-picker-header',
  {
    parts: [
      'header',
      'heading',
      'previous',
      'next',
      'previous-mark',
      'next-mark',
      'heading-button',
      'heading-text',
      'periods',
      'period-row',
      'period',
    ],
    hooks: { periodSize: null, selectedBackgroundColor: null },
    own: { day: null, reach: null, row: null, track: null },
  },
  ({ hook, on, own, rule }) => {
    /* The web's own selectors, for what the vocabulary reads on no part. */
    const sel0 =
      '[part="previous"]:hover:not(:disabled, [aria-disabled="true"]), [part="next"]:hover:not(:disabled, [aria-disabled="true"])'
    const sel1 =
      ':host(:not(:disabled)) [part="previous"]:disabled, :host(:not(:disabled)) [part="previous"][aria-disabled="true"], :host(:not(:disabled)) [part="next"]:disabled, :host(:not(:disabled)) [part="next"][aria-disabled="true"]'
    const sel2 = '[part~="period"]:hover:not([aria-disabled])'
    const ring = {
      outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
      outlineOffset: token('size-focus-offset'),
    }
    const solid = {
      backgroundColor: hook.selectedBackgroundColor(token('color-primary-surface')),
      color: token('color-foreground-on-primary'),
    }
    const spent = { cursor: 'default', opacity: token('opacity-disabled') }
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
      on('header', [
        rule({
          alignItems: 'center',
          display: 'grid',
          gap: token('space-2xs'),
          gridTemplateColumns: [own.day, '1fr', own.day],
          /* With density, so the title keeps its distance from the names. */
          marginBlockEnd: sum(token('space-control'), token('space-xs')),
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
          maxInlineSize: '100%',
        }),
        rule({ coarsePointer: true }, { inlineSize: product(own.reach, 7) }),
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
      /* The chosen month or year keeps the chosen day's fill under the pointer. */
      on({ part: 'period', selector: '[part~="period-selected"]:hover:not([aria-disabled])' }, [
        web([
          rule({ backgroundColor: hook.selectedBackgroundColor(token('color-primary-surface')) }),
        ]),
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
      /* A track gives way down to the day where the box is narrower than
         seven tracks. */
    ]
  },
)
