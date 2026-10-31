import { difference, safeArea, sum, token, web } from '../style.js'
import { fragment } from '../table.js'

/**
 * The house shape of a floating panel: what the shared floating panel sheet holds,
 * for a family whose table writes its stylesheet. The family says how wide its
 * panel is, what it holds, and where it scrolls.
 *
 * **The hooks are private, and each family points them at its own**, so a family's
 * public `--select-shadow` stays its own: `floating-border-width`,
 * `floating-border-color`, and `floating-shadow`.
 *
 * **A family with a sheet sets its `sheet` state**, from core's `presentedAs`, as
 * `presentation` says. A phone's sheet is the layer's, so those rules are the web's.
 */
export default fragment(
  'floating-panel',
  {
    parts: ['surface'],
    own: { floatingBorderColor: null, floatingBorderWidth: null, floatingShadow: null },
  },
  ({ on, own, rule }) => [
    on('surface', [
      rule({
        backgroundColor: token('color-surface-overlay'),
        border: [
          own.floatingBorderWidth(token('border-floating')),
          'solid',
          own.floatingBorderColor(token('color-border')),
        ],
        borderRadius: token('radii-sm'),
        boxShadow: own.floatingShadow(token('shadow-floating')),
        inset: web('auto'),
        margin: token('space-none'),
      }),
    ]),
    /* Written out: held closed by two things, each enough on its own. `[hidden]`
       is what a server sends, and `:not(:popover-open)` the browser's own closed
       state, restated since an author `display` outranks it. Two rules, as a
       browser with no `:popover-open` drops a whole list it stands in. */
    on({ part: 'surface', selector: '[part="surface"][hidden]' }, [
      web([rule({ display: 'none' })]),
    ]),
    on({ part: 'surface', selector: '[part="surface"]:not(:popover-open)' }, [
      web([rule({ display: 'none' })]),
    ]),
    /* Written out: a fragment declares no states. */
    on({ part: 'surface', selector: ':host(:state(sheet)) [part="surface"]' }, [
      web([
        rule({
          borderEndEndRadius: token('radii-none'),
          borderEndStartRadius: token('radii-none'),
          inlineSize: 'auto',
          insetBlockEnd: 0,
          insetInline: 0,
          maxBlockSize: difference('100dvh', token('space-3xl')),
          maxInlineSize: 'none',
          paddingBlockEnd: sum(token('space-xs'), safeArea('bottom')),
        }),
      ]),
    ]),
    on({ part: 'surface', selector: ':host(:state(sheet)) [part="surface"]::backdrop' }, [
      web([rule({ backgroundColor: token('color-overlay') })]),
    ]),
  ],
)
