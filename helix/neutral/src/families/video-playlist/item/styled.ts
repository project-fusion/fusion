import { list, native, product, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import item from './headless.js'

/** The picture's own box, filled and cropped. */
const filled = {
  blockSize: '100%',
  display: 'block',
  inlineSize: '100%',
  objectFit: 'cover',
} as const

/**
 * A playlist entry's styled tier.
 *
 * **A row with its thumbnail and its name**, a press the width of the list.
 * The entry playing takes the well's fill and a bar in the primary color at
 * its start, its hover a wash relative to what the playlist sits on. A
 * disabled entry is dimmed, and an entry being dragged is faded, with a line
 * over the edge it would land on.
 */
export default styles(
  item,
  {
    prefix: 'video-playlist',
    hooks: {
      itemBackgroundColor: 'transparent',
      itemColor: token('color-foreground'),
      itemCurrentBackgroundColor: token('color-well'),
      itemCurrentMarkColor: token('color-primary'),
      itemGap: token('space-sm'),
      itemHoverBackgroundColor: token('color-hover'),
      itemMetaColor: token('color-foreground-muted'),
      itemPaddingBlock: token('space-2xs'),
      itemPaddingInlineEnd: token('space-2xs'),
      itemPaddingInlineStart: token('space-sm'),
      itemRadius: token('radii-sm'),
      mediaAspectRatio: '16 / 9',
      mediaRadius: token('radii-sm'),
      mediaSize: '5rem',
    },
    stylesheet: 'video-playlist/item/video-playlist-item.generated.css',
  },
  ({ hook, on, rule }) => [
    on('host', [rule({ display: 'block' })]),
    on('item', [
      web([rule({ all: 'unset' })]),
      rule({
        boxSizing: 'border-box',
        alignItems: 'center',
        backgroundColor: hook.itemBackgroundColor,
        borderRadius: hook.itemRadius,
        display: 'flex',
        gap: hook.itemGap,
        inlineSize: '100%',
        padding: [
          hook.itemPaddingBlock,
          hook.itemPaddingInlineEnd,
          hook.itemPaddingBlock,
          hook.itemPaddingInlineStart,
        ],
        position: 'relative',
        textAlign: 'start',
        transition: list(
          ['background-color', token('duration-fast'), token('easing-standard')],
          ['color', token('duration-fast'), token('easing-standard')],
        ),
        web: { cursor: 'pointer' },
      }),
      native([rule({ flexDirection: 'row' })]),
      web([
        rule(
          { focusVisible: true },
          {
            outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
            outlineOffset: product(token('size-focus-offset'), '-1'),
          },
        ),
      ]),
      rule(
        { current: true },
        { backgroundColor: hook.itemCurrentBackgroundColor, color: token('color-foreground') },
      ),
      /* Under the pointer, the entry playing too, as the hover's own fill. */
      web([
        rule({ disabled: false, hover: true }, { backgroundColor: hook.itemHoverBackgroundColor }),
      ]),
      rule(
        { disabled: true },
        { opacity: token('opacity-disabled'), web: { cursor: 'not-allowed' } },
      ),
    ]),
    /* The bar beside the entry that is playing. */
    on({ before: 'item' }, [
      rule(
        { current: true },
        {
          backgroundColor: hook.itemCurrentMarkColor,
          borderRadius: token('radii-full'),
          content: '""',
          inlineSize: token('border-thick'),
          insetBlock: token('space-2xs'),
          insetInlineStart: token('space-2xs'),
          position: 'absolute',
        },
      ),
    ]),
    on('host', [
      rule({ dragging: true }, { opacity: 0.5 }),
      web([rule([{ dropBefore: true }, { dropAfter: true }], { position: 'relative' })]),
    ]),
    on({ before: 'host' }, [
      web([
        rule([{ dropBefore: true }, { dropAfter: true }], {
          backgroundColor: token('color-primary'),
          blockSize: token('border-thick'),
          content: '""',
          insetInline: 0,
          pointerEvents: 'none',
          position: 'absolute',
          zIndex: 1,
        }),
        rule({ dropBefore: true }, { insetBlockStart: 0 }),
        rule({ dropAfter: true }, { insetBlockEnd: 0 }),
      ]),
    ]),
    on('media', [
      rule({
        aspectRatio: hook.mediaAspectRatio,
        borderRadius: hook.mediaRadius,
        flex: [0, 0, 'auto'],
        inlineSize: hook.mediaSize,
        overflow: 'hidden',
      }),
    ]),
    on({ region: 'media', slotted: '*' }, [rule(filled)]),
    on('thumbnail', [rule(filled)]),
    on('label', [
      rule({
        color: hook.itemColor,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: token('font-sans'),
        fontSize: token('text-sm'),
        fontWeight: token('weight-medium'),
        gap: token('space-2xs'),
        lineHeight: token('leading-tight'),
        minInlineSize: 0,
      }),
    ]),
    on({ region: 'meta', slotted: '*' }, [
      rule({
        color: hook.itemMetaColor,
        fontSize: token('text-xs'),
        fontWeight: token('weight-regular'),
      }),
    ]),
  ],
)
