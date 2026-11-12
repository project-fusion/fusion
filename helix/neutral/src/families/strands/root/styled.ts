import { difference, fn, list, mix, quotient, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * Strands' styled tier.
 *
 * **It fills the box it is given**, as an image does, and is never
 * hit-testable itself, so a background never takes a press meant for what is
 * over it. What the content region holds is.
 *
 * **The colors are hooks**: the glow and the tint on the brand, the ground on
 * the page, and the peak, which only the ribbon draws, on the brand's hover
 * color over a dark page and its pressed color over a light one.
 *
 * **They are carried on color properties a canvas never paints**, because a
 * color property is resolved by the engine before a script or a phone's
 * drawing reads it: the glow on `color`, the tint on `text-decoration-color`,
 * the ground on `outline-color`, and the peak twice, the dark page's on
 * `caret-color` and the light page's on `column-rule-color`. A change to any
 * of the five ends a transition the web's script hears, on the fast
 * duration, so a still ribbon repaints.
 *
 * **The edges fade**, the top and bottom by `--strands-fade` and the sides a
 * third as far, so a band of light has no ruled line where the box ends. On
 * the web a mask fades the canvas and the gradient under it; a phone's
 * drawing fades itself by the same hook.
 *
 * **The gradient under the canvas is the web's**, a soft band of the same
 * colors shown while the canvas cannot draw, and without its ground under
 * `clear`. A phone draws the same band itself where it cannot draw the
 * ribbon.
 *
 * **In `travel` the web fixes it behind the page**, on the layer beneath,
 * with no edge to fade, since the viewport is its box.
 */
export default styles(
  root,
  {
    prefix: 'strands',
    hooks: {
      fade: '15%',
      glow: token('color-primary'),
      ground: token('color-background'),
      peak: null,
      tint: token('color-primary'),
    },
    own: { strandsFade: null, strandsMask: null },
    stylesheet: 'strands/root/strands-root.generated.css',
  },
  ({ hook, on, own, rule }) => {
    const fade = own.strandsFade
    const side = quotient(fade, 3)
    return [
      on('host', [
        rule({
          blockSize: '100%',
          display: 'block',
          inlineSize: '100%',
          own: { strandsFade: hook.fade },
          position: 'relative',
          web: { pointerEvents: 'none' },
        }),
        web([
          rule({
            own: {
              strandsMask: list(
                fn(
                  'linear-gradient',
                  'to bottom',
                  'transparent',
                  ['black', fade],
                  ['black', difference('100%', fade)],
                  'transparent',
                ),
                fn(
                  'linear-gradient',
                  'to right',
                  'transparent',
                  ['black', side],
                  ['black', difference('100%', side)],
                  'transparent',
                ),
              ),
            },
          }),
          rule(
            { travel: true },
            {
              blockSize: 'auto',
              inlineSize: 'auto',
              inset: 0,
              own: { strandsFade: '0%' },
              position: 'fixed',
              zIndex: token('layer-beneath'),
            },
          ),
        ]),
        rule({ print: true }, { display: 'none' }),
      ]),
      /* The fallback, under the canvas: a band of the colors at about what the
         ribbon averages to once it is spread over the box. Hidden while the
         ribbon draws, and without its ground under `clear`. */
      on({ before: 'host' }, [
        web([
          rule({
            backgroundImage: fn(
              'linear-gradient',
              '115deg',
              [hook.ground, '20%'],
              [mix(hook.glow, 22, hook.ground), '48%'],
              [mix(hook.tint, 12, hook.ground), '58%'],
              [hook.ground, '82%'],
            ),
            content: '""',
            inset: 0,
            maskComposite: 'intersect',
            maskImage: own.strandsMask,
            position: 'absolute',
          }),
          rule({ drawing: true }, { visibility: 'hidden' }),
          rule({ clear: true }, { backgroundImage: 'none' }),
          rule(
            { clear: true, fallback: true },
            {
              backgroundImage: fn(
                'linear-gradient',
                '115deg',
                ['transparent', '20%'],
                [mix(hook.glow, 22, 'transparent'), '48%'],
                [mix(hook.tint, 12, 'transparent'), '58%'],
                ['transparent', '82%'],
              ),
            },
          ),
        ]),
      ]),
      on('canvas', [
        rule({
          blockSize: '100%',
          caretColor: hook.peak(token('color-primary-hover')),
          color: hook.glow,
          columnRuleColor: hook.peak(token('color-primary-active')),
          display: 'block',
          inlineSize: '100%',
          outlineColor: hook.ground,
          position: 'relative',
          textDecorationColor: hook.tint,
          transitionDuration: token('duration-fast'),
          transitionProperty:
            'caret-color, color, column-rule-color, outline-color, text-decoration-color',
        }),
        web([rule({ maskComposite: 'intersect', maskImage: own.strandsMask })]),
        /* While the browser holds the context, because a lost canvas is not
           reliably transparent. */
        rule({ part: { hidden: true } }, { display: 'none' }),
      ]),
      /* Over the ribbon and covering it, so it changes nothing about the box.
         Not hit-testable itself, and what it holds is. */
      on('content', [rule({ inset: 0, position: 'absolute', web: { pointerEvents: 'none' } })]),
      on({ region: 'default', slotted: '*' }, [web([rule({ pointerEvents: 'auto' })])]),
    ]
  },
)
