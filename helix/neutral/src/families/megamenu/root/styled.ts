import {
  difference,
  fn,
  list,
  measured,
  mix,
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
    hooks: [
      'backdrop',
      'background-color',
      'border-width',
      'column-size',
      'duration',
      'full-size',
      'gap',
      'padding',
      'shadow',
      'size',
      'trigger-color',
      'trigger-font-size',
      'trigger-font-weight',
      'trigger-hover-color',
      'trigger-open-background-color',
      'trigger-open-color',
      'trigger-padding-inline',
      'trigger-radius',
    ],
    stylesheet: 'megamenu/root/megamenu-root.generated.css',
  },
  ({ hook, on, rule }) => {
    const slow = hook.duration(token('duration-slow'))
    const fast = token('duration-fast')
    const fill = hook.backgroundColor(token('color-background'))
    const filter = hook.backdrop('none')
    const columns = fn('minmax', hook.columnSize('15rem'), '1fr')
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
          all: web('unset'),
          boxSizing: 'border-box',
          alignItems: 'center',
          borderRadius: hook.triggerRadius(token('radii-sm')),
          color: hook.triggerColor(token('color-foreground-muted')),
          cursor: web('pointer'),
          display: 'inline-flex',
          fontFamily: token('font-sans'),
          fontSize: hook.triggerFontSize(token('text-sm')),
          fontWeight: hook.triggerFontWeight(token('weight-medium')),
          gap: token('space-2xs'),
          minBlockSize: token('size-control-tight'),
          paddingInline: hook.triggerPaddingInline(token('space-xs')),
          transition: list(
            ['background-color', fast, token('easing-standard')],
            ['color', fast, token('easing-standard')],
          ),
        }),
        rule({ hover: true }, { color: hook.triggerHoverColor(token('color-foreground')) }),
        rule(
          { focusVisible: true },
          {
            outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
            outlineOffset: token('size-focus-offset'),
          },
        ),
        /* Open reads like the current destination. */
        rule(
          { state: 'open' },
          {
            backgroundColor: hook.triggerOpenBackgroundColor(
              mix(token('color-foreground'), 8, 'transparent'),
            ),
            color: hook.triggerOpenColor(token('color-foreground')),
          },
        ),
        rule({ reducedMotion: true }, { transition: 'none' }),
      ]),
      on('surface', [
        rule({
          backdropFilter: filter,
          backgroundColor: fill,
          /* A hairline in the dark, nothing in the light. */
          border: [
            hook.borderWidth(token('border-floating')),
            'solid',
            scheme('transparent', token('color-border')),
          ],
          borderRadius: token('radii-sm'),
          boxShadow: hook.shadow(token('shadow-floating')),
          boxSizing: 'border-box',
          /* Laid out at full size and revealed top to bottom. */
          clipPath: fn('inset', [0, out, '100%', out]),
          display: 'grid',
          gap: hook.gap(token('space-xl')),
          gridAutoColumns: columns,
          gridAutoFlow: 'column',
          inlineSize: web('max-content'),
          margin: token('space-none'),
          maxInlineSize: web(
            fn('min', hook.size('52rem'), difference('100%', product(token('space-xl'), 2))),
          ),
          padding: hook.padding(token('space-md')),
          transition: list(
            ['clip-path', slow, token('easing-decelerate')],
            ['display', slow, 'allow-discrete'],
            ['overlay', slow, 'allow-discrete'],
          ),
        }),
        rule({ state: 'open' }, { clipPath: fn('inset', [0, out, out, out]) }),
        rule({ entering: true, state: 'open' }, { clipPath: fn('inset', [0, out, '100%', out]) }),
        /* A card grows out of the corner it hangs from, rightwards and
           downwards, where a band sweeps down across its whole width. */
        rule(
          { platform: 'web', variant: { not: 'band' } },
          {
            clipPath: fn('inset', [0, '100%', '100%', out]),
          },
        ),
        rule(
          { platform: 'web', state: 'open', variant: { not: 'band' } },
          { clipPath: fn('inset', [0, out, out, out]) },
        ),
        rule(
          { entering: true, platform: 'web', state: 'open', variant: { not: 'band' } },
          { clipPath: fn('inset', [0, '100%', '100%', out]) },
        ),
        /* A band from edge to edge, under `variant="band"` and in a narrow
           page. */
        rule([{ variant: 'band' }, { state: 'narrow' }], {
          ...band,
          paddingInline: web(
            fn('max', token('space-xl'), quotient(difference('100%', hook.fullSize('80rem')), 2)),
          ),
          position: web('fixed'),
        }),
        rule([{ state: 'open', variant: 'band' }, { state: ['narrow', 'open'] }], {
          clipPath: fn('inset', [0, 0, out, 0]),
        }),
        rule(
          [
            { entering: true, state: 'open', variant: 'band' },
            { entering: true, state: ['narrow', 'open'] },
          ],
          { clipPath: fn('inset', [0, 0, '100%', 0]) },
        ),
        /* A phone draws the band whatever the variant, which its layer
           stands under the trigger across the window. */
        rule({ platform: 'native' }, { ...band, paddingInline: token('space-xl') }),
        rule({ platform: 'native', state: 'open' }, { clipPath: fn('inset', [0, 0, out, 0]) }),
        rule(
          { entering: true, platform: 'native', state: 'open' },
          { clipPath: fn('inset', [0, 0, '100%', 0]) },
        ),
        /* A column does not shrink past `--megamenu-column-size`, so in a
           narrow page the groups stand in one column, to the bottom of the
           window less where the band starts and a margin. */
        rule(
          { state: 'narrow' },
          {
            gridAutoFlow: 'row',
            gridTemplateColumns: '1fr',
            overflowY: 'auto',
            overscrollBehavior: web('contain'),
            paddingInline: token('space-md'),
          },
        ),
        rule(
          { platform: 'web', state: 'narrow' },
          {
            maxBlockSize: difference(
              difference('100dvh', measured('megamenu-top', '0px')),
              token('space-xl'),
            ),
          },
        ),
        rule(
          { platform: 'native', state: 'narrow' },
          {
            maxBlockSize: difference(
              measured('floating-available-block-size', '100dvh'),
              token('space-xl'),
            ),
          },
        ),
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
        rule(
          { platform: 'web', supports: 'not (overlay: auto)' },
          { transitionBehavior: 'normal' },
        ),
      ]),
      /* Every rule giving the panel a display overrules the UA's own hide. */
      on({ part: 'surface', selector: ':host [part="surface"][hidden]' }, [
        rule({ platform: 'web' }, { display: 'none' }),
      ]),
    ]
  },
)
