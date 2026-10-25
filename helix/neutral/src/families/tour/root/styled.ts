import { list, measured, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * Tour's styled tier, which writes
 * `helix/styled/src/tour/root/tour-root.generated.css`.
 *
 * **The root draws one thing: the light.** Everything else is a stop's.
 *
 * **The spotlight paints the scrim rather than being cut out of one**: a box
 * over the target, rounded, with a spread of 200vmax, so a target in one
 * corner of the window still dims the far corner, which a spread rounds by
 * the box's radius and the spread. It glides from one target to the next. A
 * phone draws the spread as a ring as wide as it, at the lit box the tour
 * measures in the window. The backdrop is the same tint over the whole
 * window, behind a dialog or a floating stop. Print leaves the tour out, and
 * is the web's.
 */
export default styles(
  root,
  {
    prefix: 'tour',
    hooks: ['scrim-color', 'spotlight-radius'],
    stylesheet: 'tour/root/tour-root.generated.css',
  },
  ({ hook, on, rule }) => {
    const scrim = hook.scrimColor(token('color-overlay'))
    const normal = token('duration-normal')
    const standard = token('easing-standard')
    return [
      on('host', [rule({ display: 'contents' }), rule({ print: true }, { display: 'none' })]),
      on('spotlight', [
        rule({
          borderRadius: hook.spotlightRadius(token('radii-md')),
          boxShadow: [0, 0, 0, '200vmax', scrim],
          pointerEvents: 'none',
          position: web('fixed'),
          transition: list(
            ['left', normal, standard],
            ['top', normal, standard],
            ['block-size', normal, standard],
            ['inline-size', normal, standard],
          ),
          zIndex: token('layer-overlay'),
        }),
        /* The lit box the tour measures, which the web writes on the part. */
        rule(
          { platform: 'native' },
          {
            blockSize: measured('tour-spotlight-height', 0),
            inlineSize: measured('tour-spotlight-width', 0),
            left: measured('tour-spotlight-x', 0),
            position: 'absolute',
            top: measured('tour-spotlight-y', 0),
          },
        ),
      ]),
      on('backdrop', [
        rule({
          backgroundColor: scrim,
          inset: 0,
          pointerEvents: 'none',
          position: web('fixed'),
          zIndex: token('layer-overlay'),
        }),
        rule({ platform: 'native' }, { position: 'absolute' }),
      ]),
    ]
  },
)
