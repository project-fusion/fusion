import { first, list, mix, native, quotient, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import { prop } from '../../../tree.js'
import root from './headless.js'

/**
 * Badge's styled tier, which writes `helix/styled/src/badge/root/badge-root.generated.css`.
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
      iconSize: own.text,
      offset: quotient(own.size, 4),
      radius: token('radii-full'),
      ringColor: token('color-background'),
    }),
    own: ['badge-dot', 'badge-fill', 'badge-inset', 'badge-on', 'badge-size', 'badge-text'],
    props: [
      prop('attention', ['bounce', 'pulse']),
      prop('emphasis', ['outlined', 'solid', 'subtle']),
      prop('placement', ['bottom-end', 'bottom-start', 'inline', 'top-start']),
      prop('tone', ['accent', 'danger', 'info', 'neutral', 'primary', 'success', 'warning']),
    ],
    stylesheet: 'badge/root/badge-root.generated.css',
  },
  ({ hook, keyframes, on, own, rule, variants }) => [
    on('host', [
      rule({
        display: 'inline-flex',
        position: 'relative',
        web: { verticalAlign: 'middle' },
        own: {
          size: token('size-badge'),
          text: token('text-xs'),
          inset: token('space-2xs'),
          dot: token('space-xs'),
          on: token('color-foreground-on-primary'),
          fill: token('color-primary-surface'),
        },
      }),
      /* The fills, which are Tag's, each with the ink its family's fill takes. */
      variants('tone', {
        primary: { own: { fill: token('color-primary-surface') } },
        accent: { own: { fill: token('color-accent-surface') } },
      }),
      rule({ tone: 'accent' }, { own: { on: token('color-foreground-on-accent') } }),
      rule([{ tone: 'danger' }, { tone: 'info' }, { tone: 'success' }, { tone: 'warning' }], {
        own: { on: token('color-foreground-on-status') },
      }),
      variants('tone', {
        info: { own: { fill: token('color-info-surface') } },
        success: { own: { fill: token('color-success-surface') } },
        warning: { own: { fill: token('color-warning-surface') } },
        danger: { own: { fill: token('color-danger-surface') } },
        neutral: { own: { fill: token('color-surface-raised'), on: token('color-foreground') } },
      }),
      /* In the line, after what it counts, with no ring. */
      rule({ placement: 'inline' }, { alignItems: 'center', gap: hook.gap }),
      rule({ print: true }, { boxShadow: 'none' }),
    ]),
    on('indicator', [
      rule({
        alignItems: 'center',
        backgroundColor: first(hook.backgroundColor, own.fill),
        blockSize: own.size,
        borderRadius: hook.radius,
        boxShadow: [0, 0, 0, token('border-thick'), hook.ringColor],
        color: first(hook.color, own.on),
        display: 'inline-flex',
        fontSize: own.text,
        fontWeight: hook.fontWeight,
        insetBlockStart: hook.offset,
        insetInlineEnd: hook.offset,
        justifyContent: 'center',
        lineHeight: 1,
        minInlineSize: own.size,
        paddingInline: own.inset,
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
          minBlockSize: own.dot,
          minInlineSize: own.dot,
          paddingInline: token('space-none'),
        },
      ),
      rule({ gap: quotient(own.inset, 2) }),
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
            ['inset', 0, 0, 0, token('border-thick'), own.fill],
            [0, 0, 0, token('border-thick'), hook.ringColor],
          ),
          color: hook.color(token('color-foreground')),
        },
        subtle: {
          backgroundColor: hook.backgroundColor(mix(own.fill, 22, token('color-background'))),
          color: hook.color(token('color-foreground')),
        },
      }),
      rule(
        { emphasis: 'outlined', placement: 'inline' },
        { boxShadow: ['inset', 0, 0, 0, token('border-thick'), own.fill] },
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
      web([rule({ 'data-dot': true }, { margin: quotient(own.inset, 2) })]),
    ]),
    on({ region: 'icon', slotted: '*' }, [
      native([rule({ state: 'unset' }, { margin: quotient(own.inset, 2) })]),
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
