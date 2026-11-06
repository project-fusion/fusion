import { oneOf } from '../../../render.js'
import { product, token } from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * Orb's styled tier.
 *
 * **Sized from a token**, so an orb is the same size wherever it is placed:
 * Loader's three steps, since the two are swapped for each other.
 * `--orb-size: 1lh` matches the line it sits on, as beside a message.
 *
 * **The two ends of the depth ramp are named, and carried on the canvas's
 * color properties**: the nearest dots are `--orb-color`, the words' color
 * around it by default, and the farthest fade toward `--orb-ground`, the
 * page's background by default. A color-typed property is resolved by the
 * engine before it is read, where a custom property is read as written, so
 * the web's script and a phone's drawing both read the resolved color.
 * `text-decoration-color` carries the ground because it is inert there: a
 * canvas draws no text.
 *
 * **The tempo rides on `animation-iteration-count`** on the web, which does
 * nothing without an animation name, and a phone's drawing reads
 * `--orb-speed` itself.
 *
 * **A change to either color ends a transition the web's script hears**, on
 * the fast duration, which reduced motion shortens and never to nothing, so
 * a still orb paints a frame in a new theme's colors.
 */
export default styles(
  root,
  {
    prefix: 'orb',
    hooks: ({ own }) => ({
      color: 'currentColor',
      ground: token('color-background'),
      size: own.orbSize,
      speed: 1,
    }),
    own: { orbSize: null },
    props: { size: oneOf(['sm', 'md', 'lg']) },
    stylesheet: 'orb/root/orb-root.generated.css',
  },
  ({ hook, on, rule }) => [
    on('host', [
      rule({
        blockSize: hook.size,
        /* Inline, so an orb beside text sits on the line with it, and
           shrink-proof, so a flex row cannot squash it into an ellipse. */
        display: 'inline-block',
        flexShrink: 0,
        inlineSize: hook.size,
        own: { orbSize: product(token('size-loader-lg'), 1.5) },
        /* For a shape the page passes in, which is laid over the box. */
        position: 'relative',
        verticalAlign: 'middle',
      }),
      rule({ size: 'sm' }, { own: { orbSize: token('size-loader-md') } }),
      rule({ size: 'lg' }, { own: { orbSize: product(token('size-loader-lg'), 2) } }),
      /* On paper, an orb promises what will not come. */
      rule({ print: true }, { display: 'none' }),
    ]),
    /* A shape of the page's own fills the box the dots were drawn in. */
    on({ region: 'default', slotted: '*' }, [
      rule({ blockSize: '100%', inlineSize: '100%', inset: 0, position: 'absolute' }),
    ]),
    /* The canvas fills the host and is measured from it, so `--orb-size`, the
       `size` attribute and a consumer's own `inline-size` all work the same
       way. */
    on('canvas', [
      rule({
        web: { animationIterationCount: hook.speed },
        blockSize: '100%',
        color: hook.color,
        display: 'block',
        inlineSize: '100%',
        textDecorationColor: hook.ground,
        transitionDuration: token('duration-fast'),
        transitionProperty: 'color, text-decoration-color',
      }),
    ]),
    /* While a shape of the page's stands in for the dots, and on the web
       while the browser holds the context, because a lost canvas is not
       reliably transparent. Restated because the UA's `[hidden]` loses to the
       `display` above. */
    on('canvas', [rule({ part: { hidden: true } }, { display: 'none' })]),
  ],
)
