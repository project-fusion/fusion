import { list, mix, product, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import item from './headless.js'

/**
 * A navigation item's styled tier, which writes
 * `helix/styled/src/navigation/item/navigation-item.generated.css`.
 *
 * **It draws what the `data-navigation-item` recipe gives a link of your
 * own**, hook for hook, so an item and a page's own link stand alike in one
 * bar. The host is the destination's box, which the navigation's mark
 * measures, and the link fills it.
 *
 * **What the navigation around it says comes in private values**: the
 * display and the start-aligned words of a column, and the floor a
 * segmented track takes away. The fallbacks are a destination in a bar.
 */
export default styles(
  item,
  {
    prefix: 'navigation-item',
    hooks: [
      'color',
      'current-color',
      'current-font-weight',
      'font-size',
      'font-weight',
      'hover-background-color',
      'hover-color',
      'padding-inline',
      'radius',
    ],
    own: ['navigation-item-display', 'navigation-item-floor', 'navigation-item-justify'],
    stylesheet: 'navigation/item/navigation-item.generated.css',
  },
  ({ hook, on, own, rule }) => [
    /* The destination's box: the bar's height, with a floor as well, since
       the share resolves only for a destination that is the bar's child. It
       stands above the mark, which sits behind every destination. */
    on('host', [
      rule({
        blockSize: '100%',
        display: own.display('inline-flex'),
        minBlockSize: own.floor(token('size-control-sm')),
        position: 'relative',
        zIndex: token('layer-raised'),
      }),
    ]),
    on('link', [
      rule({
        alignItems: 'center',
        backgroundColor: 'transparent',
        borderRadius: hook.radius(token('radii-sm')),
        color: hook.color(token('color-foreground-muted')),
        cursor: web('pointer'),
        display: 'flex',
        flexGrow: 1,
        fontFamily: token('font-sans'),
        fontSize: hook.fontSize(token('text-sm')),
        fontWeight: hook.fontWeight(token('weight-medium')),
        justifyContent: own.justify('center'),
        paddingInline: hook.paddingInline(token('space-sm')),
        textDecoration: 'none',
        transition: list(
          ['background-color', token('duration-fast'), token('easing-standard')],
          ['color', token('duration-fast'), token('easing-standard')],
        ),
        whiteSpace: 'nowrap',
      }),
      rule(
        { hover: true },
        {
          backgroundColor: hook.hoverBackgroundColor(
            mix(token('color-foreground'), 5, 'transparent'),
          ),
          color: hook.hoverColor(token('color-foreground')),
        },
      ),
      /* No surface of its own: the mark is the navigation's. */
      rule(
        { current: 'page' },
        {
          color: hook.currentColor(token('color-foreground')),
          fontWeight: hook.currentFontWeight(token('weight-semibold')),
        },
      ),
      /* The ring turns inward, because the bar has no room to draw it outside. */
      rule(
        { focusVisible: true },
        {
          outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
          outlineOffset: product(token('size-focus-offset'), '-1'),
        },
      ),
    ]),
  ],
)
