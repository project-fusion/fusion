import {
  difference,
  fn,
  list,
  mix,
  product,
  quotient,
  safeArea,
  scheme,
  sum,
  token,
  web,
} from '../../../style.js'
import { styles } from '../../../table.js'
import { prop } from '../../../tree.js'
import root from './headless.js'

/**
 * Dialog's styled tier, which writes
 * `helix/styled/src/dialog/root/dialog-root.generated.css`.
 *
 * **The panel is the floating surface**, with its edge, its shadow and the
 * house radius, as wide as `size` says and never wider or taller than the
 * window less a margin, scrolling inside itself where its content is
 * longer. The scrim is the layer's backdrop. `glass` and `frosted` are the
 * translucent grounds over the theme's blur.
 *
 * **It rises as it fades in, and falls as it fades out**, at once under
 * reduced motion. **Below a window of 30rem it is a sheet**, pinned to the
 * window's bottom edge, square there, its last row clear of the home
 * indicator, and it rises from under the edge. A press on the scrim that
 * the dialog keeps open swells it and settles it.
 *
 * **The close control sits in the corner by the title**, out of the flow
 * and centered on the title's first line, and the title keeps room for it.
 * `text-align="center"` centers the mark, the title, the words and the
 * actions together. Print leaves the dialog out, and is the web's.
 */
