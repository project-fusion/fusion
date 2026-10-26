import { oneOf } from '../../../render.js'
import {
  difference,
  fn,
  list,
  measured,
  native,
  product,
  scheme,
  token,
  web,
} from '../../../style.js'
import { styles } from '../../../table.js'
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
    hooks: {
      arrowSize: '0.5rem',
      backdrop: null,
      backgroundColor: null,
      borderColor: token('color-border'),
      borderWidth: token('border-floating'),
      inlineSize: web('max-content'),
      maxBlockSize: measured('floating-available-block-size', 'none'),
      padding: null,
      shadow: token('shadow-floating'),
    },
    own: { popoverEdge: null, popoverFrom: null, popoverTravel: null },
    props: { material: oneOf(['frosted', 'glass']), separation: oneOf(['plain']) },
    stylesheet: 'popover/root/popover-root.generated.css',
  },
  ({ hook, on, own, rule, variants }) => {
    const fast = token('duration-fast')
    const width = hook.borderWidth
    const ink = hook.borderColor
    const fill = hook.backgroundColor(token('color-surface-overlay'))
    return [
      /* No box of its own: the trigger is passed in and the panel is in the top layer. */
      on('host', [rule({ display: 'contents' }), rule({ print: true }, { display: 'none' })]),
      /* The trigger's box on a phone, as wide as the trigger, which the panel is placed against. */
      on('trigger', [native([rule({ inlineSize: 'fit-content' })])]),
      on('surface', [
        rule({
          overflow: 'visible',
          backgroundColor: fill,
          border: [width, 'solid', ink],
          own: { popoverEdge: [width, 'solid', ink] },
          borderRadius: token('radii-sm'),
          boxShadow: hook.shadow,
          boxSizing: 'border-box',
          color: token('color-foreground'),
          web: { inset: 'auto' },
          margin: token('space-none'),
          maxInlineSize: difference('100vw', token('space-lg')),
          padding: token('space-none'),
          inlineSize: hook.inlineSize,
        }),
      ]),
      /* A closed popover is not drawn, as the UA's sheet has it, which the
         rules above outrank. */
      /* Written out: the vocabulary names no `:popover-open`. */
      on({ part: 'surface', selector: '[part="surface"]:not(:popover-open)' }, [
        web([rule({ display: 'none' })]),
      ]),
      /* It travels a little out of the edge it opened against. */
      on('surface', [
        rule({
          own: { popoverTravel: product(token('space-2xs'), '-1'), popoverFrom: 0.96 },
          opacity: 0,
          transform: fn('translateY', own.popoverTravel),
          scale: own.popoverFrom,
          transition: list(
            ['opacity', fast, token('easing-standard')],
            ['scale', fast, token('easing-emphasized')],
            ['transform', fast, token('easing-emphasized')],
            ['display', fast, 'allow-discrete'],
            ['overlay', fast, 'allow-discrete'],
          ),
        }),
        /* Opening upward, it comes up from the trigger. */
        rule({ placedTop: true }, { own: { popoverTravel: token('space-2xs') } }),
        rule({ part: { 'data-placed': true } }, { opacity: 1, scale: 1, transform: 'none' }),
        /* Out of the near edge, and out of the arrow where there is one. */
        rule(
          { placedTop: true },
          { transformOrigin: [measured('floating-arrow-x', '50%'), '100%'] },
        ),
        rule({ placedBottom: true }, { transformOrigin: [measured('floating-arrow-x', '50%'), 0] }),
        rule(
          { placedLeft: true },
          { transformOrigin: ['100%', measured('floating-arrow-y', '50%')] },
        ),
        rule({ placedRight: true }, { transformOrigin: [0, measured('floating-arrow-y', '50%')] }),
        rule(
          { reducedMotion: true },
          {
            scale: 1,
            transform: 'none',
            transition: 'none',
          },
        ),
      ]),
      /* The scrolling happens in here, with the inset inside it. */
      on('content', [
        rule({
          maxBlockSize: hook.maxBlockSize,
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
          blockSize: hook.arrowSize,
          inlineSize: hook.arrowSize,
          position: 'absolute',
          rotate: '45deg',
        }),
        /* Physical sides, as a placement is, in either direction. */
        rule({ dir: 'ltr', placedBottom: true }, { borderInlineStart: own.popoverEdge }),
        rule({ dir: 'rtl', placedBottom: true }, { borderInlineEnd: own.popoverEdge }),
        rule({ placedBottom: true }, { borderBlockStart: own.popoverEdge }),
        rule({ dir: 'ltr', placedTop: true }, { borderInlineEnd: own.popoverEdge }),
        rule({ dir: 'rtl', placedTop: true }, { borderInlineStart: own.popoverEdge }),
        rule({ placedTop: true }, { borderBlockEnd: own.popoverEdge }),
        rule({ dir: 'ltr', placedRight: true }, { borderInlineStart: own.popoverEdge }),
        rule({ dir: 'rtl', placedRight: true }, { borderInlineEnd: own.popoverEdge }),
        rule({ placedRight: true }, { borderBlockEnd: own.popoverEdge }),
        rule({ dir: 'ltr', placedLeft: true }, { borderInlineEnd: own.popoverEdge }),
        rule({ dir: 'rtl', placedLeft: true }, { borderInlineStart: own.popoverEdge }),
        rule({ placedLeft: true }, { borderBlockStart: own.popoverEdge }),
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
        web([rule({ supports: 'not (overlay: auto)' }, { transitionBehavior: 'normal' })]),
      ]),
    ]
  },
)
