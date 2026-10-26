import { oneOf } from '../../../render.js'
import {
  difference,
  fn,
  list,
  measured,
  mix,
  product,
  safeArea,
  scheme,
  sum,
  token,
  web,
} from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * Menu's styled tier, which writes
 * `helix/styled/src/menu/root/menu-root.generated.css`.
 *
 * **The panel is the floating surface**, with its edge, its shadow and the
 * house radius, at least `12rem` wide, and compact by nature: it sets the
 * small control and icon sizes for what it holds. It scrolls where it is
 * taller than the room below the trigger. The inset is the rows', so a
 * row's light reaches the panel's edges. `glass` and `frosted` are the
 * translucent grounds over the theme's blur, which a row's flyout reads too.
 *
 * **A page keeps a column before its labels and one after them** only while
 * a row on it fills one: something before its label, and a check or a
 * caret after it. The panel hands each row the two widths.
 *
 * **It grows out of the side it opened on**, from a little smaller and a
 * little toward its trigger, once it is placed, and arrives at once under
 * reduced motion. **As a sheet it stands on the window's bottom edge**, as
 * wide as the window, square where it meets the edge, its last row clear of
 * the home indicator, over a scrim, and it rises from under the edge. The
 * header over a page below the top holds the way back
 * and the page's name. The words shown in place of rows are quiet and
 * centered, and rows that are already there dim while new ones load. Print
 * leaves the menu out, and is the web's.
 */
