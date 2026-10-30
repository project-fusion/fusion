import { oneOf } from '../../../render.js'
import { fn, list, native, product, scheme, sum, token, web } from '../../../style.js'
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
 * color, and `plain` has no frame.
 *
 * **Served, the actions stand at the end of their line already.** Before the
 * element is defined there is no row around them, so the card is a grid of
 * two columns. A phone's view is never undefined, and draws none of it.
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
      gap: token('space-sm'),
      headingColor: token('color-foreground'),
      lineHeight: token('leading-normal'),
      mediaBlockSize: 'auto',
      mediaFit: 'cover',
      mediaSize: '12rem',
      padding: token('space-control'),
      radius: token('radii-lg'),
      shadow: token('shadow-surface'),
    },
    own: { cardInset: null, cardMedia: null, headingInk: null },
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
        borderRadius: hook.radius,
        boxShadow: hook.shadow,
        color: hook.color,
        alignContent: hook.align,
        display: 'grid',
        gap: hook.gap,
        gridTemplateColumns: 'minmax(0, 1fr)',
        lineHeight: hook.lineHeight,
        overflow: 'hidden',
        padding: own.cardInset,
        transition: list(
          ['border-color', token('duration-fast'), token('easing-standard')],
          ['box-shadow', token('duration-fast'), token('easing-standard')],
        ),
        own: {
          cardInset: hook.padding,
          cardMedia: hook.mediaSize,
          headingInk: hook.headingColor,
        },
      }),
      variants('separation', {
        elevated: {
          '--card-shadow': token('shadow-md'),
          borderColor: scheme('transparent', token('color-border')),
        },
        filled: { '--card-shadow': 'none', borderColor: 'transparent' },
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
          backdropFilter: hook.backdrop(token('material-backdrop')),
          backgroundColor: hook.backgroundColor(token('material-translucent')),
        },
        frosted: {
          backdropFilter: hook.backdrop(fn('blur', token('material-blur-lg'))),
          backgroundColor: hook.backgroundColor(token('material-translucent-strong')),
        },
        transparent: { backdropFilter: 'none', backgroundColor: 'transparent' },
      }),
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
          gap: hook.gap,
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
  ],
)
