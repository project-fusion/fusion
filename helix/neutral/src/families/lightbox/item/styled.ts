import { fn, measured, native, product, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import item from './headless.js'

/**
 * A lightbox item's styled tier.
 *
 * **The item is a column that centers what it holds** inside the viewer's
 * viewport, as large as the viewport and never larger, so a picture of any
 * size fits. The line under it is small and muted, and centered.
 *
 * **Zoomed, the web moves and scales it** by the scale and the offset the
 * viewer writes on the viewport, which are unset at the item's own size and
 * leave it no transform. A phone's viewer moves the items on the UI thread.
 */
export default styles(
  item,
  {
    prefix: 'lightbox-item',
    hooks: {
      descriptionColor: token('color-foreground-muted'),
      gap: token('space-sm'),
    },
    stylesheet: 'lightbox/item/lightbox-item.generated.css',
  },
  ({ hook, on, rule }) => [
    /* The host draws nothing: the item is the box inside it. */
    on('host', [rule({ display: 'contents' })]),
    on('item', [
      rule({
        alignItems: 'center',
        blockSize: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: hook.gap,
        inlineSize: '100%',
        justifyContent: 'center',
        minBlockSize: 0,
        minInlineSize: 0,
      }),
      rule({ hidden: true }, { display: 'none' }),
      web([
        rule({
          transform: [
            fn('translate', measured('lightbox-pan-x'), measured('lightbox-pan-y')),
            fn('scale', measured('lightbox-zoom')),
          ],
        }),
      ]),
      native([rule({ flexGrow: 1 })]),
    ]),
    /* Whatever was opened, held inside the viewport rather than sized by it. */
    on({ part: 'item', selector: '[part="item"] ::slotted(*)' }, [
      web([rule({ maxBlockSize: '100%', maxInlineSize: '100%', objectFit: 'contain' })]),
    ]),
    on({ region: 'default', slotted: '*' }, [
      native([rule({ maxBlockSize: '100%', maxInlineSize: '100%' })]),
    ]),
    on({ region: 'description', slotted: '*' }, [
      rule({
        color: hook.descriptionColor,
        fontSize: token('text-sm'),
        lineHeight: product(token('text-sm'), token('leading-normal')),
        textAlign: 'center',
      }),
    ]),
  ],
)
