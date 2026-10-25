import { difference, fn, list, measured, product, scheme, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import { prop } from '../../../tree.js'
import root from './headless.js'

/**
 * Popover's styled tier, which writes
 * `helix/styled/src/popover/root/popover-root.generated.css`.
 *
 * **The panel is the floating surface**, with its edge, its shadow and the
 * house radius, as wide as what it holds and never wider than the window
 * less a margin. What it holds scrolls inside its `content`, with the inset
 * there, so a focus ring at the content's edge stays inside the box that
 * scrolls. `separation="plain"` takes the inset away. `glass` and `frosted`
 * are the translucent grounds over the theme's blur, and the point takes
 * the same fill.
 *
 * **It grows out of the side it opened on**, from a little smaller and a
 * little toward its trigger, once it is placed, and out of the arrow where
 * it has one. It arrives at once under reduced motion. The point draws the
 * panel's edge on its two outer sides. Print leaves the popover out, and is
 * the web's.
 */
export default styles(
  root,
  {
    prefix: 'popover',
    hooks: [
      'arrow-size',
      'backdrop',
      'background-color',
      'border-color',
      'border-width',
      'inline-size',
      'max-block-size',
      'padding',
      'shadow',
    ],
    own: ['popover-edge', 'popover-from', 'popover-travel'],
    props: [prop('material', ['frosted', 'glass']), prop('separation', ['plain'])],
    stylesheet: 'popover/root/popover-root.generated.css',
  },
  ({ hook, on, own, rule, variants }) => {
    const fast = token('duration-fast')
    const width = hook.borderWidth(token('border-floating'))
    const ink = hook.borderColor(token('color-border'))
    const fill = hook.backgroundColor(token('color-surface-overlay'))
    return [
      /* No box of its own: the trigger is passed in and the panel is in the top layer. */
      on('host', [rule({ display: 'contents' }), rule({ print: true }, { display: 'none' })]),
      /* The trigger's box on a phone, as wide as the trigger, which the panel is placed against. */
      on('trigger', [rule({ platform: 'native' }, { inlineSize: 'fit-content' })]),
      on('surface', [
        rule({
          overflow: 'visible',
          backgroundColor: fill,
          border: [width, 'solid', ink],
          own: { edge: [width, 'solid', ink] },
          borderRadius: token('radii-sm'),
          boxShadow: hook.shadow(token('shadow-floating')),
          boxSizing: 'border-box',
          color: token('color-foreground'),
          inset: web('auto'),
          margin: token('space-none'),
          maxInlineSize: difference('100vw', token('space-lg')),
          padding: token('space-none'),
          inlineSize: hook.inlineSize(web('max-content')),
        }),
      ]),
      /* A closed popover is not drawn, as the UA's sheet has it, which the
         rules above outrank. */
      on({ part: 'surface', selector: '[part="surface"]:not(:popover-open)' }, [
        rule({ platform: 'web' }, { display: 'none' }),
      ]),
      /* It travels a little out of the edge it opened against. */
      on('surface', [
        rule({
          own: { travel: product(token('space-2xs'), '-1'), from: 0.96 },
          opacity: 0,
          transform: fn('translateY', own.travel),
          scale: own.from,
          transition: list(
            ['opacity', fast, token('easing-standard')],
            ['scale', fast, token('easing-emphasized')],
            ['transform', fast, token('easing-emphasized')],
            ['display', fast, 'allow-discrete'],
            ['overlay', fast, 'allow-discrete'],
          ),
        }),
        /* Opening upward, it comes up from the trigger. */
        rule({ state: 'placed-top' }, { own: { travel: token('space-2xs') } }),
        rule({ part: { 'data-placed': true } }, { opacity: 1, scale: 1, transform: 'none' }),
        /* Out of the near edge, and out of the arrow where there is one. */
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
        rule([{ reducedMotion: true }, { part: { 'data-placed': true }, reducedMotion: true }], {
          scale: 1,
          transform: 'none',
          transition: 'none',
        }),
      ]),
      /* The scrolling happens in here, with the inset inside it. */
      on('content', [
        rule({
          maxBlockSize: hook.maxBlockSize(measured('floating-available-block-size', 'none')),
          overflow: 'auto',
          padding: hook.padding(token('space-md')),
        }),
        rule({ separation: 'plain' }, { padding: hook.padding(token('space-none')) }),
      ]),
      /* No ring on the panel itself, which takes focus only where it holds nothing that can. */
      on('surface', [rule({ outline: 'none' })]),
      /* The point, half outside the panel on the edge facing the trigger,
         drawing the panel's edge on the two sides turned outward. */
      on('arrow', [
        rule({
          backgroundColor: fill,
          blockSize: hook.arrowSize('0.5rem'),
          inlineSize: hook.arrowSize('0.5rem'),
          position: 'absolute',
          rotate: '45deg',
        }),
        /* Physical sides, as a placement is, in either direction. */
        rule({ dir: 'ltr', state: 'placed-bottom' }, { borderInlineStart: own.edge }),
        rule({ dir: 'rtl', state: 'placed-bottom' }, { borderInlineEnd: own.edge }),
        rule({ state: 'placed-bottom' }, { borderBlockStart: own.edge }),
        rule({ dir: 'ltr', state: 'placed-top' }, { borderInlineEnd: own.edge }),
        rule({ dir: 'rtl', state: 'placed-top' }, { borderInlineStart: own.edge }),
        rule({ state: 'placed-top' }, { borderBlockEnd: own.edge }),
        rule({ dir: 'ltr', state: 'placed-right' }, { borderInlineStart: own.edge }),
        rule({ dir: 'rtl', state: 'placed-right' }, { borderInlineEnd: own.edge }),
        rule({ state: 'placed-right' }, { borderBlockEnd: own.edge }),
        rule({ dir: 'ltr', state: 'placed-left' }, { borderInlineEnd: own.edge }),
        rule({ dir: 'rtl', state: 'placed-left' }, { borderInlineStart: own.edge }),
        rule({ state: 'placed-left' }, { borderBlockStart: own.edge }),
      ]),
      on(
        ['surface', 'arrow'],
        [
          variants('material', {
            glass: {
              backdropFilter: hook.backdrop(token('material-backdrop')),
              backgroundColor: hook.backgroundColor(
                scheme(token('material-translucent-strong'), token('material-translucent')),
              ),
            },
            frosted: {
              backdropFilter: hook.backdrop(fn('blur', token('material-blur-lg'))),
              backgroundColor: hook.backgroundColor(token('material-translucent-strong')),
            },
          }),
        ],
      ),
      on('surface', [
        rule(
          { platform: 'web', supports: 'not (overlay: auto)' },
          { transitionBehavior: 'normal' },
        ),
      ]),
    ]
  },
)
