import printEconomy from '../../../fragments/print-economy.js'
import { product, quotient, token } from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * Stat's styled tier, which writes `helix/styled/src/stat/root/stat-root.generated.css`.
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
    hooks: [
      'gap',
      'label-color',
      'label-size',
      'unit-color',
      'unit-size',
      'value-color',
      'value-size',
    ],
    stylesheet: 'stat/root/stat-root.generated.css',
  },
  ({ hook, include, on, rule }) => [
    on('host', [
      rule({
        alignContent: 'start',
        alignItems: 'baseline',
        display: 'grid',
        gap: hook.gap(token('space-2xs')),
        gridTemplateColumns: 'auto 1fr',
      }),
      /* A phone stacks the label, the figure's line and the trend. */
      rule(
        { platform: 'native' },
        { alignItems: 'stretch', display: 'flex', flexDirection: 'column' },
      ),
      /* Side by side, on one baseline. */
      rule([{ direction: 'row' }, { direction: 'row-reverse' }], {
        alignItems: 'baseline',
        display: 'flex',
        gap: hook.gap(token('space-xs')),
      }),
      rule(
        [
          { direction: 'row', platform: 'native' },
          { direction: 'row-reverse', platform: 'native' },
        ],
        { flexDirection: 'row' },
      ),
    ]),
    on('figure', [
      rule(
        { platform: 'native' },
        {
          alignItems: 'baseline',
          display: 'flex',
          flexDirection: 'row',
          gap: hook.gap(token('space-2xs')),
        },
      ),
      rule(
        [
          { direction: 'row', platform: 'native' },
          { direction: 'row-reverse', platform: 'native' },
        ],
        { gap: hook.gap(token('space-xs')) },
      ),
    ]),
    on({ region: 'label', slotted: '*' }, [
      rule({
        color: hook.labelColor(token('color-foreground-muted')),
        fontSize: hook.labelSize(product(quotient(token('text-xs'), token('text-md')), '1em')),
        fontWeight: token('weight-medium'),
        gridColumn: '1 / -1',
        letterSpacing: token('tracking-wide'),
      }),
      rule({ direction: 'column-reverse' }, { order: 1 }),
      rule([{ direction: 'row' }, { direction: 'row-reverse' }], { gridColumn: 'auto' }),
    ]),
    on('value', [
      rule({
        color: hook.valueColor(token('color-foreground')),
        fontFamily: token('font-display'),
        fontSize: hook.valueSize(product(quotient(token('text-3xl'), token('text-md')), '1em')),
        fontWeight: token('weight-semibold'),
        letterSpacing: token('tracking-tight'),
        lineHeight: token('leading-tight'),
      }),
    ]),
    on({ region: 'unit', slotted: '*' }, [
      rule({
        color: hook.unitColor(token('color-foreground-muted')),
        fontSize: hook.unitSize(product(quotient(token('text-md'), token('text-md')), '1em')),
        fontWeight: token('weight-medium'),
      }),
    ]),
    on({ region: 'trend', slotted: '*' }, [rule({ gridColumn: '1 / -1' })]),
    on({ region: 'label' }, [rule({ direction: 'row-reverse' }, { order: 1 })]),
    include(printEconomy),
  ],
)
