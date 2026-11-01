import densitySm from '../../../fragments/density-sm.js'
import { boolean, oneOf } from '../../../render.js'
import {
  difference,
  fn,
  list,
  native,
  product,
  quotient,
  safeArea,
  token,
  web,
} from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * App Header's styled tier.
 *
 * **Opaque by default, flat, and in the flow.** `material` sets how much of
 * the page shows through: `glass` is translucent and blurred, `frosted` the
 * same pair turned up, and `transparent` no fill until the page has scrolled
 * under it, when it takes the glass. `overlay` stands the bar over the top
 * of the page, so the section under it starts behind it. A phone draws the blur through
 * expo-blur. `sticky` keeps the bar at the top of the window on the web
 * while the page scrolls; a phone has no sticky position, and keeps the bar
 * in view where the app places it, above the scroll view it draws the page
 * in.
 *
 * **The row is what is centered**, with the middle region in the middle of
 * the bar while the brand and the actions leave it room, and in a bar
 * narrower than 24rem the insets step down so two destinations fit a 360
 * point phone. **Dense by nature**: the host takes the small steps of every
 * control size from the `density-sm` fragment, as Toolbar does.
 *
 * **The bar stands clear of the status bar and the notch** where it is at
 * the top of the window: on the web a `sticky` or `overlay` bar's host is
 * padded by the window's top safe area, and on a phone every bar's.
 * On a phone that is the share of the inset that reaches into the host,
 * which is none where the bar stands lower, as under a router's own header,
 * or inside a scroll view. On the web it is `env(safe-area-inset-top)`,
 * which is 0 unless the page draws under the notch with
 * `viewport-fit=cover`.
 */
