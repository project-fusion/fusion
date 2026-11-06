import { oneOf } from '../../../render.js'
import {
  first,
  fn,
  hookOf,
  list,
  mix,
  native,
  product,
  scheme,
  sum,
  token,
  web,
} from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * Card's styled tier.
 *
 * **The host is the surface**: a grid of one column, with one inset for every
 * region so they narrow together, packed at the top with the slack at the
 * bottom. The media is the one region that escapes the inset.
 *
 * **A lift in the light, and a hairline in the dark**, under `elevated`,
 * because a shadow is a light-mode device. `filled` is told apart by its own
 * color, and `plain` has no frame. **`outlined` is an edge and no fill**, so the
 * page shows through, and an unset card keeps its fill inside the same edge. A
 * `material` comes after and still sets the fill.
 *
 * **Served, the actions stand at the end of their line already.** Before the
 * element is defined there is no row around them, so the card is a grid of
 * two columns. A phone's view is never undefined, and draws none of it.
 *
 * **What a card holds steps off it**: inside an elevated card, in dark, the
 * surfaces, the overlay and the lines restate themselves a step above its
 * fill, as Dialog's do, and inside an unset or filled card the lines and the
 * filled wash do. Nothing inside is rounder than the small radius. A ghost
 * button among the actions stands its words on the card's inset.
 *
 * **Glass is a pair**: a backdrop filter behind a translucent ground, which a
 * phone draws through expo-blur, as the native README says.
 */
