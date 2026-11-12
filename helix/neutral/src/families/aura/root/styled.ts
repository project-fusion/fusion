import { difference, fn, mix, product, quotient, scheme, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * Aura's styled tier.
 *
 * **It fills the box it is given**, as an image does, and is not hit-testable
 * at rest, so a background never takes a press meant for what is over it.
 * `interactive` makes it hit-testable, since the pointer's wake listens for
 * the pointer.
 *
 * **The four stops of the ramp are hooks.** On a light page the glow is the
 * brand's subtle wash, the haze half of that into the page, and the peak a
 * third of the brand in the wash, so the field is a sheen and never a smear.
 * Dark keeps the brand at full strength, which reads as light on black
 * (owner, November 4, 2026).
 *
 * **The ramp is carried on color properties a canvas never paints**, because
 * a color property is resolved by the engine before a script or a phone's
 * drawing reads it: the glow on `color`, the haze on
 * `text-decoration-color`, the ground on `outline-color`, and the peak twice,
 * the dark page's on `caret-color` and the light page's on
 * `column-rule-color`. A change to any of the five ends a transition the web's
 * script hears, on the fast duration, so a still field repaints.
 *
 * **On the web the top and bottom edges fade**, by `--aura-fade`, eased on
 * smoothstep's stops, and a gradient of the same stops lies under the canvas
 * until the shader draws. A phone draws the same gradient itself where it
 * cannot draw the shader.
 *
 * **The pause control stands in the trailing corner** on the floating ground,
 * hidden for a reader who asked for reduced motion, since nothing moves.
 */
export default styles(
  root,
  {
    prefix: 'aura',
    hooks: {
      fade: '15%',
      glow: scheme(token('color-primary-subtle'), token('color-primary')),
      ground: token('color-background'),
      haze: scheme(
        mix(token('color-primary-subtle'), 50, token('color-background')),
        token('color-primary-subtle'),
      ),
      pauseBackgroundColor: token('color-surface-overlay'),
      peak: null,
    },
    own: { auraMask: null },
    stylesheet: 'aura/root/aura-root.generated.css',
  },
  ({ hook, on, own, rule }) => {
    const fade = hook.fade
    return [
      on('host', [
        rule({
          blockSize: '100%',
          display: 'block',
          inlineSize: '100%',
          position: 'relative',
          web: { pointerEvents: 'none' },
        }),
        web([
          rule({
            own: {
              auraMask: fn(
                'linear-gradient',
                'to bottom',
                'transparent',
                ['rgb(0 0 0 / 0.04)', product(fade, 0.125)],
                ['rgb(0 0 0 / 0.16)', product(fade, 0.25)],
                ['rgb(0 0 0 / 0.5)', product(fade, 0.5)],
                ['rgb(0 0 0 / 0.84)', product(fade, 0.75)],
                ['rgb(0 0 0 / 0.96)', product(fade, 0.875)],
                ['black', fade],
                ['black', difference('100%', fade)],
                ['rgb(0 0 0 / 0.96)', difference('100%', product(fade, 0.875))],
                ['rgb(0 0 0 / 0.84)', difference('100%', product(fade, 0.75))],
                ['rgb(0 0 0 / 0.5)', difference('100%', product(fade, 0.5))],
                ['rgb(0 0 0 / 0.16)', difference('100%', product(fade, 0.25))],
                ['rgb(0 0 0 / 0.04)', difference('100%', product(fade, 0.125))],
                'transparent',
              ),
            },
          }),
          rule({ interactive: true }, { pointerEvents: 'auto' }),
        ]),
        rule({ print: true }, { display: 'none' }),
      ]),
      /* The fallback, under the canvas: the stops ramped from the top right,
         the hot stop mixed into the ground, since the shader's is not a wash.
         Hidden while the shader draws. */
      on({ before: 'host' }, [
        web([
          rule({
            backgroundImage: fn(
              'radial-gradient',
              '120% 90% at 62% 12%',
              [mix(hook.glow, 38, hook.ground), '0%'],
              [hook.haze, '38%'],
              [hook.ground, '78%'],
            ),
            content: '""',
            inset: 0,
            maskImage: own.auraMask,
            position: 'absolute',
          }),
          rule({ drawing: true }, { visibility: 'hidden' }),
        ]),
      ]),
      on('canvas', [
        rule({
          blockSize: '100%',
          caretColor: hook.peak(token('color-foreground')),
          color: hook.glow,
          columnRuleColor: hook.peak(
            mix(token('color-primary'), 34, token('color-primary-subtle')),
          ),
          display: 'block',
          inlineSize: '100%',
          outlineColor: hook.ground,
          position: 'relative',
          textDecorationColor: hook.haze,
          transitionDuration: token('duration-fast'),
          transitionProperty:
            'caret-color, color, column-rule-color, outline-color, text-decoration-color',
        }),
        web([rule({ maskImage: own.auraMask })]),
        /* While the browser holds the context, because a lost canvas is not
           reliably transparent. */
        rule({ part: { hidden: true } }, { display: 'none' }),
      ]),
      /* Over the field and covering it, so it changes nothing about the aura's
         box. Not hit-testable itself, and what it holds is. */
      on('content', [rule({ inset: 0, position: 'absolute', web: { pointerEvents: 'none' } })]),
      on({ region: 'default', slotted: '*' }, [web([rule({ pointerEvents: 'auto' })])]),
      on('pause', [
        web([rule({ cursor: 'pointer' })]),
        rule({
          alignItems: 'center',
          backgroundColor: hook.pauseBackgroundColor,
          blockSize: token('size-control-sm'),
          border: [token('border-floating'), 'solid', token('color-border-floating')],
          borderRadius: token('radii-sm'),
          boxShadow: token('shadow-floating'),
          color: token('color-foreground'),
          display: 'inline-flex',
          inlineSize: token('size-control-sm'),
          insetBlockEnd: token('space-sm'),
          insetInlineEnd: token('space-sm'),
          justifyContent: 'center',
          padding: 0,
          position: 'absolute',
          web: { pointerEvents: 'auto' },
        }),
        rule(
          { hover: true },
          {
            backgroundColor: mix(token('color-foreground'), 10, hook.pauseBackgroundColor),
          },
        ),
        rule(
          { focusVisible: true },
          {
            outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
            outlineOffset: token('size-focus-offset'),
          },
        ),
        rule({ reducedMotion: true }, { display: 'none' }),
      ]),
      /* The press reaches the target size, in a transparent box, so nothing drawn moves. */
      on({ after: 'pause' }, [
        web([
          rule({
            content: '""',
            inset: quotient(difference(token('size-target'), '100%'), '-2'),
            position: 'absolute',
          }),
        ]),
      ]),
      on('pause-mark', [
        rule({ blockSize: token('size-icon-sm'), inlineSize: token('size-icon-sm') }),
      ]),
    ]
  },
)
