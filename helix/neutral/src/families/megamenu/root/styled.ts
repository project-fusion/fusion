import {
  difference,
  fn,
  list,
  measured,
  mix,
  native,
  product,
  quotient,
  scheme,
  token,
  web,
} from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/** The overshoot a reveal lets out past the panel's sides, so its shadow is not clipped. */
const out = product(token('space-xl'), '-1')

/**
 * Megamenu's styled tier, which writes
 * `helix/styled/src/megamenu/root/megamenu-root.generated.css`.
 *
 * **The trigger is shaped as a destination of the bar**, quiet at rest, at
 * full strength under the pointer, and lit as the current destination while
 * its panel is open. The mark passed into `indicator` rests on its bottom
 * edge, which the panel hangs from.
 *
 * **The panel is the page's ground, revealed top to bottom**, laid out at
 * full size so nothing inside moves. On the web it is a card hung off the
 * trigger, its groups side by side in columns, that grows out of the corner
 * it hangs from; under `variant="band"`, and in a page narrower than
 * `band-below`, a band from edge to edge under the bar. **A phone draws the
 * band**: its layer stands under the trigger across the window. Narrow, the
 * groups stand in one column and the band scrolls to the bottom of the
 * window. Under reduced motion it arrives at once. Print leaves it out, and
 * is the web's.
 */
