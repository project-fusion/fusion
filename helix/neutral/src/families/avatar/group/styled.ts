import {
  difference,
  fn,
  hookOf,
  inherited,
  list,
  native,
  product,
  sum,
  token,
  web,
} from '../../../style.js'
import { styles } from '../../../table.js'
import group from './headless.js'

/**
 * Avatar Group's styled tier.
 *
 * **Each avatar overlaps the one before it** and is drawn over it. On the
 * web a circle the next avatar's size and a gap wider is cut out of each
 * avatar where the next sits over it, so the gap shows the surface the group
 * is on; `--avatar-group-ring-color` fills it with a color instead. A phone
 * draws no mask, so it rings each avatar in that color, or in the page's
 * background. The overlap is `space-2xs`, whatever the avatars' size, unless
 * the hook sets another. Nothing is positioned, so painting follows the order
 * they stand in.
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
      overflowBorderColor: token('color-border'),
      overflowColor: token('color-foreground-muted'),
      overflowFontSize: token('text-xs'),
      overlap: token('space-2xs'),
      ringColor: 'transparent',
    },
    own: {
      avatarGroupGap: null,
      avatarGroupNext: null,
      avatarGroupRing: null,
      avatarGroupStep: null,
    },
    stylesheet: 'avatar/group/avatar-group.generated.css',
  },
  ({ hook, on, own, rule }) => {
    const step = own.avatarGroupStep(hook.overlap)
    const gap = own.avatarGroupGap(token('border-thick'))
    return [
      on('host', [
        rule({
          alignItems: 'center',
          display: 'flex',
          own: {
            avatarGroupGap: token('border-thick'),
            avatarGroupNext: difference('150%', own.avatarGroupStep(hook.overlap)),
            avatarGroupRing: hook.ringColor,
            avatarGroupStep: hook.overlap,
          },
        }),
        /* Where the next avatar's center sits, from this one's start edge. */
        web([
          rule(
            { dir: 'rtl' },
            { own: { avatarGroupNext: sum('-50%', own.avatarGroupStep(hook.overlap)) } },
          ),
        ]),
        /* A phone draws no mask, so its ring takes the page's background where no color is given. */
        native([
          rule({
            own: {
              avatarGroupRing: hookOf('avatar-group', 'ring-color', token('color-background')),
            },
          }),
        ]),
      ]),
      on({ region: 'default', slotted: '*' }, [
        rule({
          boxShadow: [0, 0, 0, gap, own.avatarGroupRing],
          flex: '0 0 auto',
        }),
        /* The cutout, taken out of every avatar but the last where the next sits over it. */
        web([
          rule(
            { child: 'earlier' },
            {
              maskImage: fn(
                'radial-gradient',
                ['50%', '50%', 'at', own.avatarGroupNext, '50%'],
                ['transparent', difference(sum('100%', gap), '0.5px')],
                ['#000', sum('100%', gap)],
              ),
            },
          ),
        ]),
        rule({ child: 'later' }, { marginInlineStart: product(step, '-1') }),
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
          blockSize: inherited('avatar-size', token('size-avatar')),
          borderRadius: token('radii-full'),
          /* An edge as well as a fill, so the count keeps its circle on a
             surface the color of its fill: inset, after the ring outside it. */
          boxShadow: list(
            [0, 0, 0, gap, own.avatarGroupRing],
            ['inset', 0, 0, 0, token('border-thin'), hook.overflowBorderColor],
          ),
          color: hook.overflowColor,
          display: 'inline-flex',
          flex: '0 0 auto',
          fontFamily: token('font-sans'),
          fontSize: hook.overflowFontSize,
          fontWeight: token('weight-medium'),
          inlineSize: inherited('avatar-size', token('size-avatar')),
          justifyContent: 'center',
          marginInlineStart: product(step, '-1'),
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
