import { oneOf } from '../../../render.js'
import { first, list, mix, native, quotient, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * Badge's styled tier.
 *
 * **The mark is sized by tokens, never by `em`**, so it measures the same
 * beside every size of what it decorates. A phone stops its height, its dot,
 * its corners and its icon growing at the largest standard text size, and its
 * count grows with the reader's text size, as every word does.
 *
 * **Pinned to a corner and pulled back a quarter of its size**, with a ring
 * in the page's color so it stays apart from what it overlaps. `placement`
 * moves it to another corner, or into the line, where it has no ring.
 *
 * **Arriving and leaving are transitions of the same mark**: it stays drawn
 * at zero, and shrinks and fades out. `attention` swells or hops it in a
 * loop, which stops for a reader who asks for less motion and while the
 * app's motion is paused.
 *
 * **The icon of a mark with no value is the whole mark.** The web reaches it
 * with a selector of its own, and a phone with a rule of its own.
 */
export default styles(
  root,
  {
    prefix: 'badge',
    hooks: ({ own }) => ({
      attentionDuration: null,
      backgroundColor: null,
      color: null,
      fontWeight: token('weight-semibold'),
      gap: token('space-2xs'),
      iconSize: own.badgeText,
      offset: quotient(own.badgeSize, 4),
      radius: token('radii-full'),
      ringColor: token('color-background'),
    }),
    own: {
      badgeDot: null,
      badgeFill: null,
      badgeInset: null,
      badgeOn: null,
      badgeSize: null,
      badgeText: null,
    },
    props: {
      attention: oneOf(['bounce', 'pulse']),
      emphasis: oneOf(['outlined', 'solid', 'subtle']),
      placement: oneOf(['bottom-end', 'bottom-start', 'inline', 'top-start']),
      tone: oneOf(['accent', 'danger', 'info', 'neutral', 'primary', 'success', 'warning']),
    },
    stylesheet: 'badge/root/badge-root.generated.css',
  },
  ({ hook, keyframes, on, own, rule, variants }) => [
    on('host', [
      rule({
        display: 'inline-flex',
        position: 'relative',
        web: { verticalAlign: 'middle' },
        own: {
          badgeSize: token('size-badge'),
          badgeText: token('text-xs'),
          badgeInset: token('space-2xs'),
          badgeDot: token('space-xs'),
          badgeOn: token('color-foreground-on-primary'),
          badgeFill: token('color-primary-surface'),
        },
      }),
      /* The fills, which are Tag's, each with the ink its family's fill takes. */
      variants('tone', {
        primary: { own: { badgeFill: token('color-primary-surface') } },
        accent: { own: { badgeFill: token('color-accent-surface') } },
      }),
      rule({ tone: 'accent' }, { own: { badgeOn: token('color-foreground-on-accent') } }),
      rule([{ tone: 'danger' }, { tone: 'info' }, { tone: 'success' }, { tone: 'warning' }], {
        own: { badgeOn: token('color-foreground-on-status') },
      }),
      variants('tone', {
        info: { own: { badgeFill: token('color-info-surface') } },
        success: { own: { badgeFill: token('color-success-surface') } },
        warning: { own: { badgeFill: token('color-warning-surface') } },
        danger: { own: { badgeFill: token('color-danger-surface') } },
        neutral: {
          own: { badgeFill: token('color-surface-raised'), badgeOn: token('color-foreground') },
        },
      }),
      /* In the line, after what it counts, with no ring. */
      rule({ placement: 'inline' }, { alignItems: 'center', gap: hook.gap }),
      rule({ print: true }, { boxShadow: 'none' }),
    ]),
    on('indicator', [
      rule({
        alignItems: 'center',
        backgroundColor: first(hook.backgroundColor, own.badgeFill),
        blockSize: own.badgeSize,
        borderRadius: hook.radius,
        boxShadow: [0, 0, 0, token('border-thick'), hook.ringColor],
        color: first(hook.color, own.badgeOn),
        display: 'inline-flex',
        fontSize: own.badgeText,
        fontWeight: hook.fontWeight,
        insetBlockStart: hook.offset,
        insetInlineEnd: hook.offset,
        justifyContent: 'center',
        lineHeight: 1,
        minInlineSize: own.badgeSize,
        paddingInline: own.badgeInset,
        pointerEvents: 'none',
        position: 'absolute',
        translate: '50% -50%',
        whiteSpace: 'nowrap',
      }),
      /* No value: a dot of its own size, which grows round an icon. */
      rule(
        { 'data-dot': true },
        {
          blockSize: 'auto',
          minBlockSize: own.badgeDot,
          minInlineSize: own.badgeDot,
          paddingInline: token('space-none'),
        },
      ),
      rule({ gap: quotient(own.badgeInset, 2) }),
      /* One character is a circle. */
      rule({ 'data-single': true }, { paddingInline: token('space-none') }),
      /* Arriving, and leaving at zero. */
      rule({
        scale: 1,
        transition: list(
          ['opacity', token('duration-fast'), token('easing-standard')],
          ['scale', token('duration-normal'), token('easing-emphasized')],
        ),
      }),
      rule(
        { 'data-blank': true },
        {
          opacity: 0,
          scale: 0,
          transition: list(
            ['opacity', token('duration-fast'), token('easing-standard')],
            ['scale', token('duration-fast'), token('easing-accelerate')],
          ),
        },
      ),
      /* Another corner, with the same pull and the same half-overhang. */
      rule([{ placement: 'top-start' }, { placement: 'bottom-start' }], {
        insetInlineEnd: 'auto',
        insetInlineStart: hook.offset,
      }),
      rule([{ placement: 'bottom-end' }, { placement: 'bottom-start' }], {
        insetBlockEnd: hook.offset,
        insetBlockStart: 'auto',
      }),
      variants('placement', {
        'top-start': { translate: '-50% -50%' },
        'bottom-end': { translate: '50% 50%' },
        'bottom-start': { translate: '-50% 50%' },
        inline: { boxShadow: 'none', position: 'static', translate: 'none' },
      }),
      /* Tag's emphasis: the fill as a ring on the page's ground, or a tint. */
      variants('emphasis', {
        outlined: {
          backgroundColor: hook.backgroundColor(token('color-background')),
          boxShadow: list(
            ['inset', 0, 0, 0, token('border-thick'), own.badgeFill],
            [0, 0, 0, token('border-thick'), hook.ringColor],
          ),
          color: hook.color(token('color-foreground')),
        },
        subtle: {
          backgroundColor: hook.backgroundColor(mix(own.badgeFill, 22, token('color-background'))),
          color: hook.color(token('color-foreground')),
        },
      }),
      rule(
        { emphasis: 'outlined', placement: 'inline' },
        { boxShadow: ['inset', 0, 0, 0, token('border-thick'), own.badgeFill] },
      ),
      /* Attention, which a mark going away does not draw. */
      rule(
        { attention: 'pulse', 'data-blank': false },
        {
          animation: [
            'badge-pulse',
            hook.attentionDuration('1.5s'),
            token('easing-standard'),
            'infinite',
          ],
        },
      ),
      rule(
        { attention: 'bounce', 'data-blank': false },
        {
          animation: [
            'badge-bounce',
            hook.attentionDuration('1s'),
            token('easing-standard'),
            'infinite',
          ],
        },
      ),
      rule(
        [
          { attention: 'pulse', 'data-blank': false, reducedMotion: true },
          { attention: 'bounce', 'data-blank': false, reducedMotion: true },
        ],
        { animation: 'none' },
      ),
      /* Forced colors keep the fill and the ink, and bound the mark with a
         hairline in the system's text color. */
      rule(
        { forcedColors: true },
        { forcedColorAdjust: 'none', outline: [token('border-thin'), 'solid', 'CanvasText'] },
      ),
    ]),
    on({ part: 'indicator', inner: 'slot[name="icon"]::slotted(*)' }, [
      web([rule({ 'data-dot': true }, { margin: quotient(own.badgeInset, 2) })]),
    ]),
    on({ region: 'icon', slotted: '*' }, [
      native([rule({ unset: true }, { margin: quotient(own.badgeInset, 2) })]),
      rule({ '--icon-size': hook.iconSize, flex: 'none' }),
    ]),
    keyframes('badge-pulse', {
      '0%, 100%': { transform: 'scale(1)' },
      '50%': { transform: 'scale(1.18)' },
    }),
    keyframes('badge-bounce', {
      '0%, 20%, 53%, 100%': { transform: 'translateY(0)' },
      '40%, 43%': { transform: 'translateY(-30%)' },
      '70%': { transform: 'translateY(-15%)' },
      '90%': { transform: 'translateY(-4%)' },
    }),
  ],
)
