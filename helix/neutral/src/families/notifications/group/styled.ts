import { native, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import group from './headless.js'

/**
 * A group of notifications, in its styled tier. **The heading is chrome**, in the
 * muted ink, quieter than a row's title, so a feed cut into days does not read as
 * a list of dates. The count is a mark on the sunken step.
 *
 * **The label and the count stand together at one end**, and what the page puts in
 * `actions` at the other, by a margin on the action, since the row has three
 * children where the group does not fold.
 */
export default styles(
  group,
  {
    prefix: 'notifications',
    hooks: { paddingInline: token('space-lg') },
    stylesheet: 'notifications/group/notification-group.generated.css',
  },
  ({ hook, on, rule }) => [
    on('host', [rule({ display: 'block' })]),
    on('header', [
      rule({
        alignItems: 'center',
        display: 'flex',
        gap: token('space-xs'),
        paddingBlock: token('space-xs'),
        paddingInline: hook.paddingInline,
      }),
      native([rule({ flexDirection: 'row' })]),
    ]),
    on('label', [
      rule({
        color: token('color-foreground-muted'),
        fontFamily: token('font-sans'),
        fontSize: token('text-sm'),
        fontWeight: token('weight-medium'),
      }),
    ]),
    on('count', [
      rule({
        backgroundColor: token('color-surface-sunken'),
        borderRadius: token('radii-full'),
        color: token('color-foreground-muted'),
        fontFamily: token('font-sans'),
        fontSize: token('text-xs'),
        fontVariantNumeric: 'tabular-nums',
        lineHeight: '1',
        minInlineSize: token('size-badge'),
        paddingBlock: token('space-2xs'),
        paddingInline: token('space-xs'),
        textAlign: 'center',
      }),
    ]),
    on('trigger', [
      rule({
        all: 'unset',
        alignItems: 'center',
        boxSizing: 'border-box',
        borderRadius: token('radii-sm'),
        display: 'inline-flex',
        gap: token('space-xs'),
        web: { cursor: 'pointer' },
      }),
      native([rule({ flexDirection: 'row' })]),
      rule(
        { focusVisible: true },
        {
          outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
          outlineOffset: token('size-focus-offset'),
        },
      ),
    ]),
    on({ part: 'label', selector: '[part="trigger"]:hover [part="label"]' }, [
      web([rule({ color: token('color-foreground') })]),
    ]),
    on('actions', [
      rule({
        alignItems: 'center',
        display: 'inline-flex',
        marginInlineStart: 'auto',
      }),
      native([rule({ flexDirection: 'row' })]),
    ]),
    on('items', [rule({ position: 'relative' })]),
  ],
)
