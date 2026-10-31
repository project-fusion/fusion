import { native, product, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import virtualList from './headless.js'

const reach = token('size-focus-reach')
const inward = product(reach, '-1')

/**
 * Virtual List's styled tier: the box that scrolls, and the ring on the row
 * holding focus.
 *
 * **Rows are your markup on the web, so their treatment is your stylesheet's**,
 * apart from what the list itself moves: the ring, the fill a chosen row takes,
 * and the dimming of a disabled one. A rule of yours on a row wins over each.
 * On a phone those three are drawn on the row the list draws around what
 * `renderItem` gives.
 *
 * **The box keeps room for a row's ring.** A scrolling region clips both axes,
 * and rows span the viewport exactly, so the viewport stands out by the ring's
 * reach and pads it back in. A phone's rows draw their ring inset, so it keeps
 * none.
 *
 * **The spacers carry the room the rows outside the window would take**, on
 * the web alone, so the scrollbar is honest about the length of the set. A
 * phone's list keeps its own.
 */
export default styles(
  virtualList,
  {
    prefix: 'virtual-list',
    hooks: {
      blockSize: '20em',
      disabledOpacity: 0.5,
      emptyColor: token('color-foreground-muted'),
      emptyPadding: token('space-md'),
      loadingColor: token('color-foreground-muted'),
      loadingPadding: token('space-sm'),
      scrollbarThumbColor: token('scrollbar-thumb-color'),
      scrollbarThumbHoverColor: token('scrollbar-thumb-hover-color'),
      scrollbarTrackColor: token('scrollbar-track-color'),
      selectedBackgroundColor: token('color-primary-subtle'),
      selectedColor: 'inherit',
    },
    stylesheet: 'virtual-list/root/virtual-list-root.generated.css',
  },
  ({ hook, on, rule }) => [
    on('host', [
      rule({ display: 'block' }),
      /* Print: prints the window it has, which is the honest limit. */
      rule({ print: true }, { overflow: 'visible' }),
    ]),
    on('viewport', [
      rule({
        blockSize: hook.blockSize,
        web: {
          marginInline: inward,
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          paddingInline: reach,
          scrollbarColor: [hook.scrollbarThumbColor, hook.scrollbarTrackColor],
          scrollbarWidth: 'thin',
        },
      }),
      /* Across, the box scrolls sideways and is as tall as its rows, and the
         room for a row's ring moves to the top and bottom. */
      rule(
        { horizontal: true },
        {
          blockSize: hook.blockSize('auto'),
          web: {
            marginBlock: inward,
            marginInline: '0',
            overflowX: 'auto',
            overflowY: 'hidden',
            paddingBlock: reach,
            paddingInline: '0',
          },
        },
      ),
      /* The hover step, which a browser's thin bar has no way to draw on the
         thumb. */
      web([
        rule(
          { hover: true },
          { scrollbarColor: [hook.scrollbarThumbHoverColor, hook.scrollbarTrackColor] },
        ),
      ]),
    ]),
    on({ slotted: '[data-index]:focus-visible' }, [
      web([
        rule({
          outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
          outlineOffset: product(token('size-focus-offset'), '-1'),
        }),
      ]),
    ]),
    on({ slotted: '[aria-selected="true"]' }, [
      web([
        rule({
          backgroundColor: hook.selectedBackgroundColor,
          color: hook.selectedColor,
        }),
      ]),
    ]),
    on({ slotted: '[aria-disabled="true"]' }, [
      web([rule({ cursor: 'not-allowed', opacity: hook.disabledOpacity })]),
    ]),
    on('empty', [
      rule({
        color: hook.emptyColor,
        fontSize: token('text-sm'),
        padding: hook.emptyPadding,
        textAlign: 'center',
      }),
    ]),
    on('loading', [
      rule({
        color: hook.loadingColor,
        fontSize: token('text-sm'),
        padding: hook.loadingPadding,
        textAlign: 'center',
      }),
    ]),
    on(['after', 'before'], [rule({ flex: 'none' })]),
    /* What the list moves, on the row a phone draws around your content. */
    on('row', [
      native([
        rule({
          justifyContent: 'center',
          minBlockSize: '2rem',
          paddingInline: token('space-sm'),
        }),
        rule(
          { focusVisible: true },
          {
            outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
            outlineOffset: product(token('size-focus-offset'), '-1'),
          },
        ),
        rule(
          { also: { 'row-selected': true } },
          {
            backgroundColor: hook.selectedBackgroundColor,
            /* A phone's words inherit nothing through `inherit`, so a row
               draws them in the page's color until the hook names another. */
            color: hook.selectedColor(token('color-foreground')),
          },
        ),
        rule({ also: { 'row-disabled': true } }, { opacity: hook.disabledOpacity }),
        rule({ also: { 'row-dragging': true } }, { opacity: 0.5 }),
        rule(
          { also: { 'row-drop-before': true } },
          { boxShadow: ['inset', '0', token('border-thick'), '0', '0', token('color-primary')] },
        ),
        rule(
          { also: { 'row-drop-after': true } },
          {
            boxShadow: [
              'inset',
              '0',
              product(token('border-thick'), '-1'),
              '0',
              '0',
              token('color-primary'),
            ],
          },
        ),
      ]),
    ]),
    on('row-box', [native([rule({ part: { hidden: true } }, { display: 'none' })])]),
    on('section-header', [
      native([
        rule({
          color: token('color-foreground-muted'),
          fontSize: token('text-sm'),
          fontWeight: token('weight-semibold'),
          paddingBlock: token('space-xs'),
          paddingInline: token('space-sm'),
        }),
        rule({ part: { hidden: true } }, { display: 'none' }),
      ]),
    ]),
  ],
)
