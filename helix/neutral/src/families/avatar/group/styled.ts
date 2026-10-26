import { fn, inherited, native, product, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import group from './headless.js'

/**
 * Avatar Group's styled tier, which writes
 * `helix/styled/src/avatar/group/avatar-group.generated.css`.
 *
 * **Each avatar overlaps the one before it** and is drawn over it, ringed in
 * the page's background so the edge between two reads. The overlap is a
 * quarter of the avatar's own size, so the initials of a small avatar stay
 * clear of the next one, as a fixed overlap covered half of them. **The
 * initials of an avatar the next one overlaps are centered in the part left
 * showing**, so the next circle covers no letter. A phone reads each
 * avatar's own size as well. Nothing is positioned, so painting
 * follows the order they stand in.
 *
 * **Past `max`, the web hides the avatars from its sheet** as soon as they
 * arrive, before the element's next update: one selector per count up to
 * twelve. A phone leaves them out. **The count is one more member of the
 * stack**, last along the row, a circle in the sunken surface and the muted
 * ink.
 */
export default styles(
  group,
  {
    prefix: 'avatar-group',
    hooks: {
      overflowBackgroundColor: token('color-surface-sunken'),
      overflowColor: token('color-foreground-muted'),
      overflowFontSize: token('text-xs'),
      overlap: null,
      ringColor: token('color-background'),
    },
    own: { avatarGroupClear: null, avatarGroupRing: null },
    stylesheet: 'avatar/group/avatar-group.generated.css',
  },
  ({ hook, on, own, rule }) => {
    /* A quarter of the size each avatar sets on itself. */
    const overlap = product(inherited('_avatar-size', token('size-avatar-sm')), 0.25)
    return [
      on('host', [
        rule({
          alignItems: 'center',
          display: 'flex',
          own: { avatarGroupRing: hook.ringColor },
        }),
      ]),
      on({ region: 'default', slotted: '*' }, [
        rule({
          boxShadow: [0, 0, 0, token('border-thick'), own.avatarGroupRing],
          flex: '0 0 auto',
        }),
        rule({ child: 'later' }, { marginInlineStart: product(hook.overlap(overlap), '-1') }),
        /* The share of each avatar the next one covers, which its initials
           keep clear of. */
        rule({ child: 'earlier' }, { own: { avatarGroupClear: 0.25 } }),
      ]),
      /* Written out: one rule for each value of a prop, each on the children past it. */
      on(
        {
          part: 'host',
          selector:
            ':host([max="1"]) ::slotted(:nth-child(n + 2)), :host([max="2"]) ::slotted(:nth-child(n + 3)), :host([max="3"]) ::slotted(:nth-child(n + 4)), :host([max="4"]) ::slotted(:nth-child(n + 5)), :host([max="5"]) ::slotted(:nth-child(n + 6)), :host([max="6"]) ::slotted(:nth-child(n + 7)), :host([max="7"]) ::slotted(:nth-child(n + 8)), :host([max="8"]) ::slotted(:nth-child(n + 9)), :host([max="9"]) ::slotted(:nth-child(n + 10)), :host([max="10"]) ::slotted(:nth-child(n + 11)), :host([max="11"]) ::slotted(:nth-child(n + 12)), :host([max="12"]) ::slotted(:nth-child(n + 13))',
        },
        [web([rule({ display: 'none' })])],
      ),
      on('overflow', [
        rule({
          alignItems: 'center',
          backgroundColor: hook.overflowBackgroundColor,
          blockSize: inherited('avatar-size', token('size-control-md')),
          borderRadius: token('radii-full'),
          boxShadow: [0, 0, 0, token('border-thick'), own.avatarGroupRing],
          color: hook.overflowColor,
          display: 'inline-flex',
          flex: '0 0 auto',
          fontFamily: token('font-sans'),
          fontSize: hook.overflowFontSize,
          fontWeight: token('weight-medium'),
          inlineSize: inherited('avatar-size', token('size-control-md')),
          justifyContent: 'center',
          marginInlineStart: product(hook.overlap(overlap), '-1'),
        }),
        /* A phone's circle is space, which stops growing at the largest
           standard text size, so the count stops there too and fits it, as
           the web's grows with its circle. `min()` of one length is that
           length in space's points. */
        native([rule({ fontSize: fn('min', hook.overflowFontSize) })]),
      ]),
    ]
  },
)