export default styles(
  root,
  {
    prefix: 'card',
    hooks: {
      align: 'start',
      backdrop: null,
      backgroundColor: null,
      borderColor: token('color-border'),
      borderWidth: token('border-surface'),
      color: token('color-foreground-muted'),
      gap: token('space-field'),
      headingColor: token('color-foreground'),
      lineHeight: token('leading-normal'),
      mediaBlockSize: 'auto',
      mediaFit: 'cover',
      mediaSize: '12rem',
      padding: token('space-control'),
      radius: token('radii-md'),
      shadow: token('shadow-surface'),
    },
    own: {
      cardCorner: null,
      cardFill: null,
      cardGap: null,
      cardGround: null,
      cardInset: null,
      cardLine: null,
      cardMedia: null,
      cardNest: null,
      cardOverlay: null,
      cardRaised: null,
      cardSurface: null,
      headingInk: null,
    },
    props: {
      material: oneOf(['frosted', 'glass', 'transparent']),
      orientation: oneOf(['horizontal', 'vertical']),
      separation: oneOf(['elevated', 'filled', 'outlined', 'plain']),
    },
    stylesheet: 'card/root/card-root.generated.css',
  },
  ({ hook, on, own, rule, variants }) => [
    on('host', [
      rule({
        backgroundColor: hook.backgroundColor(token('color-surface')),
        border: [hook.borderWidth, 'solid', hook.borderColor],
        borderRadius: own.cardCorner,
        boxShadow: hook.shadow,
        color: hook.color,
        alignContent: hook.align,
        display: 'grid',
        gap: own.cardGap,
        gridTemplateColumns: 'minmax(0, 1fr)',
        lineHeight: hook.lineHeight,
        /* It clips a long unbroken word too, so the word breaks. */
        overflow: 'hidden',
        web: { overflowWrap: 'anywhere' },
        padding: own.cardInset,
        transition: list(
          ['border-color', token('duration-fast'), token('easing-standard')],
          ['box-shadow', token('duration-fast'), token('easing-standard')],
        ),
        own: {
          cardCorner: hook.radius,
          cardFill: hook.backgroundColor(token('color-surface')),
          cardGap: hook.gap,
          cardInset: hook.padding,
          cardLine: token('color-border'),
          cardOverlay: token('color-surface-overlay'),
          cardMedia: hook.mediaSize,
          headingInk: hook.headingColor,
        },
      }),
      variants('separation', {
        elevated: {
          /* A hairline of the ink under the lift in light, so a white card on a white
             page has an edge; dark draws its own border. */
          '--card-shadow': list(
            [
              0,
              0,
              0,
              token('border-thin'),
              scheme(mix(token('color-foreground'), 8, 'transparent'), 'transparent'),
            ],
            token('shadow-md'),
          ),
          borderColor: scheme('transparent', token('color-border')),
        },
        /* `surface-filled`, a wash that steps off whatever the card is on, and again
           inside another filled card. */
        filled: {
          '--card-shadow': 'none',
          backgroundColor: hook.backgroundColor(token('color-surface-filled')),
          borderColor: 'transparent',
        },
        outlined: { backgroundColor: hook.backgroundColor('transparent') },
        plain: {
          '--card-shadow': 'none',
          backgroundColor: 'transparent',
          borderColor: 'transparent',
        },
      }),
      /* Served, before the element is defined: two columns, the actions in
         the second, beside what they belong to. */
      rule(
        { defined: false },
        { columnGap: token('space-none'), gridTemplateColumns: 'minmax(0, 1fr) auto' },
      ),
      /* Sideways: the same stack, with the media out of flow beside it. */
      rule(
        { orientation: 'horizontal' },
        { paddingInlineStart: sum(own.cardMedia, own.cardInset), position: 'relative' },
      ),
      rule({ reducedMotion: true }, { transition: 'none' }),
      variants('material', {
        glass: {
          /* Full ink: muted ink over a busy page falls under 4.5:1 through glass. */
          backdropFilter: hook.backdrop(token('material-backdrop')),
          backgroundColor: hook.backgroundColor(token('material-panel')),
        },
        frosted: {
          backdropFilter: hook.backdrop(fn('blur', token('material-blur-lg'))),
          backgroundColor: hook.backgroundColor(token('material-translucent-strong')),
        },
        transparent: { backdropFilter: 'none', backgroundColor: 'transparent' },
      }),
      /* Elevated, the fill is the nesting card's overlay rung in light, and the
         overlay in dark. */
      web([
        rule(
          { separation: 'elevated' },
          {
            own: {
              cardGround: hook.backgroundColor(
                scheme(own.cardNest(token('color-surface')), token('color-surface-overlay')),
              ),
              cardRaised: token('color-surface-raised'),
              cardSurface: token('color-surface'),
            },
            backgroundColor: own.cardGround,
          },
        ),
      ]),
      /* The lift is a shadow, which printers drop into a gray smear, and the
         edge carries it. */
      rule({ print: true }, { backgroundColor: 'transparent', boxShadow: 'none' }),
    ]),
    /* Media runs edge to edge, outside the inset. */
    on({ region: 'media', slotted: '*' }, [
      rule({
        blockSize: hook.mediaBlockSize,
        display: 'block',
        inlineSize: sum('100%', product(own.cardInset, 2)),
        margin: product(own.cardInset, '-1'),
        marginBlockEnd: 0,
        objectFit: hook.mediaFit,
      }),
      rule(
        { mediaPlacement: 'end' },
        { marginBlockEnd: product(own.cardInset, '-1'), marginBlockStart: 0, order: 1 },
      ),
      rule(
        { orientation: 'horizontal' },
        {
          blockSize: '100%',
          inlineSize: own.cardMedia,
          insetBlock: 0,
          insetInlineStart: 0,
          margin: token('space-none'),
          position: 'absolute',
        },
      ),
    ]),
    /* The header reads as the card's own voice. */
    on({ region: 'header', slotted: '*' }, [
      rule({ color: own.headingInk }),
      rule({ within: 'header-row' }, { flex: '1 1 auto', minInlineSize: 0 }),
    ]),
    on({ region: 'footer', slotted: '*' }, [
      rule({ justifySelf: 'end' }),
      /* In its row, the footer sits on the row's center line, where a phone
         would read `justify-self` as an alignment across the row. */
      native([rule({ within: 'footer-row' }, { justifySelf: 'auto' })]),
    ]),
    /* A line of its own, with its actions at the end, which a narrow card
       puts under what they belong to. */
    on(
      ['header-row', 'footer-row'],
      [
        rule({
          alignItems: 'center',
          display: 'flex',
          flexWrap: 'wrap',
          gap: own.cardGap,
          minInlineSize: 0,
        }),
      ],
    ),
    on({ region: 'footer-actions', slotted: '*' }, [
      rule({ within: 'footer-row' }, { marginInlineStart: 'auto' }),
    ]),
    on({ region: '*', slotted: '*' }, [rule({ defined: false }, { gridColumn: '1 / -1' })]),
    on({ region: ['header', 'footer'], slotted: '*' }, [
      rule({ defined: false }, { gridColumn: 1 }),
    ]),
    /* The actions are always in a row of their own, where `justify-self`
       places nothing: the web keeps it from before rows were drawn. Last, so
       their place before the upgrade stands over every region's and the
       footer row's. */
    on({ region: ['header-actions', 'footer-actions'], slotted: '*' }, [
      rule({ flex: 'none' }),
      web([rule({ justifySelf: 'end' })]),
      rule({ defined: false }, { alignSelf: 'center', gridColumn: 2, marginInlineStart: hook.gap }),
    ]),
    /* What the card holds steps off it in dark, its rungs a step above the fill. */
    on({ region: '*' }, [
      web([
        rule(
          { separation: 'elevated' },
          {
            own: { cardNest: own.cardOverlay },
            '--helix-color-surface-overlay': scheme(
              own.cardOverlay,
              mix(token('color-foreground'), 12, own.cardGround),
            ),
            '--helix-color-surface-raised': scheme(
              own.cardRaised,
              mix(token('color-foreground'), 9, own.cardGround),
            ),
            '--helix-color-surface': scheme(
              own.cardSurface,
              mix(token('color-foreground'), 3, own.cardGround),
            ),
            '--helix-color-surface-filled': scheme(
              mix(token('color-foreground'), 5, 'transparent'),
              mix(token('color-foreground'), 6, 'transparent'),
            ),
            '--helix-color-border': scheme(
              mix(token('color-foreground'), 7, own.cardGround),
              mix(token('color-foreground'), 12, own.cardGround),
            ),
          },
        ),
        rule(
          { material: false, separation: false },
          {
            own: { cardNest: own.cardOverlay },
            '--helix-color-border': scheme(
              mix(token('color-foreground'), 7, own.cardFill),
              mix(token('color-foreground'), 14, own.cardFill),
            ),
            '--helix-color-surface-overlay': scheme(
              own.cardOverlay,
              mix(token('color-foreground'), 12, own.cardFill),
            ),
            '--helix-color-surface-filled': scheme(
              mix(token('color-foreground'), 5, 'transparent'),
              mix(token('color-foreground'), 6, 'transparent'),
            ),
          },
        ),
        rule(
          { material: false, separation: 'filled' },
          {
            '--helix-color-border': scheme(
              mix(token('color-foreground'), 5, own.cardLine),
              mix(token('color-foreground'), 6, own.cardLine),
            ),
          },
        ),
        /* Nothing inside is rounder than the small radius, or than the card. */
        rule(
          { separation: { not: 'plain' } },
          { '--helix-radii-md': fn('min', token('radii-sm'), own.cardCorner) },
        ),
      ]),
    ]),
    /* A ghost button among the actions stands its words on the card's inset. */
    on(
      {
        region: ['footer', 'header-actions', 'footer-actions'],
        slotted: 'helix-button[emphasis="ghost"]',
      },
      [
        web([
          rule({
            marginInlineEnd: product(
              first(hookOf('button', 'padding-inline'), token('space-control')),
              '-1',
            ),
          }),
        ]),
      ],
    ),
    on({ region: 'footer', slotted: 'helix-button[emphasis="ghost"]' }, [
      web([
        rule(
          { within: 'footer-row' },
          {
            marginInline: [
              product(first(hookOf('button', 'padding-inline'), token('space-control')), '-1'),
              0,
            ],
          },
        ),
      ]),
    ]),
  ],
)