export default styles(
  root,
  {
    prefix: 'menu',
    hooks: {
      backdrop: null,
      backgroundColor: null,
      borderColor: null,
      borderWidth: null,
      maxBlockSize: null,
      minInlineSize: null,
      scrim: null,
      shadow: null,
    },
    own: {
      menuFrom: null,
      menuMaterialBackdrop: null,
      menuMaterialFill: null,
      menuSectionHeading: null,
      menuTravel: null,
    },
    props: { material: oneOf(['frosted', 'glass']) },
    stylesheet: 'menu/root/menu-root.generated.css',
  },
  ({ hook, on, own, rule, variants }) => {
    const fast = token('duration-fast')
    const ring = [token('size-focus-ring'), 'solid', token('color-focus-ring')] as const
    const column = sum(token('size-icon'), token('space-xs'))
    const hover = mix(token('color-foreground'), 8, 'transparent')
    return [
      /* No box of its own: the trigger is passed in and the panel is in the top layer. */
      on('host', [rule({ display: 'contents' }), rule({ print: true }, { display: 'none' })]),
      /* The trigger's box on a phone, as wide as the trigger, which the panel is placed against. */
      on('trigger', [rule({ platform: 'native' }, { inlineSize: 'fit-content' })]),
      on('surface', [
        rule({
          backgroundColor: hook.backgroundColor(token('color-surface-overlay')),
          border: [
            hook.borderWidth(token('border-floating')),
            'solid',
            hook.borderColor(token('color-border')),
          ],
          borderRadius: token('radii-sm'),
          boxShadow: hook.shadow(token('shadow-floating')),
          inset: web('auto'),
          margin: token('space-none'),
        }),
        /* A sheet stands on the window's bottom edge, square where it meets it. */
        rule(
          { sheet: true },
          {
            borderEndEndRadius: token('radii-none'),
            borderEndStartRadius: token('radii-none'),
            insetBlockEnd: web(0),
            insetInline: web(0),
          },
        ),
      ]),
      /* Closed, by the server's `hidden` and by the popover's own closed state. */
      on('surface', [rule({ part: { hidden: true }, platform: 'web' }, { display: 'none' })]),
      /* Written out: the vocabulary names no `:popover-open`. */
      on({ part: 'surface', selector: '[part="surface"]:not(:popover-open)' }, [
        rule({ platform: 'web' }, { display: 'none' }),
      ]),
      /* It travels a little out of the edge it opened against, once placed. */
      on('surface', [
        rule({
          own: { menuTravel: product(token('space-2xs'), '-1'), menuFrom: 0.96 },
          opacity: 0,
          scale: own.menuFrom,
          transform: fn('translateY', own.menuTravel),
          transition: list(
            ['opacity', fast, token('easing-standard')],
            ['scale', fast, token('easing-emphasized')],
            ['transform', fast, token('easing-emphasized')],
            ['display', fast, 'allow-discrete'],
            ['overlay', fast, 'allow-discrete'],
          ),
        }),
        rule(
          { placedTop: true },
          {
            own: { menuTravel: token('space-2xs') },
            transformOrigin: [measured('floating-arrow-x', '50%'), '100%'],
          },
        ),
        rule({ placedBottom: true }, { transformOrigin: [measured('floating-arrow-x', '50%'), 0] }),
        /* A sheet rises from under the edge. */
        rule({ sheet: true }, { own: { menuFrom: 1, menuTravel: '100%' } }),
        rule({ part: { 'data-placed': true } }, { opacity: 1, scale: 1, transform: 'none' }),
        rule(
          { reducedMotion: true },
          {
            scale: 1,
            transform: 'none',
            transition: 'none',
          },
        ),
        rule(
          { platform: 'web', supports: 'not (overlay: auto)' },
          { transitionBehavior: 'normal' },
        ),
      ]),
      on('surface', [
        rule({
          '--helix-size-control': token('size-control-sm'),
          '--helix-size-control-loose': product(token('size-control'), 1.2),
          '--helix-size-control-tight': product(token('size-control'), 0.8),
          '--helix-size-icon': token('size-icon-sm'),
          '--helix-size-icon-loose': product(token('size-icon'), 1.2),
          '--helix-size-icon-tight': product(token('size-icon'), 0.8),
          '--menu-item-start': '0px',
          '--menu-item-end': '0px',
          maxBlockSize: hook.maxBlockSize(measured('floating-available-block-size', 'none')),
          overflowY: 'auto',
          minInlineSize: hook.minInlineSize('12rem'),
          paddingBlock: token('space-xs'),
          paddingInline: token('space-none'),
        }),
        /* A sheet is as wide as the window, never taller than most of it, and
           its last row is clear of the home indicator. */
        rule(
          { sheet: true },
          {
            inlineSize: web('auto'),
            maxBlockSize: hook.maxBlockSize(difference('100dvh', token('space-3xl'))),
            maxInlineSize: web('none'),
            paddingBlockEnd: sum(token('space-xs'), safeArea('bottom')),
          },
        ),
        variants('material', {
          glass: {
            own: {
              menuMaterialFill: scheme(
                token('material-translucent-strong'),
                token('material-translucent'),
              ),
              menuMaterialBackdrop: hook.backdrop(token('material-backdrop')),
            },
            backgroundColor: hook.backgroundColor(own.menuMaterialFill),
            backdropFilter: own.menuMaterialBackdrop,
          },
          frosted: {
            own: {
              menuMaterialFill: token('material-translucent-strong'),
              menuMaterialBackdrop: hook.backdrop(fn('blur', token('material-blur-lg'))),
            },
            backgroundColor: hook.backgroundColor(own.menuMaterialFill),
            backdropFilter: own.menuMaterialBackdrop,
          },
        }),
        /* A row on the page has a mark before its label, so every row on it
           keeps the column. */
        rule({ platform: 'web', start: true }, { '--menu-item-start': column }),
        rule({ platform: 'native', started: true }, { '--menu-item-start': column }),
        /* A row on the page can be ticked or opens a page. */
        rule({ platform: 'web', mark: true }, { '--menu-item-end': column }),
        rule({ platform: 'native', marked: true }, { '--menu-item-end': column }),
        /* Opening sideways, out of the edge it opened against. */
        rule(
          { placedLeft: true },
          { transformOrigin: ['100%', measured('floating-arrow-y', '50%')] },
        ),
        rule({ placedRight: true }, { transformOrigin: [0, measured('floating-arrow-y', '50%')] }),
      ]),
      /* The scrim behind a sheet, which fades in as it rises. */
      on({ backdrop: 'surface' }, [
        rule({
          opacity: 0,
          transition: list(
            ['opacity', fast, token('easing-standard')],
            ['display', fast, 'allow-discrete'],
            ['overlay', fast, 'allow-discrete'],
          ),
        }),
        rule({ sheet: true }, { backgroundColor: hook.scrim(token('color-overlay')) }),
        rule({ open: true, sheet: true }, { opacity: 1 }),
        rule({ startingStyle: true, open: true, sheet: true }, { opacity: 0 }),
        rule({ reducedMotion: true }, { transition: 'none' }),
        rule(
          { platform: 'web', supports: 'not (overlay: auto)' },
          { transitionBehavior: 'normal' },
        ),
      ]),
      /* The way back and the page's name, over the page. */
      on('header', [
        rule({
          alignItems: 'center',
          borderBlockEnd: [token('border-thin'), 'solid', token('color-border')],
          display: 'flex',
          gap: token('space-2xs'),
          marginBlockEnd: token('space-2xs'),
          padding: [token('space-2xs'), token('space-xs'), token('space-xs')],
        }),
      ]),
      on('back', [
        rule({
          alignItems: 'center',
          background: 'none',
          border: 'none',
          borderRadius: token('radii-sm'),
          color: token('color-foreground-muted'),
          web: { cursor: 'pointer' },
          display: 'inline-flex',
          justifyContent: 'center',
          blockSize: column,
          inlineSize: column,
          padding: token('space-none'),
        }),
      ]),
      on('back-mark', [
        rule({ blockSize: token('size-icon'), inlineSize: token('size-icon') }),
        /* The caret points back along the line, so it turns in a
           right-to-left page, as the web's mirror rule turns it. */
        rule({ dir: 'rtl', platform: 'native' }, { scale: '-1 1' }),
      ]),
      on('back', [
        rule({ hover: true }, { backgroundColor: hover, color: token('color-foreground') }),
        rule(
          { focusVisible: true },
          { outline: ring, outlineOffset: product(token('size-focus-offset'), '-1') },
        ),
      ]),
      on('title', [
        rule({
          color: token('color-foreground'),
          fontSize: token('text-xs'),
          fontWeight: token('weight-medium'),
        }),
      ]),
      /* A rule between runs of rows. */
      on({ region: 'default', slotted: 'helix-divider' }, [
        rule({ marginBlock: token('space-2xs') }),
      ]),
      /* What is not a row leaves with the top page. */
      /* Written out: a rule on what a region holds reads no state of the part around it. */
      on(
        {
          part: 'surface',
          selector: '[part="surface"][data-drilled] slot::slotted(:not(helix-menu-item))',
        },
        [rule({ platform: 'web' }, { display: 'none' })],
      ),
      /* A phone's sections and rules, which hold no row of a page below the top. */
      on({ region: 'default', slotted: 'helix-divider' }, [
        rule({ platform: 'native', drilled: true }, { display: 'none' }),
      ]),
      on({ region: 'default', slotted: 'helix-menu-section' }, [
        rule({ platform: 'native', drilled: true }, { own: { menuSectionHeading: 'none' } }),
      ]),
      /* What a collection says in place of rows, quiet and centered. */
      on(
        ['empty', 'loading'],
        [
          rule({
            color: token('color-foreground-muted'),
            fontFamily: token('font-sans'),
            fontSize: token('text-sm'),
            margin: token('space-none'),
            paddingBlock: token('space-md'),
            paddingInline: token('space-sm'),
            textAlign: 'center',
          }),
        ],
      ),
      /* Rows that are already there dim, and hold still, while new ones load. */
      on('surface', [rule({ loading: true }, { opacity: 0.5 })]),
    ]
  },
)