export default styles(
  root,
  {
    prefix: 'app-header',
    hooks: {
      backdrop: null,
      backgroundColor: null,
      blockSize: token('size-header'),
      borderColor: 'transparent',
      maxInlineSize: '72rem',
      padding: null,
    },
    props: {
      material: oneOf(['frosted', 'glass', 'transparent']),
      overlay: boolean(),
      sticky: boolean(),
    },
    stylesheet: 'app-header/root/app-header-root.generated.css',
  },
  ({ hook, include, on, rule, variants }) => {
    const header = hook.blockSize
    const pace = token('duration-normal')
    const easing = token('easing-standard')
    const glass = {
      backdropFilter: hook.backdrop(token('material-backdrop')),
      backgroundColor: hook.backgroundColor(token('material-translucent')),
    }
    return [
      include(densitySm),
      on('host', [
        rule({
          backgroundColor: hook.backgroundColor(token('color-background')),
          borderBlockEnd: [token('border-thin'), 'solid', hook.borderColor],
          /* What the narrow row measures itself against: the bar's own width. */
          web: { containerType: 'inline-size' },
          display: 'block',
          inlineSize: '100%',
          /* The fill and the edge fade with the blur, or `transparent` takes
             its surface in a single frame. */
          transition: list(
            ['backdrop-filter', pace, easing],
            ['background-color', pace, easing],
            ['border-color', pace, easing],
          ),
        }),
        variants('material', {
          glass: { ...glass },
          frosted: {
            backdropFilter: hook.backdrop(fn('blur', token('material-blur-lg'))),
            backgroundColor: hook.backgroundColor(token('material-translucent-strong')),
          },
          transparent: { backgroundColor: hook.backgroundColor('transparent') },
        }),
        /* Scrolled, it takes the glass. */
        rule({ material: 'transparent', scrolled: true }, { ...glass }),
        /* Over the top of the page: the section under the bar starts
           behind it, drawn under it, by the bar's height and the safe area
           the bar stands clear of. */
        rule(
          { overlay: true },
          {
            marginBlockEnd: difference(product(header, '-1'), safeArea('top')),
            position: 'relative',
            zIndex: token('layer-sticky'),
          },
        ),
        rule(
          { sticky: true },
          { insetBlockStart: 0, web: { position: 'sticky' }, zIndex: token('layer-sticky') },
        ),
        /* Clear of the status bar and the notch: on the web a bar that stays at
           the top of the window, or lies over the page, and on a phone every
           bar, by the share of the safe area that reaches into it. */
        web([rule([{ sticky: true }, { overlay: true }], { paddingBlockStart: safeArea('top') })]),
        native([rule({ paddingBlockStart: safeArea('top') })]),
        /* Out of the way under `hide-on-scroll`: a sticky bar slides up by
           its own height, and one that is not has scrolled away already. */
        rule(
          { sticky: true },
          {
            transition: list(
              ['backdrop-filter', pace, easing],
              ['background-color', pace, easing],
              ['border-color', pace, easing],
              ['translate', pace, easing],
            ),
          },
        ),
        rule({ hidden: true, sticky: true }, { translate: [0, '-100%'] }),
        rule({ reducedMotion: true, sticky: true }, { transition: 'none' }),
        /* Print: a bar of destinations, and a printed page has no elsewhere. */
        rule({ print: true }, { display: 'none' }),
      ]),
      /* Centered, so the content lines up with the page while the banner
         runs edge to edge. Neither outer track shrinks below what it holds,
         so it is the middle region that yields, and it scrolls. */
      on('row', [
        rule({
          alignItems: 'center',
          blockSize: header,
          display: 'grid',
          gap: token('space-lg'),
          gridTemplateColumns: 'minmax(max-content, 1fr) minmax(0, auto) minmax(max-content, 1fr)',
          marginInline: 'auto',
          maxInlineSize: hook.maxInlineSize,
          paddingInline: hook.padding(token('space-lg')),
        }),
        /* Beside the brand, with the slack after it. */
        rule({ contentAlign: 'start' }, { gridTemplateColumns: 'auto 1fr auto' }),
        /* A phone-sized bar spends less on its insets, so two destinations
           fit a 360 point phone. */
        rule(
          { inlineSize: { below: '24rem' } },
          { gap: token('space-md'), paddingInline: hook.padding(token('space-md')) },
        ),
        /* Folded: the brand and the actions share the row, and the middle
           region opens as a column below. */
        rule(
          { folded: true },
          {
            blockSize: 'auto',
            gridTemplateColumns: 'minmax(0, 1fr) auto',
            gridTemplateRows: header,
            rowGap: token('space-none'),
          },
        ),
        /* A phone lays the row out along a line, so the folded region wraps
           onto a line of its own. */
        native([rule({ folded: true }, { flexWrap: 'wrap' })]),
      ]),
      on('start', [rule({ alignItems: 'center', display: 'flex', minInlineSize: 0 })]),
      /* Against the trailing edge, so the row reads brand, middle, actions
         from the two window edges inwards. */
      on('end', [
        rule({
          alignItems: 'center',
          display: 'flex',
          gap: token('space-xs'),
          justifyContent: 'flex-end',
          minInlineSize: 0,
        }),
      ]),
      /* **A phone gives the two outer tracks one share each from nothing**,
         so the middle region stands in the middle of the bar, where the web's
         equal tracks put it. Folded, they keep the bar's height. */
      on(
        ['start', 'end'],
        [native([rule({ flexShrink: 0 }), rule({ folded: true }, { minBlockSize: header })])],
      ),
      on({ region: 'start', slotted: '*' }, [
        rule({
          alignItems: 'center',
          color: token('color-foreground'),
          display: 'flex',
          flex: '0 0 auto',
          fontWeight: token('weight-semibold'),
          gap: token('space-xs'),
          letterSpacing: token('tracking-tight'),
        }),
        /* A phone fits words to the box they are measured in, so the brand
           keeps to one line, as the web's track at its widest content does. */
        native([rule({ whiteSpace: 'nowrap' })]),
      ]),
      on('content', [
        rule({
          alignItems: 'center',
          display: 'flex',
          /* The marker is placed against this region. */
          position: 'relative',
          gap: token('space-md'),
          /* `safe`, or navigation wider than the region overflows both
             edges, and the half past the start edge is out of reach. */
          justifyContent: 'safe center',
          /* Long navigation scrolls inside the bar, and the page keeps its width. */
          minInlineSize: 0,
          overflowX: 'auto',
        }),
        /* A phone's scroll view is as wide as what it holds, so centered is safe. */
        native([rule({ flexShrink: 1, justifyContent: 'center' })]),
        rule({ contentAlign: 'start' }, { justifyContent: 'flex-start' }),
        rule(
          { folded: true },
          {
            alignItems: 'stretch',
            flexDirection: 'column',
            gridColumn: '1 / -1',
            gridRow: 2,
            justifyContent: 'flex-start',
            overflowX: 'visible',
            paddingBlockEnd: token('space-sm'),
          },
        ),
        native([rule({ folded: true }, { flexBasis: '100%' })]),
        /* `display: flex` above outranks the user agent's `[hidden]`. */
        rule({ part: { hidden: true } }, { display: 'none' }),
      ]),
      on('toggle', [
        rule({
          web: { all: 'unset', cursor: 'pointer' },
          /* `all: unset` takes the `border-box` every shadow root is given. */
          boxSizing: 'border-box',
          position: 'relative',
          alignItems: 'center',
          blockSize: token('size-control'),
          borderRadius: token('radii-sm'),
          color: token('color-foreground-muted'),
          display: 'inline-flex',
          inlineSize: token('size-control'),
          justifyContent: 'center',
        }),
        /* At the start, the toggle leads the brand by the gap the actions keep. */
        rule({ within: 'start' }, { marginInlineEnd: token('space-xs') }),
        rule([{ hover: true }, { open: true }], {
          backgroundColor: token('color-hover'),
          color: token('color-foreground'),
        }),
        rule(
          { focusVisible: true },
          {
            outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
            outlineOffset: token('size-focus-offset'),
          },
        ),
      ]),
      /* The press reaches `--helix-size-target`, in a transparent box, so nothing
         drawn moves. Where the control is already that size the box sits inside it. */
      on({ after: 'toggle' }, [
        web([
          rule({
            content: '""',
            inset: quotient(difference(token('size-target'), '100%'), '-2'),
            position: 'absolute',
          }),
        ]),
      ]),
      on('toggle-mark', [rule({ blockSize: token('size-icon'), inlineSize: token('size-icon') })]),
    ]
  },
)