export default styles(
  root,
  {
    prefix: 'dialog',
    hooks: [
      'backdrop',
      'background-color',
      'border-color',
      'border-width',
      'color',
      'icon-size',
      'inline-size',
      'padding',
      'radius',
      'rise',
      'scrim',
      'shadow',
    ],
    own: ['dialog-scrim', 'dialog-width'],
    props: [
      prop('material', ['frosted', 'glass']),
      prop('size', ['sm', 'md', 'lg', 'full']),
      prop('text-align', ['center', 'start']),
    ],
    stylesheet: 'dialog/root/dialog-root.generated.css',
  },
  ({ hook, keyframes, on, own, rule, variants }) => {
    const padding = hook.padding(token('space-lg'))
    const rise = hook.rise(token('space-lg'))
    const move = token('duration-normal')
    /* The title's first line, where the close control is centered. */
    const titleLine = product(token('text-xl'), token('leading-tight'))
    const dismissSize = token('size-control-sm')
    return [
      /* The host draws nothing, and holds the scrim's tint for the backdrop to read. */
      on('host', [
        rule({ display: 'contents' }),
        rule({ own: { scrim: token('color-overlay') } }),
        rule({ print: true }, { display: 'none' }),
      ]),
      on('surface', [
        rule({
          own: { width: hook.inlineSize('28rem') },
          backgroundColor: hook.backgroundColor(token('color-surface-overlay')),
          border: [
            hook.borderWidth(token('border-floating')),
            'solid',
            hook.borderColor(token('color-border')),
          ],
          borderRadius: hook.radius(token('radii-sm')),
          boxShadow: hook.shadow(token('shadow-floating')),
          boxSizing: 'border-box',
          color: hook.color(token('color-foreground')),
          display: 'flex',
          flexDirection: 'column',
          gap: token('space-md'),
          inlineSize: fn('min', own.width, difference('100vw', token('space-xl'))),
          maxBlockSize: difference('100dvh', token('space-xl')),
          overflowY: 'auto',
          padding,
        }),
      ]),
      /* A closed dialog is not drawn, as the UA's sheet has it, which the
         `display` above takes away. */
      on({ part: 'surface', selector: '[part="surface"]:not([open])' }, [
        rule({ platform: 'web' }, { display: 'none' }),
      ]),
      on('surface', [
        variants('size', {
          sm: { own: { width: '22rem' } },
          md: { own: { width: '28rem' } },
          lg: { own: { width: '44rem' } },
          full: { own: { width: '100vw' } },
        }),
        /* No ring on the panel itself. */
        rule({ outline: 'none' }),
      ]),
      on({ backdrop: 'surface' }, [rule({ backgroundColor: hook.scrim(own.scrim) })]),
      on({ region: 'header', slotted: '*' }, [
        rule({
          color: token('color-foreground'),
          fontFamily: token('font-sans'),
          fontSize: token('text-xl'),
          fontWeight: token('weight-semibold'),
          letterSpacing: token('tracking-tight'),
          lineHeight: token('leading-tight'),
          margin: token('space-none'),
        }),
      ]),
      on({ region: 'footer', slotted: '*' }, [
        rule({ display: 'flex', gap: token('space-xs'), justifyContent: 'flex-start' }),
      ]),
      /* It arrives and it leaves, rising as it fades in. */
      on('surface', [
        rule({
          opacity: 0,
          transition: list(
            ['opacity', move, token('easing-standard')],
            ['translate', move, token('easing-decelerate')],
            ['display', move, 'allow-discrete'],
            ['overlay', move, 'allow-discrete'],
          ),
          translate: [0, rise],
        }),
        rule({ state: 'open' }, { opacity: 1, translate: [0, 0] }),
        rule({ entering: true, state: 'open' }, { opacity: 0, translate: [0, rise] }),
        /* A sheet below a phone's width, pinned to the window's bottom edge. */
        rule(
          { window: { below: '30rem' } },
          {
            marginBlockEnd: token('space-none'),
            marginBlockStart: 'auto',
            inlineSize: '100vw',
            maxInlineSize: '100vw',
            maxBlockSize: difference('100dvh', token('space-3xl')),
            borderStartStartRadius: token('radii-sm'),
            borderStartEndRadius: token('radii-sm'),
            borderEndStartRadius: token('radii-none'),
            borderEndEndRadius: token('radii-none'),
            /* Its last row clear of the home indicator. */
            paddingBlockEnd: sum(padding, safeArea('bottom')),
            translate: [0, '100%'],
          },
        ),
        rule(
          { entering: true, state: 'open', window: { below: '30rem' } },
          { translate: [0, '100%'] },
        ),
        /* Saying no, by moving. */
        rule(
          { part: { 'data-refused': true } },
          { animation: ['helix-dialog-refuse', move, token('easing-emphasized')] },
        ),
        rule({ reducedMotion: true }, { transition: 'none' }),
        rule({ part: { 'data-refused': true }, reducedMotion: true }, { animation: 'none' }),
        rule(
          { platform: 'web', supports: 'not (overlay: auto)' },
          { transitionBehavior: 'normal' },
        ),
      ]),
      on({ backdrop: 'surface' }, [
        rule({
          opacity: 0,
          transition: list(
            ['opacity', move, token('easing-standard')],
            ['display', move, 'allow-discrete'],
            ['overlay', move, 'allow-discrete'],
          ),
        }),
        rule({ state: 'open' }, { opacity: 1 }),
        rule({ entering: true, state: 'open' }, { opacity: 0 }),
        rule({ reducedMotion: true }, { transition: 'none' }),
        /* Where `overlay` cannot be transitioned, as in WebKit, a closing
           panel leaves the top layer at once while `display` holds it for the
           fade, and a fixed panel out of the top layer is placed against the
           nearest ancestor with a filter or a transform. There it closes at
           once. */
        rule(
          { platform: 'web', supports: 'not (overlay: auto)' },
          { transitionBehavior: 'normal' },
        ),
      ]),
      keyframes('helix-dialog-refuse', { '50%': { scale: 1.02 } }),
      /* The mark above the title, for a dialog that warns. */
      on({ region: 'icon', slotted: '*' }, [
        rule({
          blockSize: hook.iconSize(product(token('size-icon-lg'), 2)),
          display: 'block',
          inlineSize: hook.iconSize(product(token('size-icon-lg'), 2)),
        }),
      ]),
      /* Centered on the panel, and the actions and the mark with it. */
      on('surface', [rule({ 'text-align': 'center' }, { textAlign: 'center' })]),
      on({ region: 'footer', slotted: '*' }, [
        rule({ 'text-align': 'center' }, { justifyContent: 'center' }),
      ]),
      on({ region: 'icon', slotted: '*' }, [
        rule({ 'text-align': 'center' }, { marginInline: 'auto' }),
      ]),
      /* In the corner and out of the flow, centered on the title's first line. */
      on('dismiss', [
        rule({
          all: web('unset'),
          boxSizing: 'border-box',
          position: 'absolute',
          insetBlockStart: sum(padding, quotient(difference(titleLine, dismissSize), 2)),
          insetInlineEnd: token('space-md'),
          blockSize: dismissSize,
          borderRadius: token('radii-sm'),
          color: token('color-foreground-muted'),
          cursor: web('pointer'),
          display: 'inline-flex',
          inlineSize: dismissSize,
          placeContent: 'center',
          placeItems: 'center',
          transition: ['color', token('duration-fast'), token('easing-standard')],
        }),
      ]),
      on('dismiss-mark', [
        rule({ blockSize: token('size-icon-sm'), inlineSize: token('size-icon-sm') }),
      ]),
      on('dismiss', [
        rule(
          { hover: true },
          {
            backgroundColor: mix(token('color-foreground'), 8, 'transparent'),
            color: token('color-foreground'),
          },
        ),
        rule(
          { focusVisible: true },
          {
            outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
            outlineOffset: token('size-focus-offset'),
          },
        ),
      ]),
      /* Room for it at the end of the title, so a long title wraps before it. */
      on({ region: 'header', slotted: '*' }, [
        rule({ dismissible: true }, { paddingInlineEnd: sum(dismissSize, token('space-xs')) }),
      ]),
      on('dismiss', [rule({ reducedMotion: true }, { transition: 'none' })]),
      on('surface', [
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
      ]),
    ]
  },
)
