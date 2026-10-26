import { fn, list, measured, native, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import { prop } from '../../../tree.js'
import root from './headless.js'

/**
 * Tooltip's styled tier, which writes
 * `helix/styled/src/tooltip/root/tooltip-root.generated.css`.
 *
 * **The bubble is the inverse surface**, a dark ground over a light page,
 * with the theme's small words in a row, so what is passed in sits on the
 * middle line. It is as wide as its words up to 16rem, and its point is a
 * square turned on its center and half under the bubble, in the bubble's
 * own fill. `glass` and `frosted` are the page's translucent grounds over
 * the theme's blur, with the page's ink and an edge.
 *
 * **It grows out of its own point** once it is placed, and leaves the same
 * way. It appears at once under reduced motion. Print leaves the tooltip
 * out, and is the web's.
 */
export default styles(
  root,
  {
    prefix: 'tooltip',
    hooks: {
      arrowSize: '0.5rem',
      backdrop: null,
      backgroundColor: null,
      borderColor: token('color-border'),
      color: null,
      fontSize: token('text-xs'),
      gap: token('space-2xs'),
      maxInlineSize: '16rem',
      padding: [token('space-2xs'), token('space-xs')],
      radius: token('radii-sm'),
    },
    props: [prop('material', ['frosted', 'glass'])],
    stylesheet: 'tooltip/root/tooltip-root.generated.css',
  },
  ({ hook, on, rule, variants }) => {
    const fast = token('duration-fast')
    const ground = hook.backgroundColor(token('color-surface-inverse'))
    return [
      /* No box of its own: the trigger is passed in and the bubble is in the top layer. */
      on('host', [rule({ display: 'contents' }), rule({ print: true }, { display: 'none' })]),
      /* The trigger's box on a phone, as wide as the trigger, which the bubble is placed against. */
      on('trigger', [native([rule({ inlineSize: 'fit-content' })])]),
      on('surface', [
        rule({
          overflow: 'visible',
          alignItems: 'center',
          display: 'flex',
          gap: hook.gap,
          backgroundColor: ground,
          border: 'none',
          borderRadius: hook.radius,
          color: hook.color(token('color-foreground-inverse')),
          fontFamily: token('font-sans'),
          fontSize: hook.fontSize,
          fontWeight: token('weight-regular'),
          inlineSize: web('max-content'),
          lineHeight: token('leading-tight'),
          margin: token('space-none'),
          maxInlineSize: hook.maxInlineSize,
          opacity: 0,
          padding: hook.padding,
          position: web('fixed'),
          scale: 0,
          transition: list(
            ['opacity', fast, token('easing-standard')],
            ['scale', fast, token('easing-emphasized')],
            ['display', fast, 'allow-discrete'],
            ['overlay', fast, 'allow-discrete'],
          ),
        }),
        rule({ part: { 'data-placed': true } }, { opacity: 1, scale: 1 }),
      ]),
      /* The point, half buried under the bubble on the edge facing the trigger. */
      on('arrow', [
        rule({
          backgroundColor: ground,
          blockSize: hook.arrowSize,
          inlineSize: hook.arrowSize,
          position: 'absolute',
          rotate: '45deg',
        }),
      ]),
      /* Glass takes the ink with it, the page's ground being light in light mode. */
      on(
        ['surface', 'arrow'],
        [
          variants('material', {
            glass: {
              backdropFilter: hook.backdrop(token('material-backdrop')),
              backgroundColor: hook.backgroundColor(token('material-translucent')),
            },
            frosted: {
              backdropFilter: hook.backdrop(fn('blur', token('material-blur-lg'))),
              backgroundColor: hook.backgroundColor(token('material-translucent-strong')),
            },
          }),
        ],
      ),
      on('surface', [
        rule([{ material: 'frosted' }, { material: 'glass' }], {
          border: [token('border-thin'), 'solid', hook.borderColor],
          color: hook.color(token('color-foreground')),
        }),
        /* It grows out of its own point, wherever the point landed. */
        rule(
          { state: 'placed-top' },
          { transformOrigin: [measured('floating-arrow-x', '50%'), '100%'] },
        ),
        rule(
          { state: 'placed-bottom' },
          { transformOrigin: [measured('floating-arrow-x', '50%'), 0] },
        ),
        rule(
          { state: 'placed-left' },
          { transformOrigin: ['100%', measured('floating-arrow-y', '50%')] },
        ),
        rule(
          { state: 'placed-right' },
          { transformOrigin: [0, measured('floating-arrow-y', '50%')] },
        ),
      ]),
      /* A closed tooltip is not drawn, as the UA's sheet has it, which the
         rules above outrank. */
      on({ part: 'surface', selector: '[part~="surface"]:not(:popover-open)' }, [
        web([rule({ display: 'none' })]),
      ]),
      /* With motion reduced it simply appears. */
      on('surface', [
        rule({ reducedMotion: true }, { scale: 1, transition: 'none' }),
        rule({ part: { 'data-placed': true }, reducedMotion: true }, { scale: 1 }),
        web([rule({ supports: 'not (overlay: auto)' }, { transitionBehavior: 'normal' })]),
      ]),
    ]
  },
)
