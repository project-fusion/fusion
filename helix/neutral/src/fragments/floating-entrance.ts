import { fn, list, measured, product, token, web } from '../style.js'
import { fragment } from '../table.js'

/**
 * The entrance a floating panel makes on the web, what the shared entrance sheet
 * holds: it travels a little out of the edge it opened against, gated on
 * `data-placed`, so it never moves before the controller has said where it goes. A
 * phone's panel moves by the layer's own motion.
 *
 * **On `transform`, never on `translate`**, which the floating controller writes
 * the panel's position onto. A family that takes this in sets the `placed-` states.
 */
export default fragment(
  'floating-entrance',
  { parts: ['surface'], own: { floatingTravel: null } },
  ({ on, own, rule }) => {
    const fast = token('duration-fast')
    const emphasized = token('easing-emphasized')
    return [
      on({ part: 'surface', selector: '[part="surface"]' }, [
        web([
          rule({
            own: { floatingTravel: product(token('space-2xs'), '-1') },
            opacity: 0,
            scale: 0.96,
            transform: fn('translateY', own.floatingTravel),
            transition: list(
              ['opacity', fast, token('easing-standard')],
              ['scale', fast, emphasized],
              ['transform', fast, emphasized],
              ['display', fast, 'allow-discrete'],
              ['overlay', fast, 'allow-discrete'],
            ),
          }),
          rule({ reducedMotion: true }, { scale: 1, transform: 'none', transition: 'none' }),
          rule({ supports: 'not (overlay: auto)' }, { transitionBehavior: 'normal' }),
        ]),
      ]),
      /* Written out: a fragment declares no states. */
      on({ part: 'surface', selector: ':host(:state(placed-top)) [part="surface"]' }, [
        web([
          rule({
            own: { floatingTravel: token('space-2xs') },
            transformOrigin: [measured('floating-arrow-x', '50%'), '100%'],
          }),
        ]),
      ]),
      on({ part: 'surface', selector: ':host(:state(placed-bottom)) [part="surface"]' }, [
        web([rule({ transformOrigin: [measured('floating-arrow-x', '50%'), 0] })]),
      ]),
      on({ part: 'surface', selector: ':host(:state(sheet)) [part="surface"]' }, [
        web([rule({ own: { floatingTravel: '100%' }, scale: 1 })]),
      ]),
      on({ part: 'surface', selector: '[part="surface"][data-placed]' }, [
        web([rule({ opacity: 1, scale: 1, transform: 'none' })]),
      ]),
    ]
  },
)
