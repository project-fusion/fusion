import { list, measured, mix, product, token, web } from '../style.js'
import { fragment } from '../table.js'

/** The ring's travel and fade, which a ring held under a finger does not take. */
const moving = '[part~="touch"]:not([part~="touch-held"])'

/** Where a ring stands, from the custom properties the element writes on it. */
const at = {
  left: measured('device-screen-touch-x'),
  top: measured('device-screen-touch-y'),
}

/** Where a swipe's ring ends, which is where it starts for a tap. */
const end = {
  left: measured('device-screen-touch-to-x', measured('device-screen-touch-x')),
  top: measured('device-screen-touch-to-y', measured('device-screen-touch-y')),
}

/**
 * The rings Device Screen draws on its screen where a finger or an agent
 * touched it, each placed by the custom properties the element writes on it.
 */
export default fragment(
  'device-screen-touches',
  { parts: ['touch'] },
  ({ keyframes, on, rule }) => [
    /* **A ring the size of a fingertip on the device**, a little over a
       tenth of a phone's narrow side, light with a dark edge so it reads over
       any picture. */
    on('touch', [
      rule({
        aspectRatio: 1,
        backgroundColor: mix(token('color-foreground-media'), 30, 'transparent'),
        border: [
          token('border-thick'),
          'solid',
          mix(token('color-foreground-media'), 85, 'transparent'),
        ],
        borderRadius: token('radii-full'),
        boxShadow: [
          0,
          0,
          0,
          token('border-thin'),
          mix(token('color-surface-media'), 40, 'transparent'),
        ],
        boxSizing: 'border-box',
        inlineSize: '11cqmin',
        ...at,
        pointerEvents: 'none',
        position: 'absolute',
        translate: '-50% -50%',
      }),
    ]),
    /* Written out: `touch-held` is a second name the ring carries, which no
       prop or state of the element says. A ring that was shown travels the
       swipe it stands for, then fades; a tap's ring only presses in and
       fades. Where motion is reduced, a swipe's ring stands where it ended. */
    on({ part: 'touch', selector: moving }, [
      web([
        rule({
          animation: list(
            [
              'device-screen-travel',
              measured('device-screen-touch-duration', '0s'),
              token('easing-standard'),
              'forwards',
            ],
            [
              'device-screen-fade',
              product(token('duration-slow'), 2),
              token('easing-standard'),
              measured('device-screen-touch-duration', '0s'),
              'forwards',
            ],
          ),
        }),
        rule({ reducedMotion: true }, { animation: 'none', ...end }),
      ]),
    ]),
    keyframes('device-screen-travel', { from: at, to: end }),
    /* Pressed in, held long enough to be seen, then let go. */
    keyframes('device-screen-fade', {
      '0%': { opacity: 0.4, scale: 0.6 },
      '15%, 55%': { opacity: 1, scale: 1 },
      '100%': { opacity: 0, scale: 1.3 },
    }),
  ],
)
