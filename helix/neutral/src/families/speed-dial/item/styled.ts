import { inherit, list, mix, token } from '../../../style.js'
import { styles } from '../../../table.js'
import item from './headless.js'

/**
 * A speed dial action's styled tier, which writes
 * `helix/styled/src/speed-dial/item/speed-dial-item.generated.css`. Its
 * hooks are the dial's, `--speed-dial-*`.
 *
 * **The name and the mark share a line**, the name first, so the marks line
 * up on the end the trigger is on, which the dial hands down. **The mark is
 * round and raised**, a step below the trigger, and lifts under the pointer.
 * **The name sits on a chip** of the overlay surface, since a dial floats
 * over a page, with the shortcut after it in the muted step. One ring shows
 * for the keyboard, on the mark. A disabled action fades.
 */
export default styles(
  item,
  {
    prefix: 'speed-dial',
    hooks: {
      itemBackgroundColor: token('color-surface-overlay'),
      itemColor: token('color-foreground'),
      itemDisabledOpacity: 0.5,
      itemHoverBackgroundColor: mix(token('color-foreground'), 6, token('color-surface-overlay')),
      itemSize: token('size-control-tight'),
      labelBackgroundColor: token('color-surface-overlay'),
      labelColor: token('color-foreground'),
      labelFontSize: token('text-sm'),
      shortcutColor: token('color-foreground-muted'),
    },
    own: { speedDialLabelOpacity: null, speedDialRow: null },
    stylesheet: 'speed-dial/item/speed-dial-item.generated.css',
  },
  ({ hook, on, own, rule }) => {
    const fast = token('duration-fast')
    const surface = hook.labelBackgroundColor
    return [
      on('host', [rule({ display: 'block' })]),
      on('item', [
        rule({
          alignItems: 'center',
          background: 'none',
          border: 'none',
          color: inherit(),
          cursor: 'pointer',
          display: 'inline-flex',
          flexDirection: own.speedDialRow('row-reverse'),
          font: inherit(),
          gap: token('space-sm'),
          padding: token('space-none'),
          textDecoration: 'none',
        }),
        rule({ disabled: true }, { cursor: 'not-allowed', opacity: hook.itemDisabledOpacity }),
      ]),
      on('icon', [
        rule({
          '--icon-size': token('size-icon'),
          alignItems: 'center',
          aspectRatio: 1,
          backgroundColor: hook.itemBackgroundColor,
          borderRadius: token('radii-full'),
          boxShadow: token('shadow-md'),
          color: hook.itemColor,
          display: 'inline-flex',
          inlineSize: hook.itemSize,
          justifyContent: 'center',
          pointerEvents: 'auto',
          transition: list(
            ['background-color', fast, token('easing-standard')],
            ['box-shadow', fast, token('easing-standard')],
          ),
        }),
        rule(
          { lacks: 'disabled', within: { item: { hover: true } } },
          {
            backgroundColor: hook.itemHoverBackgroundColor,
            boxShadow: token('shadow-lg'),
          },
        ),
      ]),
      /* One ring, and on the mark. */
      on('item', [rule({ focusVisible: true }, { outline: 'none' })]),
      on('icon', [
        rule(
          { within: { item: { focusVisible: true } } },
          {
            outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
            outlineOffset: token('size-focus-offset'),
          },
        ),
      ]),
      /* A chip, its own surface, the one the mark takes. */
      on('label', [
        rule({
          backgroundColor: surface,
          borderRadius: token('radii-sm'),
          boxShadow: token('shadow-sm'),
          color: hook.labelColor,
          fontFamily: token('font-sans'),
          fontSize: hook.labelFontSize,
          fontWeight: token('weight-medium'),
          opacity: own.speedDialLabelOpacity(1),
          padding: [token('space-2xs'), token('space-xs')],
          transition: ['opacity', fast, token('easing-standard')],
          whiteSpace: 'nowrap',
        }),
        rule(
          [{ within: { item: { hover: true } } }, { within: { item: { focusVisible: true } } }],
          { opacity: 1 },
        ),
      ]),
      on('shortcut', [
        rule({
          color: hook.shortcutColor,
          marginInlineStart: token('space-sm'),
        }),
        rule({ hidden: true }, { display: 'none' }),
      ]),
    ]
  },
)
