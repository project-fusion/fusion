import { fn, list, product, scheme, sum, token } from '../../../style.js'
import { styles } from '../../../table.js'
import { prop } from '../../../tree.js'
import root from './headless.js'

/**
 * Card's styled tier, which writes `helix/styled/src/card/root/card-root.generated.css`.
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
    hooks: [
      'align',
      'backdrop',
      'background-color',
      'border-color',
      'border-width',
      'color',
      'gap',
      'heading-color',
      'line-height',
      'media-block-size',
      'media-fit',
      'media-size',
      'padding',
      'radius',
      'shadow',
    ],
    own: ['card-inset', 'card-media', 'heading-ink'],
    props: [
      prop('material', ['frosted', 'glass', 'transparent']),
      prop('orientation', ['horizontal', 'vertical']),
      prop('separation', ['elevated', 'filled', 'outlined', 'plain']),
    ],
    stylesheet: 'card/root/card-root.generated.css',
  },
  ({ hook, on, own, rule, variants }) => [
    on('host', [
      rule({
        backgroundColor: hook.backgroundColor(token('color-surface')),
        border: [
          hook.borderWidth(token('border-surface')),
          'solid',
          hook.borderColor(token('color-border')),
        ],
        borderRadius: hook.radius(token('radii-lg')),
        boxShadow: hook.shadow(token('shadow-surface')),
        color: hook.color(token('color-foreground-muted')),
        alignContent: hook.align('start'),
        display: 'grid',
        gap: hook.gap(token('space-sm')),
        gridTemplateColumns: 'minmax(0, 1fr)',
        lineHeight: hook.lineHeight(token('leading-normal')),
        overflow: 'hidden',
        padding: own.inset,
        transition: list(
          ['border-color', token('duration-fast'), token('easing-standard')],
          ['box-shadow', token('duration-fast'), token('easing-standard')],
        ),
        own: {
          inset: hook.padding(token('space-control')),
          media: hook.mediaSize('12rem'),
          headingInk: hook.headingColor(token('color-foreground')),
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
        { paddingInlineStart: sum(own.media, own.inset), position: 'relative' },
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
        blockSize: hook.mediaBlockSize('auto'),
        display: 'block',
        inlineSize: sum('100%', product(own.inset, 2)),
        margin: product(own.inset, '-1'),
        marginBlockEnd: 0,
        objectFit: hook.mediaFit('cover'),
      }),
      rule(
        { 'media-placement': 'end' },
        { marginBlockEnd: product(own.inset, '-1'), marginBlockStart: 0, order: 1 },
      ),
      rule(
        { orientation: 'horizontal' },
        {
          blockSize: '100%',
          inlineSize: own.media,
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
      rule({ within: 'footer-row', platform: 'native' }, { justifySelf: 'auto' }),
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
          gap: hook.gap(token('space-sm')),
          minInlineSize: 0,
        }),
      ],
    ),
    /* The actions are always in a row of their own, where `justify-self`
       places nothing: the web keeps it from before rows were drawn. */
    on({ region: ['header-actions', 'footer-actions'], slotted: '*' }, [
      rule({ flex: 'none' }),
      rule({ platform: 'web' }, { justifySelf: 'end' }),
      rule(
        { defined: false },
        { alignSelf: 'center', gridColumn: 2, marginInlineStart: hook.gap(token('space-sm')) },
      ),
    ]),
    on({ region: 'footer-actions', slotted: '*' }, [
      rule({ within: 'footer-row' }, { marginInlineStart: 'auto' }),
    ]),
    on({ region: '*', slotted: '*' }, [rule({ defined: false }, { gridColumn: '1 / -1' })]),
    on({ region: ['header', 'footer'], slotted: '*' }, [
      rule({ defined: false }, { gridColumn: 1 }),
    ]),
  ],
)