export default styles(
  root,
  {
    prefix: 'megamenu',
    hooks: {
      backdrop: 'none',
      backgroundColor: token('color-background'),
      borderWidth: token('border-floating'),
      columnSize: '15rem',
      duration: token('duration-slow'),
      fullSize: '80rem',
      gap: token('space-xl'),
      padding: token('space-md'),
      shadow: token('shadow-floating'),
      size: '52rem',
      triggerColor: token('color-foreground-muted'),
      triggerFontSize: token('text-sm'),
      triggerFontWeight: token('weight-medium'),
      triggerHoverColor: token('color-foreground'),
      triggerOpenBackgroundColor: mix(token('color-foreground'), 8, 'transparent'),
      triggerOpenColor: token('color-foreground'),
      triggerPaddingInline: token('space-xs'),
      triggerRadius: token('radii-sm'),
    },
    stylesheet: 'megamenu/root/megamenu-root.generated.css',
  },
  ({ hook, on, rule }) => {
    const slow = hook.duration
    const fast = token('duration-fast')
    const fill = hook.backgroundColor
    const filter = hook.backdrop
    const columns = fn('minmax', hook.columnSize, '1fr')
    /* The band, from edge to edge under the bar: the header's ground, no
       edge, a shadow below only, the groups in tracks that line up row on
       row, and the page's measure held with padding. The web places it,
       fixed under the bar, and a phone's layer stands it under the trigger
       across the window. */
    const band = {
      backdropFilter: filter,
      backgroundColor: fill,
      border: 'none',
      borderRadius: token('radii-none'),
      boxShadow: token('shadow-md'),
      clipPath: fn('inset', [0, 0, '100%', 0]),
      display: 'grid',
      gridAutoFlow: 'row',
      gridTemplateColumns: fn('repeat', 'auto-fit', columns),
      inlineSize: 'auto',
      insetBlockStart: web(measured('megamenu-top', '100%')),
      insetInline: web(0),
      maxInlineSize: 'none',
      paddingBlock: [token('space-md'), token('space-xl')],
    }
    return [
      /* A box, unlike `Menu`: `Navigation` measures its marker against every
         destination, and positioned, so the indicator hangs off it. */
      on('host', [
        rule({ display: 'inline-flex', position: 'relative' }),
        rule({ print: true }, { display: 'none' }),
      ]),
      /* The mark of an open trigger: out of the row, centered on the trigger
         and resting on its bottom edge. */
      on('indicator', [
        rule({
          alignItems: 'flex-end',
          display: 'flex',
          insetBlock: 0,
          insetInline: 0,
          justifyContent: 'center',
          pointerEvents: 'none',
          position: 'absolute',
        }),
      ]),
      /* The base layer's link shape by hand. */
      on('trigger', [
        rule({
          web: { all: 'unset', cursor: 'pointer' },
          boxSizing: 'border-box',
          alignItems: 'center',
          borderRadius: hook.triggerRadius,
          color: hook.triggerColor,
          display: 'inline-flex',
          fontFamily: token('font-sans'),
          fontSize: hook.triggerFontSize,
          fontWeight: hook.triggerFontWeight,
          gap: token('space-2xs'),
          minBlockSize: token('size-control-tight'),
          paddingInline: hook.triggerPaddingInline,
          transition: list(
            ['background-color', fast, token('easing-standard')],
            ['color', fast, token('easing-standard')],
          ),
        }),
        rule({ hover: true }, { color: hook.triggerHoverColor }),
        rule(
          { focusVisible: true },
          {
            outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
            outlineOffset: token('size-focus-offset'),
          },
        ),
        /* Open reads like the current destination. */
        rule(
          { open: true },
          {
            backgroundColor: hook.triggerOpenBackgroundColor,
            color: hook.triggerOpenColor,
          },
        ),
        rule({ reducedMotion: true }, { transition: 'none' }),
      ]),
      on('surface', [
        rule({
          backdropFilter: filter,
          backgroundColor: fill,
          /* A hairline in the dark, nothing in the light. */
          border: [hook.borderWidth, 'solid', scheme('transparent', token('color-border'))],
          borderRadius: token('radii-sm'),
          boxShadow: hook.shadow,
          boxSizing: 'border-box',
          /* Laid out at full size and revealed top to bottom. */
          clipPath: fn('inset', [0, out, '100%', out]),
          display: 'grid',
          gap: hook.gap,
          gridAutoColumns: columns,
          gridAutoFlow: 'column',
          inlineSize: web('max-content'),
          margin: token('space-none'),
          maxInlineSize: web(
            fn('min', hook.size, difference('100%', product(token('space-xl'), 2))),
          ),
          padding: hook.padding,
          transition: list(
            ['clip-path', slow, token('easing-decelerate')],
            ['display', slow, 'allow-discrete'],
            ['overlay', slow, 'allow-discrete'],
          ),
        }),
        rule({ open: true }, { clipPath: fn('inset', [0, out, out, out]) }),
        rule({ startingStyle: true, open: true }, { clipPath: fn('inset', [0, out, '100%', out]) }),
        /* A card grows out of the corner it hangs from, rightwards and
           downwards, where a band sweeps down across its whole width. */
        web([
          rule(
            { variant: { not: 'band' } },
            {
              clipPath: fn('inset', [0, '100%', '100%', out]),
            },
          ),
          rule(
            { open: true, variant: { not: 'band' } },
            { clipPath: fn('inset', [0, out, out, out]) },
          ),
          rule(
            { startingStyle: true, open: true, variant: { not: 'band' } },
            { clipPath: fn('inset', [0, '100%', '100%', out]) },
          ),
        ]),
        /* A band from edge to edge, under `variant="band"` and in a narrow
           page. */
        rule([{ variant: 'band' }, { narrow: true }], {
          ...band,
          web: {
            paddingInline: fn(
              'max',
              token('space-xl'),
              quotient(difference('100%', hook.fullSize), 2),
            ),
            position: 'fixed',
          },
        }),
        rule(
          [
            { open: true, variant: 'band' },
            { narrow: true, open: true },
          ],
          {
            clipPath: fn('inset', [0, 0, out, 0]),
          },
        ),
        rule(
          [
            { startingStyle: true, open: true, variant: 'band' },
            { startingStyle: true, narrow: true, open: true },
          ],
          { clipPath: fn('inset', [0, 0, '100%', 0]) },
        ),
        /* A phone draws the band whatever the variant, which its layer
           stands under the trigger across the window. */
        native([
          rule({ ...band, paddingInline: token('space-xl') }),
          rule({ open: true }, { clipPath: fn('inset', [0, 0, out, 0]) }),
          rule({ startingStyle: true, open: true }, { clipPath: fn('inset', [0, 0, '100%', 0]) }),
        ]),
        /* A column does not shrink past `--megamenu-column-size`, so in a
           narrow page the groups stand in one column, to the bottom of the
           window less where the band starts and a margin. */
        rule(
          { narrow: true },
          {
            gridAutoFlow: 'row',
            gridTemplateColumns: '1fr',
            overflowY: 'auto',
            web: { overscrollBehavior: 'contain' },
            paddingInline: token('space-md'),
          },
        ),
        web([
          rule(
            { narrow: true },
            {
              maxBlockSize: difference(
                difference('100dvh', measured('megamenu-top', '0px')),
                token('space-xl'),
              ),
            },
          ),
        ]),
        native([
          rule(
            { narrow: true },
            {
              maxBlockSize: difference(
                measured('floating-available-block-size', '100dvh'),
                token('space-xl'),
              ),
            },
          ),
        ]),
        /* The clip goes, the discrete pair stay: without them the panel sits
           in the top layer with nothing drawn. */
        rule(
          { reducedMotion: true },
          {
            clipPath: 'none',
            transition: list(
              ['display', token('duration-instant'), 'allow-discrete'],
              ['overlay', token('duration-instant'), 'allow-discrete'],
            ),
          },
        ),
        web([rule({ supports: 'not (overlay: auto)' }, { transitionBehavior: 'normal' })]),
      ]),
      /* Every rule giving the panel a display overrules the UA's own hide. */
      on('surface', [web([rule({ part: { hidden: true } }, { display: 'none' })])]),
    ]
  },
)
