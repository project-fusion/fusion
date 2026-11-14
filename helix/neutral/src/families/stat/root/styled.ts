import printEconomy from '../../../fragments/print-economy.js'
import { native, product, quotient, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * Stat's styled tier.
 *
 * **A grid on the web, so the unit sits on the figure's baseline** and the
 * label and the trend span the width above and below it. A phone has no grid
 * to span, so it stacks the label, the figure's line and the trend, and lays
 * the figure and the unit out on their line, on one baseline.
 *
 * **The sizes are relative to the type around the stat**: the figure is the
 * ramp's `3xl` over its `md`, in ems, so a stat in a small place shrinks
 * with it. On a phone the figure, the label and the unit grow with the
 * reader's text size, as all words do, and the gaps stop growing at the
 * largest standard size.
 *
 * **A row puts the pieces side by side**, on one baseline. The web's
 * `row-reverse` writes `order` on the label's slot, which draws no box, so it
 * moves nothing, and a phone draws it as a row.
 */
export default styles(
  root,
  {
    prefix: 'stat',
    hooks: {
      gap: null,
      labelColor: token('color-foreground-muted'),
      labelSize: product(quotient(token('text-xs'), token('text-md')), '1em'),
      unitColor: token('color-foreground-muted'),
      unitSize: product(quotient(token('text-md'), token('text-md')), '1em'),
      valueColor: token('color-foreground'),
      valueSize: product(quotient(token('text-3xl'), token('text-md')), '1em'),
    },
    stylesheet: 'stat/root/stat-root.generated.css',
  },
  ({ hook, include, on, rule }) => [
    on('host', [
      rule({
        alignContent: 'start',
        /* The last line's baseline, so the unit follows a figure that wraps to the
           line it ends on. */
        alignItems: 'last baseline',
        display: 'grid',
        gap: hook.gap(token('space-2xs')),
        gridTemplateColumns: 'auto 1fr',
      }),
      /* With no unit, no gap where it would stand. */
      web([rule({ hasUnit: false }, { columnGap: token('space-none') })]),
      /* A phone stacks the label, the figure's line and the trend. */
      native([rule({ alignItems: 'stretch', display: 'flex', flexDirection: 'column' })]),
      /* Side by side, on one baseline. */
      rule([{ direction: 'row' }, { direction: 'row-reverse' }], {
        alignItems: 'baseline',
        display: 'flex',
        gap: hook.gap(token('space-xs')),
      }),
      native([
        rule([{ direction: 'row' }, { direction: 'row-reverse' }], { flexDirection: 'row' }),
      ]),
    ]),
    on('figure', [
      native([
        rule({
          alignItems: 'baseline',
          display: 'flex',
          flexDirection: 'row',
          gap: hook.gap(token('space-2xs')),
        }),
        rule([{ direction: 'row' }, { direction: 'row-reverse' }], {
          gap: hook.gap(token('space-xs')),
        }),
      ]),
    ]),
    on({ region: 'label', slotted: '*' }, [
      rule({
        color: hook.labelColor,
        fontSize: hook.labelSize,
        fontWeight: token('weight-medium'),
        gridColumn: '1 / -1',
        letterSpacing: token('tracking-wide'),
        /* A long unbroken word breaks inside the column it was given. */
        web: { overflowWrap: 'anywhere' },
      }),
      rule({ direction: 'column-reverse' }, { order: 1 }),
      rule([{ direction: 'row' }, { direction: 'row-reverse' }], { gridColumn: 'auto' }),
    ]),
    on('value', [
      rule({
        color: hook.valueColor,
        fontFamily: token('font-display'),
        fontSize: hook.valueSize,
        /* Figures take one width each. A value breaks only where a word is wider than
           the whole column, so "99.9%" stays together. `anywhere`, since `break-word`
           leaves the word's full width as the `auto` column's minimum, and the column
           then runs past the host. */
        fontVariantNumeric: 'tabular-nums',
        web: { overflowWrap: 'anywhere' },
        fontWeight: token('weight-semibold'),
        letterSpacing: token('tracking-tight'),
        lineHeight: token('leading-tight'),
      }),
      /* A figure that reads as a number breaks only after a group separator. */
      web([rule({ number: true }, { overflowWrap: 'normal' })]),
      /* A step smaller, and two, where the figure does not fit the stat's width. */
      rule(
        { stepped: true },
        { fontSize: quotient(product(hook.valueSize, token('text-2xl')), token('text-3xl')) },
      ),
      rule(
        { steppedTwice: true },
        { fontSize: quotient(product(hook.valueSize, token('text-xl')), token('text-3xl')) },
      ),
    ]),
    /* **A slotted figure the stat cannot break is a box of its own**, so the
       rule below can hold it. Through the slot alone its text was a box
       nothing could style. Only while it is a number, the one case where the
       slot shows the figure itself. */
    on({ part: 'value', selector: ':host(:state(number)) slot[part="value"]' }, [
      web([rule({ display: 'block' })]),
    ]),
    /* **Two steps down and still too wide, the figure stays in its column.**
       Inside the owner's rule of November 3, 2026, which breaks a figure only
       after a group separator, two cases were left over: a figure with no
       separator cannot break at all, and "123456789012" at the 6rem floor ran
       67 pixels past its column, so it ends in an ellipsis at the column's
       edge with the unit still beside it; and a figure that breaks after its
       separators ended its last line well short of the column, the unit 35
       pixels from the last digit, so its lines are set to the column's end.
       Only two steps down, and only for a number: slotted words keep breaking
       where they must. The whole figure is still what a screen reader says. */
    on(
      {
        part: 'value',
        selector:
          ':host(:state(stepped-twice)) [part="value"]:not(slot), :host(:state(stepped-twice):state(number)) slot[part="value"]',
      },
      [
        web([
          rule({
            minInlineSize: 0,
            overflowX: 'clip',
            overflowClipMargin: token('border-thick'),
            textAlign: 'end',
            textOverflow: 'ellipsis',
          }),
        ]),
      ],
    ),
    on({ region: 'unit', slotted: '*' }, [
      rule({
        color: hook.unitColor,
        fontSize: hook.unitSize,
        fontWeight: token('weight-medium'),
        justifySelf: 'start',
      }),
    ]),
    on({ region: 'trend', slotted: '*' }, [
      rule({ gridColumn: '1 / -1', web: { overflowWrap: 'anywhere' } }),
    ]),
    on({ region: 'label' }, [rule({ direction: 'row-reverse' }, { order: 1 })]),
    include(printEconomy),
  ],
)
