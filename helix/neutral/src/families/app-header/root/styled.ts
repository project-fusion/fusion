import { difference, fn, list, mix, product, safeArea, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import { prop } from '../../../tree.js'
import root from './headless.js'

/**
 * App Header's styled tier, which writes
 * `helix/styled/src/app-header/root/app-header-root.generated.css`.
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
 * point phone. **Dense by nature**: the host sets the small steps of every
 * control size, as Toolbar does.
 *
 * **The bar stands clear of the status bar and the notch** where it is at
 * the top of the window: its host is padded by the window's top safe area.
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
    hooks: [
      'backdrop',
      'background-color',
      'block-size',
      'border-color',
      'max-inline-size',
      'padding',
    ],
    props: [
      prop('material', ['frosted', 'glass', 'transparent']),
      prop('overlay', 'boolean'),
      prop('sticky', 'boolean'),
    ],
    stylesheet: 'app-header/root/app-header-root.generated.css',
  },
  ({ hook, on, rule, variants }) => {
    const header = hook.blockSize(token('size-header'))
    const pace = token('duration-normal')
    const easing = token('easing-standard')
    const glass = {
      backdropFilter: hook.backdrop(token('material-backdrop')),
      backgroundColor: hook.backgroundColor(token('material-translucent')),
    }
    return [
      on('host', [
        rule({
          '--helix-size-checkbox': token('size-checkbox-sm'),
          '--helix-size-checkbox-loose': product(token('size-checkbox'), 1.2),
          '--helix-size-checkbox-tight': product(token('size-checkbox'), 0.8),
          /* The icon step with it. Declaring the control size and stopping
             there draws an icon at the `md` step inside `sm` controls. */
          '--helix-size-icon': token('size-icon-sm'),
          '--helix-size-icon-loose': product(token('size-icon'), 1.2),
          '--helix-size-icon-tight': product(token('size-icon'), 0.8),
          '--helix-size-control': token('size-control-sm'),
          '--helix-size-control-loose': product(token('size-control'), 1.2),
          '--helix-size-control-tight': product(token('size-control'), 0.8),
          '--helix-size-tag': token('size-tag-sm'),
          backgroundColor: hook.backgroundColor(token('color-background')),
          borderBlockEnd: [token('border-thin'), 'solid', hook.borderColor('transparent')],
          /* What the narrow row measures itself against: the bar's own width. */
          containerType: web('inline-size'),
          display: 'block',
          inlineSize: '100%',
          /* Clear of the status bar and the notch, by the window's top safe
             area, or on a phone the share of it that reaches into the bar. */
          paddingBlockStart: safeArea('top'),
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
        rule({ material: 'transparent', state: 'scrolled' }, { ...glass }),
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
          { insetBlockStart: 0, position: web('sticky'), zIndex: token('layer-sticky') },
        ),
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
        rule({ state: 'hidden', sticky: true }, { translate: [0, '-100%'] }),
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
          maxInlineSize: hook.maxInlineSize('72rem'),
          paddingInline: hook.padding(token('space-lg')),
        }),
        /* Beside the brand, with the slack after it. */
        rule({ 'content-align': 'start' }, { gridTemplateColumns: 'auto 1fr auto' }),
        /* A phone-sized bar spends less on its insets, so two destinations
           fit a 360 point phone. */
        rule(
          { inlineSize: { below: '24rem' } },
          { gap: token('space-md'), paddingInline: hook.padding(token('space-md')) },
        ),
        /* Folded: the brand and the actions share the row, and the middle
           region opens as a column below. */
        rule(
          { state: 'folded' },
          {
            blockSize: 'auto',
            gridTemplateColumns: 'minmax(0, 1fr) auto',
            gridTemplateRows: header,
            rowGap: token('space-none'),
          },
        ),
        /* A phone lays the row out along a line, so the folded region wraps
           onto a line of its own. */
        rule({ platform: 'native', state: 'folded' }, { flexWrap: 'wrap' }),
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
        [
          rule({ platform: 'native' }, { flexShrink: 0 }),
          rule({ platform: 'native', state: 'folded' }, { minBlockSize: header }),
        ],
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
        rule({ platform: 'native' }, { whiteSpace: 'nowrap' }),
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
        rule({ platform: 'native' }, { flexShrink: 1, justifyContent: 'center' }),
        rule({ 'content-align': 'start' }, { justifyContent: 'flex-start' }),
        rule(
          { state: 'folded' },
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
        rule({ platform: 'native', state: 'folded' }, { flexBasis: '100%' }),
        /* `display: flex` above outranks the user agent's `[hidden]`. */
        rule({ part: { hidden: true } }, { display: 'none' }),
      ]),
      on('toggle', [
        rule({
          all: web('unset'),
          /* `all: unset` takes the `border-box` every shadow root is given. */
          boxSizing: 'border-box',
          alignItems: 'center',
          blockSize: token('size-control'),
          borderRadius: token('radii-sm'),
          color: token('color-foreground-muted'),
          cursor: web('pointer'),
          display: 'inline-flex',
          inlineSize: token('size-control'),
          justifyContent: 'center',
        }),
        /* At the start, the toggle leads the brand by the gap the actions keep. */
        rule({ within: 'start' }, { marginInlineEnd: token('space-xs') }),
        rule([{ hover: true }, { state: 'open' }], {
          backgroundColor: mix(token('color-foreground'), 8, 'transparent'),
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
      on('toggle-mark', [rule({ blockSize: token('size-icon'), inlineSize: token('size-icon') })]),
    ]
  },
)
