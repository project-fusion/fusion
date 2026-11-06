import { oneOf } from '../../../render.js'
import {
  difference,
  fn,
  inherited,
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
import root from './headless.js'

/**
 * Dialog's styled tier.
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
    hooks: ({ own }) => ({
      backdrop: null,
      backgroundColor: null,
      borderColor: token('color-border-floating'),
      borderWidth: token('border-floating'),
      color: token('color-foreground'),
      iconSize: product(token('size-icon-lg'), 2),
      inlineSize: '28rem',
      padding: own.dialogInset,
      radius: token('radii-sm'),
      rise: token('space-lg'),
      scrim: own.dialogScrim,
      shadow: token('shadow-floating'),
    }),
    own: {
      dialogBorder: null,
      dialogDismiss: null,
      dialogDismissGlyph: null,
      dialogGround: null,
      dialogInset: null,
      dialogMd: null,
      dialogRaised: null,
      dialogScrim: null,
      dialogSurface: null,
      dialogWidth: null,
    },
    props: {
      material: oneOf(['frosted', 'glass']),
      size: oneOf(['sm', 'md', 'lg', 'full']),
      textAlign: oneOf(['center', 'start']),
    },
    stylesheet: 'dialog/root/dialog-root.generated.css',
  },
  ({ hook, keyframes, on, own, rule, variants }) => {
    const padding = hook.padding
    const rise = hook.rise
    const move = token('duration-normal')
    /* The title's first line, where the close control is centered. */
    const titleLine = product(token('text-xl'), token('leading-tight'))
    const dismissSize = own.dialogDismiss
    const step = rule({
      /* The panel is the ground an elevated Card inside stands on, so the Card's lift
         inside another card, the white of the overlay rung in light, stops here: on this
         white panel it drew white on white. */
      '--_card-nest': 'initial',
      /* A panel opened from inside takes `surface-overlay` too. In dark a shadow does not
         show and the two were one fill, so inside the dialog the token sits a step above it.
         In light the shadow separates them. */
      '--helix-color-surface-overlay': scheme(
        own.dialogGround,
        mix(token('color-foreground'), 12, own.dialogGround),
      ),
      /* A panel in the content reads `surface-raised`, which in dark is the dialog's own
         fill. **The rungs inside step by 3%, 9%, and 12% of the ink**, as Popover's do, so
         an elevated card, which takes the overlay rung, reads #343434 above a filled one at
         #2b2b2b, 1.13:1. */
      '--helix-color-surface-raised': scheme(
        own.dialogRaised,
        mix(token('color-foreground'), 9, own.dialogGround),
      ),
      /* A Card in the content reads `surface`, which in dark is darker than the dialog's
         fill and read as a hole. Inside, the token sits a step above the dialog instead. */
      '--helix-color-surface': scheme(
        own.dialogSurface,
        mix(token('color-foreground'), 3, own.dialogGround),
      ),
      /* **And a line inside sits the step above the panel that it sits above the page.**
         12% of the foreground over the panel measures 1.33 against it and 1.25 against a
         card. Light keeps its own. */
      '--helix-color-border': scheme(
        own.dialogBorder,
        mix(token('color-foreground'), 12, own.dialogGround),
      ),
      /* Nothing inside is rounder than the panel: a card follows its container, by the
         owner's decision of November 3, 2026. */
      '--helix-radii-md': fn('min', own.dialogMd, hook.radius),
    })
    /* The way in decelerates, coming to rest, and the way out accelerates, as Toast
       leaves: the transition a change runs is the one on the state it arrives at. */
    const leaving = list(
      ['opacity', move, token('easing-accelerate')],
      ['translate', move, token('easing-accelerate')],
      ['display', move, 'allow-discrete'],
      ['overlay', move, 'allow-discrete'],
    )
    const arriving = list(
      ['opacity', move, token('easing-standard')],
      ['translate', move, token('easing-decelerate')],
      ['display', move, 'allow-discrete'],
      ['overlay', move, 'allow-discrete'],
    )
    /* A sheet travels its whole height, so it comes in at the slow step. */
    const slow = token('duration-slow')
    const rising = list(
      ['opacity', move, token('easing-standard')],
      ['translate', slow, token('easing-decelerate')],
      ['display', slow, 'allow-discrete'],
      ['overlay', slow, 'allow-discrete'],
    )
    /* Under reduced motion the panel and the scrim fade over `duration-fade`, and
       nothing rises. */
    const fade = token('duration-fade')
    const fading = list(
      ['opacity', fade, token('easing-standard')],
      ['display', fade, 'allow-discrete'],
      ['overlay', fade, 'allow-discrete'],
    )
    return [
      /* The host draws nothing, and holds the scrim's tint for the backdrop to read. */
      on('host', [
        rule({ display: 'contents' }),
        rule({
          own: {
            dialogGround: hook.backgroundColor(token('color-surface-overlay')),
            dialogScrim: token('color-overlay'),
            /* The page's own rungs, read here for the panel to restate in light. */
            dialogRaised: token('color-surface-raised'),
            dialogSurface: token('color-surface'),
            dialogBorder: token('color-border'),
            dialogMd: token('radii-md'),
            /* **The inset follows the region's density**, a step and a half of the
               control inset: 24 at `md`, 18 at `sm`, and 36 at `lg`. */
            dialogInset: product(token('space-control'), 1.5),
          },
        }),
        /* **Opened over another modal surface, the panel stands a step above it in
           dark**, the step a panel opened from inside a dialog takes: two panels at one
           fill read as one shape. Light keeps its own, where the scrim sets them apart. */
        rule(
          { stacked: true },
          {
            own: {
              dialogGround: hook.backgroundColor(
                scheme(
                  token('color-surface-overlay'),
                  mix(token('color-foreground'), 8, token('color-surface-overlay')),
                ),
              ),
            },
          },
        ),
        rule({ print: true }, { display: 'none' }),
      ]),
      on('surface', [step]),
      on('surface', [
        rule({
          own: { dialogWidth: hook.inlineSize },
          backgroundColor: own.dialogGround,
          border: [hook.borderWidth, 'solid', hook.borderColor],
          borderRadius: hook.radius,
          boxShadow: hook.shadow,
          boxSizing: 'border-box',
          color: hook.color,
          display: 'flex',
          flexDirection: 'column',
          /* The gap follows the density with the inset, the control inset. */
          gap: token('space-control'),
          inlineSize: fn('min', own.dialogWidth, difference('100vw', token('space-xl'))),
          maxBlockSize: difference('100dvh', token('space-xl')),
          overflowY: 'auto',
          padding,
        }),
      ]),
      /* A closed dialog is not drawn, as the UA's sheet has it, which the
         `display` above takes away. */
      /* Written out: the vocabulary names no dialog's own `open` attribute. */
      on({ part: 'surface', selector: '[part="surface"]:not([open])' }, [
        web([rule({ display: 'none' })]),
      ]),
      on('surface', [
        variants('size', {
          sm: { own: { dialogWidth: '22rem' } },
          md: { own: { dialogWidth: '28rem' } },
          lg: { own: { dialogWidth: '44rem' } },
          full: { own: { dialogWidth: '100vw' } },
        }),
        /* No ring on the panel itself. */
        rule({ outline: 'none' }),
      ]),
      on({ backdrop: 'surface' }, [rule({ backgroundColor: hook.scrim })]),
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
        rule({ display: 'flex', gap: token('space-xs'), justifyContent: 'flex-end' }),
      ]),
      /* It arrives and it leaves, rising as it fades in. */
      on('surface', [
        rule({
          opacity: 0,
          transition: leaving,
          translate: [0, rise],
        }),
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
        rule({ open: true }, { opacity: 1, transition: arriving, translate: [0, 0] }),
        rule({ open: true, window: { below: '30rem' } }, { transition: rising }),
        rule({ startingStyle: true, open: true }, { opacity: 0, translate: [0, rise] }),
        rule(
          { startingStyle: true, open: true, window: { below: '30rem' } },
          { translate: [0, '100%'] },
        ),
        /* Saying no, by moving. */
        rule(
          { part: { 'data-refused': true } },
          { animation: ['helix-dialog-refuse', move, token('easing-emphasized')] },
        ),
        rule({ reducedMotion: true }, { transition: fading, translate: [0, 0] }),
        rule({ open: true, reducedMotion: true }, { transition: fading, translate: [0, 0] }),
        rule({ startingStyle: true, open: true, reducedMotion: true }, { translate: [0, 0] }),
        rule({ part: { 'data-refused': true }, reducedMotion: true }, { animation: 'none' }),
        web([rule({ supports: 'not (overlay: auto)' }, { transitionBehavior: 'normal' })]),
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
        rule({ open: true }, { opacity: 1 }),
        rule({ startingStyle: true, open: true }, { opacity: 0 }),
        rule({ reducedMotion: true }, { transition: fading }),
        /* Where `overlay` cannot be transitioned, as in WebKit, a closing
           panel leaves the top layer at once while `display` holds it for the
           fade, and a fixed panel out of the top layer is placed against the
           nearest ancestor with a filter or a transform. There it closes at
           once. */
        web([rule({ supports: 'not (overlay: auto)' }, { transitionBehavior: 'normal' })]),
      ]),
      keyframes('helix-dialog-refuse', { '50%': { scale: 1.02 } }),
      /* The mark above the title, for a dialog that warns. */
      on({ region: 'icon', slotted: '*' }, [
        rule({
          blockSize: hook.iconSize,
          display: 'block',
          inlineSize: hook.iconSize,
        }),
      ]),
      /* Centered on the panel, and the actions and the mark with it. */
      on('surface', [rule({ textAlign: 'center' }, { textAlign: 'center' })]),
      on({ region: 'footer', slotted: '*' }, [
        rule({ textAlign: 'center' }, { justifyContent: 'center' }),
      ]),
      on({ region: 'icon', slotted: '*' }, [
        rule({ textAlign: 'center' }, { marginInline: 'auto' }),
      ]),
      /* In the corner and out of the flow, centered on the title's first line.
         **The box and its glyph follow the density**, the tight control and icon steps,
         **and the glyph's edge is the content's edge**: the box sits in by the inset less
         its own margin round the glyph, 16 at `md` as before. */
      on('dismiss', [
        rule({
          own: {
            dialogDismiss: token('size-control-tight'),
            dialogDismissGlyph: token('size-icon-tight'),
          },
          web: { all: 'unset', cursor: 'pointer' },
          boxSizing: 'border-box',
          position: 'absolute',
          insetBlockStart: sum(padding, quotient(difference(titleLine, dismissSize), 2)),
          insetInlineEnd: difference(
            padding,
            quotient(difference(dismissSize, own.dialogDismissGlyph), 2),
          ),
          blockSize: dismissSize,
          borderRadius: token('radii-sm'),
          color: token('color-foreground-muted'),
          display: 'inline-flex',
          inlineSize: dismissSize,
          placeContent: 'center',
          placeItems: 'center',
          transition: ['color', token('duration-fast'), token('easing-standard')],
        }),
      ]),
      /* The press reaches `--helix-size-target`, in a transparent box, so nothing drawn
         moves. Where the control is already that size the box sits inside it. */
      on({ after: 'dismiss' }, [
        web([
          rule({
            content: '""',
            inset: quotient(difference(token('size-target'), '100%'), '-2'),
            position: 'absolute',
          }),
        ]),
      ]),
      on('dismiss-mark', [
        rule({ blockSize: own.dialogDismissGlyph, inlineSize: own.dialogDismissGlyph }),
      ]),
      on('dismiss', [
        rule(
          { hover: true },
          {
            backgroundColor: token('color-hover'),
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
        rule(
          { dismissible: true },
          { paddingInlineEnd: sum(token('size-control-tight'), token('space-xs')) },
        ),
      ]),
      on('dismiss', [rule({ reducedMotion: true }, { transition: 'none' })]),
      on('surface', [
        variants('material', {
          /* `glass` is the one glass coverage, `material-panel`, as every glass panel
             draws it. **The filter lifts the page back from under the scrim in light**,
             by `material-scrim-lift`, so the panel reads the page and keeps that
             coverage over it: 240 on average over a white page, from 218. */
          glass: {
            backdropFilter: hook.backdrop([
              token('material-backdrop'),
              fn('brightness', inherited('helix-material-scrim-lift')),
            ]),
            backgroundColor: hook.backgroundColor(token('material-panel')),
          },
          frosted: {
            backdropFilter: hook.backdrop(fn('blur', token('material-blur-lg'))),
            backgroundColor: hook.backgroundColor(token('material-translucent-strong')),
          },
        }),
      ]),
      /* **Glass opened inside the panel steps off it in dark**, as a solid panel opened
         inside does: the glass inside takes the overlay rung this panel restates, at the
         one glass coverage. In light that rung is white here as on the page, so the glass
         is unchanged. On the children, since the panel's own glass reads the page's. */
      on({ part: 'surface', selector: '[part="surface"] > *' }, [
        web([
          rule({
            '--helix-material-panel': fn(
              'color-mix',
              'in oklab',
              [
                token('color-surface-overlay'),
                fn('min', '100%', product(token('material-glass-opacity'), '100%')),
              ],
              'transparent',
            ),
          }),
        ]),
      ]),
    ]
  },
)
