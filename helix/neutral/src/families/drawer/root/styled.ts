import { oneOf } from '../../../render.js'
import {
  difference,
  first,
  fn,
  inherited,
  list,
  mix,
  native,
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
 * Drawer's styled tier.
 *
 * **The panel is the floating surface along an edge**, as long as the
 * window and as wide as `--drawer-size` across it, square where it meets
 * the window and rounded where it meets the page. Its edge and its shadow
 * show while it is open. The scrim is the layer's backdrop, and `glass` and
 * `frosted` are the translucent grounds over the theme's blur.
 *
 * **It slides in from past its edge and back out**, and follows the finger
 * while a swipe moves it, where the web writes the travel as
 * `--drawer-swipe-x` and `--drawer-swipe-y`. The header and the footer stay
 * put while the content between them scrolls.
 *
 * **Its first and last rows keep clear of the window's safe area** along
 * the edges it meets, the status bar and the home indicator on a phone.
 *
 * **The close control sits in the corner by the title**, out of the flow,
 * and the title keeps room for it. Print leaves the drawer out, and is the
 * web's.
 */
export default styles(
  root,
  {
    prefix: 'drawer',
    hooks: ({ own }) => ({
      backdrop: null,
      backgroundColor: null,
      borderColor: token('color-border-floating'),
      borderWidth: token('border-floating'),
      padding: null,
      paddingBlockStart: null,
      radius: token('radii-sm'),
      scrim: own.drawerScrim,
      shadow: token('shadow-floating'),
      size: '20rem',
      swipeX: 0,
      swipeY: 0,
    }),
    own: {
      drawerAway: null,
      drawerBorder: null,
      drawerDismiss: null,
      drawerDismissGlyph: null,
      drawerGround: null,
      drawerInset: null,
      drawerInsetTop: null,
      drawerLead: null,
      drawerMd: null,
      drawerRaised: null,
      drawerScrim: null,
      drawerSize: null,
      drawerSurface: null,
      drawerTrail: null,
    },
    props: { material: oneOf(['frosted', 'glass']) },
    stylesheet: 'drawer/root/drawer-root.generated.css',
  },
  ({ hook, on, own, rule }) => {
    const move = token('duration-normal')
    const padding = hook.padding(own.drawerInset)
    const paddingTop = first(hook.paddingBlockStart, hook.padding, own.drawerInsetTop)
    const dismissSize = own.drawerDismiss
    /* The padding at an edge the panel meets the window along, clear of the
       status bar, a notch, and the home indicator there. */
    const clearTop = sum(paddingTop, safeArea('top'))
    const clearBottom = sum(padding, safeArea('bottom'))
    /* The title's first line, where the close control is centered. */
    const titleLine = product(token('text-lg'), token('leading-tight'))
    /* The rungs a panel restates inside it in dark, as Dialog's do: the Card's lift
       inside a card stops at the panel, a panel opened from inside stands above it, the
       rungs step by 3%, 9%, and 12% of the ink, a line sits the step above the panel that
       it sits above the page, and nothing inside is rounder than the panel. */
    const step = rule({
      '--_card-nest': 'initial',
      '--helix-color-surface-overlay': scheme(
        own.drawerGround,
        mix(token('color-foreground'), 12, own.drawerGround),
      ),
      '--helix-color-surface-raised': scheme(
        own.drawerRaised,
        mix(token('color-foreground'), 9, own.drawerGround),
      ),
      '--helix-color-surface': scheme(
        own.drawerSurface,
        mix(token('color-foreground'), 3, own.drawerGround),
      ),
      '--helix-color-border': scheme(
        own.drawerBorder,
        mix(token('color-foreground'), 12, own.drawerGround),
      ),
      '--helix-radii-md': fn('min', own.drawerMd, hook.radius),
    })
    /* Under reduced motion the panel and the scrim fade over `duration-fade`. */
    const fade = token('duration-fade')
    const fading = list(
      ['opacity', fade, token('easing-standard')],
      ['display', fade, 'allow-discrete'],
      ['overlay', fade, 'allow-discrete'],
    )
    return [
      /* The host draws nothing, and holds the panel's size and the scrim's tint. */
      on('host', [
        rule({ own: { drawerSize: hook.size }, display: 'contents' }),
        rule({
          own: {
            drawerGround: hook.backgroundColor(token('color-surface-overlay')),
            drawerScrim: token('color-overlay'),
            /* The page's own rungs, read here for the panel to restate in light. */
            drawerRaised: token('color-surface-raised'),
            drawerSurface: token('color-surface'),
            drawerBorder: token('color-border'),
            drawerMd: token('radii-md'),
            /* **The inset follows the region's density**, as Dialog's does, 24 at `md`.
             **Above the title it is that and a fixed `lg` more**, 42, 48 and 60. */
            drawerInset: product(token('space-control'), 1.5),
            drawerInsetTop: sum(own.drawerInset, token('space-lg')),
          },
        }),
        rule({ print: true }, { display: 'none' }),
      ]),
      /* The scrim fades in as the panel slides, and out as it leaves. */
      on({ backdrop: 'panel' }, [
        rule({
          backgroundColor: hook.scrim,
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
        web([rule({ supports: 'not (overlay: auto)' }, { transitionBehavior: 'normal' })]),
      ]),
      on('panel', [step]),
      on('panel', [
        rule({
          borderRadius: hook.radius,
          margin: token('space-none'),
          border: 'none',
          maxInlineSize: 'none',
          maxBlockSize: 'none',
          inset: web('auto'),
          inlineSize: 'auto',
          blockSize: 'auto',
          backgroundColor: own.drawerGround,
          padding,
          paddingBlockStart: own.drawerLead(paddingTop),
          paddingBlockEnd: own.drawerTrail(padding),
          display: 'flex',
          flexDirection: 'column',
          outline: 'none',
          position: web('fixed'),
          transform: own.drawerAway,
          /* Out on the accelerating curve, and in on the decelerating one below, as
             Dialog's note gives. */
          transition: list(
            ['transform', move, token('easing-accelerate')],
            ['display', move, 'allow-discrete'],
            ['overlay', move, 'allow-discrete'],
          ),
          zIndex: web(token('layer-overlay')),
        }),
      ]),
      /* A closed drawer is not drawn, as the UA's sheet has it, which the
         `display` above takes away. The `display` transition holds it on
         screen until the slide out has finished. */
      /* Written out: the vocabulary names no dialog's own `open` attribute. */
      on({ part: 'panel', selector: '[part="panel"]:not([open])' }, [
        web([rule({ display: 'none' }), rule({ reducedMotion: true }, { opacity: 0 })]),
      ]),
      on('panel', [
        rule(
          { material: 'glass' },
          {
            /* **The one glass coverage**, `material-panel`, as every glass panel draws
               it, by the owner's decision of November 3, 2026. */
            backdropFilter: hook.backdrop(token('material-backdrop')),
            backgroundColor: hook.backgroundColor(token('material-panel')),
          },
        ),
        rule(
          { material: 'frosted' },
          {
            backdropFilter: hook.backdrop(fn('blur', token('material-blur-lg'))),
            backgroundColor: hook.backgroundColor(token('material-translucent-strong')),
          },
        ),
        /* Square where it meets the window, curved where it meets the page. */
        rule([{ placement: false }, { placement: 'end' }], {
          borderStartEndRadius: token('radii-none'),
          borderEndEndRadius: token('radii-none'),
          blockSize: '100%',
          inlineSize: fn('min', own.drawerSize, '100%'),
          web: { insetBlock: 0, insetInlineEnd: 0 },
          own: {
            drawerAway: fn('translateX', '100%'),
            drawerLead: clearTop,
            drawerTrail: clearBottom,
          },
        }),
        rule(
          { placement: 'start' },
          {
            borderStartStartRadius: token('radii-none'),
            borderEndStartRadius: token('radii-none'),
            blockSize: '100%',
            inlineSize: fn('min', own.drawerSize, '100%'),
            web: { insetBlock: 0, insetInlineStart: 0 },
            own: {
              drawerAway: fn('translateX', '-100%'),
              drawerLead: clearTop,
              drawerTrail: clearBottom,
            },
          },
        ),
        rule(
          { placement: 'bottom' },
          {
            borderEndStartRadius: token('radii-none'),
            borderEndEndRadius: token('radii-none'),
            blockSize: fn('min', own.drawerSize, '100%'),
            web: { insetBlockEnd: 0, insetInline: 0 },
            own: {
              drawerAway: fn('translateY', '100%'),
              drawerLead: paddingTop,
              drawerTrail: clearBottom,
            },
          },
        ),
        rule(
          { placement: 'top' },
          {
            borderStartStartRadius: token('radii-none'),
            borderStartEndRadius: token('radii-none'),
            blockSize: fn('min', own.drawerSize, '100%'),
            web: { insetBlockStart: 0, insetInline: 0 },
            own: {
              drawerAway: fn('translateY', '-100%'),
              drawerLead: clearTop,
              drawerTrail: padding,
            },
          },
        ),
        /* A phone takes no share inside `min()`, which the window it stands
           in has no length for until it is laid out: the size, and never more
           than the window across it. */
        native([
          rule([{ placement: false }, { placement: ['end', 'start'] }], {
            inlineSize: own.drawerSize,
            maxInlineSize: '100%',
          }),
          rule(
            { placement: ['bottom', 'top'] },
            { blockSize: own.drawerSize, maxBlockSize: '100%' },
          ),
        ]),
        /* The inline edges are logical and `translateX` is physical, so on a
           right-to-left page the end sits on the left and slides out leftward. */
        rule(
          [
            { dir: 'rtl', placement: false },
            { dir: 'rtl', placement: 'end' },
          ],
          { own: { drawerAway: fn('translateX', '-100%') } },
        ),
        rule({ dir: 'rtl', placement: 'start' }, { own: { drawerAway: fn('translateX', '100%') } }),
        /* Home, less however far a swipe or a snap point has moved it toward
           its edge, which is nothing at rest. */
        rule(
          { open: true },
          {
            border: [hook.borderWidth, 'solid', hook.borderColor],
            boxShadow: hook.shadow,
            transform: fn('translate', hook.swipeX, hook.swipeY),
            transition: list(
              ['transform', move, token('easing-decelerate')],
              ['display', move, 'allow-discrete'],
              ['overlay', move, 'allow-discrete'],
            ),
          },
        ),
      ]),
      /* A modal drawer's glass lifts the page back from under its scrim in light, as a
         glass Dialog's does. `:modal`, since only a modal panel has the scrim. */
      on({ part: 'panel', selector: ':host([material="glass"]) [part="panel"]:modal' }, [
        web([
          rule({
            backdropFilter: hook.backdrop([
              token('material-backdrop'),
              fn('brightness', inherited('helix-material-scrim-lift')),
            ]),
          }),
        ]),
      ]),
      /* Glass opened inside the drawer steps off it in dark. See Dialog's note. */
      on({ part: 'panel', selector: '[part="panel"] > *' }, [
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
      /* The page's own panning stays off the swipe's axis, and the content
         keeps its own scrolling down. */
      on(['panel', 'content'], [web([rule({ touchAction: 'pan-y' })])]),
      on('panel', [
        web([rule({ placement: ['bottom', 'top'] }, { touchAction: 'pan-x' })]),
        /* Under the finger while it moves, and back to the slide once it lets go. As
           specific as the open rule above, which it has to beat. */
        rule(
          { open: true, part: { 'data-swiping': true } },
          { transition: 'none', web: { userSelect: 'none' } },
        ),
        /* **Under reduced motion the panel fades in place and does not slide**, and
           stays where a swipe puts it, with no transition on the transform. */
        rule(
          { reducedMotion: true },
          { transform: fn('translate', hook.swipeX, hook.swipeY), transition: fading },
        ),
        rule(
          { open: true, reducedMotion: true },
          { transform: fn('translate', hook.swipeX, hook.swipeY), transition: fading },
        ),
        rule(
          { startingStyle: true, open: true, reducedMotion: true },
          { opacity: 0, transform: 'none' },
        ),
        /* The slide in starts from past the edge. */
        rule({ startingStyle: true, open: true }, { transform: own.drawerAway }),
        web([rule({ supports: 'not (overlay: auto)' }, { transitionBehavior: 'normal' })]),
      ]),
      on('header', [rule({ flex: '0 0 auto' })]),
      /* The title, whatever was passed in, set as a title and a step clear of
         the content under it. */
      on({ region: 'header', slotted: '*' }, [
        rule({
          color: token('color-foreground'),
          display: 'block',
          fontFamily: token('font-sans'),
          fontSize: token('text-lg'),
          fontWeight: token('weight-semibold'),
          letterSpacing: token('tracking-tight'),
          lineHeight: token('leading-tight'),
          margin: token('space-none'),
          /* The control inset, 12, 16 and 24 with the density. */
          marginBlockEnd: token('space-control'),
        }),
      ]),
      on('footer', [rule({ flex: '0 0 auto' })]),
      on({ region: 'footer', slotted: '*' }, [
        /* Actions at the trailing edge, the dismissive first and the primary last, in
           source order as on screen, as a Dialog's are, by the owner's decision of
           November 3, 2026. */
        rule({
          display: 'flex',
          flexWrap: 'wrap',
          gap: token('space-xs'),
          justifyContent: 'flex-end',
          marginBlockStart: token('space-control'),
        }),
      ]),
      /* The content scrolls between them, with room for a focus ring at its
         sides, taken back by its margin. */
      on('content', [
        /* **The content's children stand a step apart**, the gap Dialog's body takes,
           and each keeps its own height while the region scrolls. */
        rule({
          display: 'flex',
          flex: '1 1 auto',
          flexDirection: 'column',
          gap: token('space-control'),
          minBlockSize: 0,
          marginInline: product(token('size-focus-reach'), '-1'),
          overflowY: 'auto',
          paddingInline: token('size-focus-reach'),
        }),
      ]),
      on({ part: 'content', selector: '[part="content"] > slot::slotted(*)' }, [
        web([rule({ flexShrink: 0 })]),
      ]),
      /* In the corner and out of the flow, centered on the title's first line. **The
         box, its glyph and its inset follow the density** as Dialog's do. */
      on('dismiss', [
        rule({
          own: {
            drawerDismiss: token('size-control-tight'),
            drawerDismissGlyph: token('size-icon-tight'),
          },
          web: { all: 'unset', cursor: 'pointer' },
          boxSizing: 'border-box',
          position: 'absolute',
          insetBlockStart: sum(
            own.drawerLead(paddingTop),
            quotient(difference(titleLine, dismissSize), 2),
          ),
          insetInlineEnd: difference(
            padding,
            quotient(difference(dismissSize, own.drawerDismissGlyph), 2),
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
        rule({ reducedMotion: true }, { transition: 'none' }),
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
        rule({ blockSize: own.drawerDismissGlyph, inlineSize: own.drawerDismissGlyph }),
      ]),
      /* Room for it at the end of the title, so a long title wraps before it. */
      on({ region: 'header', slotted: '*' }, [
        rule(
          { dismissible: true },
          { paddingInlineEnd: sum(token('size-control-tight'), token('space-xs')) },
        ),
      ]),
    ]
  },
)
