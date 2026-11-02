import printEconomy from '../../../fragments/print-economy.js'
import { number, oneOf } from '../../../render.js'
import { native, product, token } from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * Icon's styled tier.
 *
 * **The box is the host, and the glyph fills it.** `--icon-size` sizes the
 * host, falling back to the icon step, so a container resizes the icons in it
 * without a property. Inside a button on the web, the button sets it in `em`,
 * so the icon scales with the label. A phone stops the size growing at the
 * largest standard text size, as it stops every length that is space.
 *
 * **The glyph turns, flips and moves inside its own box**, so the line around
 * it keeps its place. `rotate` and `flip` are on the glyph, and `animation` is
 * on the host, which turns, fades or swells as a whole, so the glyph's own
 * turn and flip hold inside it.
 */
export default styles(
  root,
  {
    prefix: 'icon',
    hooks: {
      animationDuration: null,
      rotate: 'none',
      size: token('size-icon'),
    },
    props: {
      animation: oneOf(['beat', 'pulse', 'spin']),
      autoWidth: false,
      flip: oneOf(['both', 'x', 'y']),
      /* 90, 180 or 270 on the web, which reads the attribute as a number. A
         phone matches the number it is given against the same words. */
      rotate: number(),
    },
    stylesheet: 'icon/root/icon-root.generated.css',
  },
  ({ hook, include, keyframes, on, rule, variants }) => [
    /* `inline-flex` rather than `inline-block`, so the glyph has no descender
       gap under it and sits on the text baseline of whatever it accompanies. */
    on('host', [
      rule({
        blockSize: hook.size,
        display: 'inline-flex',
        flex: '0 0 auto',
        inlineSize: hook.size,
      }),
      /* Under `auto-width`, the box takes the glyph's proportions: its height
         from the size, its width from the drawing's own box. Written beside each
         target's own sizing, so the web keeps a rule for each. */
      rule({ autoWidth: true }, { inlineSize: 'auto' }),
      /* On the host, which turns, fades or swells as a whole. */
      variants('animation', {
        spin: {
          animation: [
            'helix-icon-spin',
            hook.animationDuration(product(token('duration-slow'), 3)),
            'linear',
            'infinite',
          ],
        },
        pulse: {
          animation: [
            'helix-icon-pulse',
            hook.animationDuration(product(token('duration-slow'), 6)),
            'ease-in-out',
            'infinite',
          ],
        },
        beat: {
          animation: [
            'helix-icon-beat',
            hook.animationDuration(product(token('duration-slow'), 3)),
            'ease-in-out',
            'infinite',
          ],
        },
      }),
      rule(
        [
          { animation: 'spin', reducedMotion: true },
          { animation: 'pulse', reducedMotion: true },
          { animation: 'beat', reducedMotion: true },
        ],
        { animation: 'none' },
      ),
    ]),
    on('svg', [
      rule({ blockSize: '100%', inlineSize: '100%', rotate: hook.rotate }),
      rule({ autoWidth: true }, { inlineSize: 'auto' }),
      /* Turned and flipped on the glyph, inside the box. A flip is a
         `transform`, which composes with the `scale` that `mirror` sets on a
         right-to-left page. */
      variants('rotate', {
        '90': { rotate: '90deg' },
        '180': { rotate: '180deg' },
        '270': { rotate: '270deg' },
      }),
      variants('flip', {
        x: { transform: 'scale(-1, 1)' },
        y: { transform: 'scale(1, -1)' },
        both: { transform: 'scale(-1, -1)' },
      }),
      /* A glyph that means forward or back points the way a right-to-left page
         reads. Core's mirror rule turns the web's `<svg>` already, by its
         `data-mirror`, so this rule is the same turn for a phone alone. */
      native([rule({ dir: 'rtl', mirror: true }, { scale: '-1 1' })]),
    ]),
    keyframes('helix-icon-spin', { to: { rotate: '1turn' } }),
    keyframes('helix-icon-pulse', { '50%': { opacity: 0.4 } }),
    keyframes('helix-icon-beat', { '0%, 60%, 100%': { scale: 1 }, '30%': { scale: 1.2 } }),
    /* A glyph prints as ink. */
    include(printEconomy),
  ],
)
