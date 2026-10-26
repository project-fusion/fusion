import {
  first,
  fn,
  hookOf,
  list,
  measured,
  mix,
  native,
  product,
  sum,
  token,
  web,
} from '../../../style.js'
import { styles } from '../../../table.js'
import row from './headless.js'

/**
 * A menu row's styled tier, which writes
 * `helix/styled/src/menu/item/menu-item.generated.css`. Its panel hooks are
 * the menu's, `--menu-*`.
 *
 * **A row is four columns**: what stands before the label, the label, the
 * words after it with any shortcut, and the check or the caret, the first
 * and the last as wide as the menu says the page keeps them. **A described
 * row is two lines**, the label over its description. It lights under the
 * pointer, rings inside its edge for the keyboard, and fades while
 * disabled. A checked row's check is in the full ink, and a caret in the
 * quiet one.
 *
 * **A flyout is the menu's own surface beside the row**, its material
 * included, which the menu hands down, and it grows out of the side it
 * opened on. It is the web's.
 *
 * **Selectors stay written out** for what the web marks on its slots and
 * its press: a description or trailing words that hold nothing, and a row
 * whose description holds something.
 */
export default styles(
  row,
  {
    prefix: 'menu',
    hooks: {
      itemDescriptionColor: token('color-foreground-muted'),
      itemDetailColor: token('color-foreground-muted'),
      itemEnd: '0px',
      itemHoverColor: mix(token('color-foreground'), 8, 'transparent'),
      itemStart: '0px',
    },
    own: ['menu-from', 'menu-material-backdrop', 'menu-material-fill', 'menu-travel'],
    stylesheet: 'menu/item/menu-item.generated.css',
  },
  ({ hook, on, own, rule }) => {
    const fast = token('duration-fast')
    const ring = [token('size-focus-ring'), 'solid', token('color-focus-ring')] as const
    const column = sum(token('size-icon'), token('space-xs'))
    const lit = hook.itemHoverColor
    const mark = {
      blockSize: token('size-icon'),
      gridColumn: 4,
      gridRow: 1,
      inlineSize: token('size-icon'),
      justifySelf: 'end',
    } as const
    return [
      on('host', [rule({ display: 'block' })]),
      on('item', [
        rule({
          alignItems: 'center',
          textDecoration: 'none',
          borderRadius: token('radii-none'),
          color: token('color-foreground'),
          web: { cursor: 'pointer' },
          display: 'grid',
          fontSize: token('text-xs'),
          fontWeight: token('weight-medium'),
          gridTemplateColumns: [hook.itemStart, fn('minmax', 0, '1fr'), 'auto', hook.itemEnd],
          minBlockSize: token('size-control'),
          paddingInline: token('space-sm'),
          transition: ['background-color', fast, token('easing-standard')],
          userSelect: 'none',
        }),
        rule({ hover: true }, { backgroundColor: lit }),
        rule({ highlighted: true }, { backgroundColor: lit }),
        rule(
          { focusVisible: true },
          { outline: ring, outlineOffset: product(token('size-focus-offset'), '-1') },
        ),
        /* Dimmed by the row's own `disabled`, which holds in a filtered
           menu too, where the web marks the host disabled for the filter. */
        rule({ has: 'disabled' }, { web: { cursor: 'not-allowed' }, opacity: 0.5 }),
      ]),
      on('start', [
        rule({
          '--icon-size': token('size-icon'),
          alignItems: 'center',
          boxSizing: 'border-box',
          color: token('color-foreground-subtle'),
          display: 'flex',
          justifyContent: 'center',
          paddingInlineEnd: token('space-xs'),
          minBlockSize: token('size-icon'),
        }),
        rule({ gridColumn: 1 }),
        /* A phone keeps the column the page keeps, empty or not. */
        native([
          rule({ inlineSize: hook.itemStart, paddingInlineEnd: token('space-none') }),
          rule({ started: true }, { paddingInlineEnd: token('space-xs') }),
        ]),
      ]),
      /* A phone's label takes what the row leaves, over its description. */
      on('label', [
        native([
          rule({ display: 'flex', flex: '1 1 0', flexDirection: 'column', minInlineSize: 0 }),
        ]),
      ]),
      on('tail', [
        native([
          rule({
            alignItems: 'center',
            display: 'flex',
            inlineSize: hook.itemEnd,
            justifyContent: 'flex-end',
          }),
        ]),
      ]),
      on({ region: 'default' }, [rule({ display: 'block', gridColumn: 2, minInlineSize: 0 })]),
      on({ region: 'description' }, [
        rule({
          color: hook.itemDescriptionColor,
          display: 'block',
          fontWeight: token('weight-regular'),
          gridColumn: 2,
          gridRow: 2,
          minInlineSize: 0,
        }),
      ]),
      on({ part: 'item', selector: 'slot[name="description"][data-empty]' }, [
        web([rule({ display: 'none' })]),
      ]),
      /* Two lines outgrow the row's least height, so they take an inset. */
      on(
        {
          part: 'item',
          selector: '[part="item"]:has(> slot[name="description"]:not([data-empty]))',
        },
        [web([rule({ paddingBlock: token('space-xs') })])],
      ),
      on('item', [native([rule({ described: true }, { paddingBlock: token('space-xs') })])]),
      on('end', [
        rule({
          alignItems: 'center',
          color: hook.itemDetailColor,
          display: 'flex',
          gap: token('space-2xs'),
          gridColumn: 3,
          paddingInlineStart: token('space-sm'),
        }),
        rule({ part: { 'data-empty': true } }, { display: 'none' }),
        native([rule({ hidden: true }, { display: 'none' })]),
      ]),
      /* A row with nothing before its label draws no box there, and the
         column the menu keeps still lines its label up with its neighbors'. */
      on('start', [web([rule({ part: { 'data-empty': true } }, { display: 'none' })])]),
      on('mark', [rule(mark)]),
      on({ region: 'check', slotted: '*' }, [rule(mark)]),
      on({ region: 'chevron', slotted: '*' }, [rule(mark)]),
      on('mark', [
        rule({ color: token('color-foreground-subtle') }),
        rule({ checked: true }, { color: token('color-foreground') }),
        /* The caret points into the page, so it turns in a right-to-left
           page, as the web's mirror rule turns it. */
        native([rule({ dir: 'rtl', hasSubmenu: true }, { scale: '-1 1' })]),
      ]),
      on({ region: 'chevron', slotted: '*' }, [rule({ color: token('color-foreground-subtle') })]),
      on({ region: 'check', slotted: '*' }, [rule({ color: token('color-foreground') })]),
      /* A row's page draws where the row stood. */
      on({ region: 'submenu' }, [web([rule({ display: 'contents' })])]),
      on({ region: 'submenu', slotted: 'helix-divider' }, [
        rule({ marginBlock: token('space-2xs') }),
      ]),
      /* **A row's page keeps its own columns**, as a flyout's panel does on
         the web: a phone draws the page's rows inside the row. */
      on({ region: 'submenu', slotted: '*' }, [
        native([
          rule({ '--menu-item-start': '0px', '--menu-item-end': '0px' }),
          rule({ submenuStarted: true }, { '--menu-item-start': column }),
          rule({ submenuMarked: true }, { '--menu-item-end': column }),
        ]),
      ]),
      /* The flyout, the menu's own surface beside the row. */
      on('surface', [
        rule({
          backgroundColor: first(
            hookOf('menu', 'background-color'),
            own.materialFill,
            token('color-surface-overlay'),
          ),
          border: [
            hookOf('menu', 'border-width', token('border-floating')),
            'solid',
            hookOf('menu', 'border-color', token('color-border')),
          ],
          borderRadius: token('radii-sm'),
          boxShadow: hookOf('menu', 'shadow', token('shadow-floating')),
          web: { inset: 'auto' },
          margin: token('space-none'),
        }),
      ]),
      on({ part: 'surface', selector: '[part="surface"][hidden]' }, [
        web([rule({ display: 'none' })]),
      ]),
      on({ part: 'surface', selector: '[part="surface"]:not(:popover-open)' }, [
        web([rule({ display: 'none' })]),
      ]),
      on('surface', [
        rule({
          own: { travel: product(token('space-2xs'), '-1'), from: 0.96 },
          opacity: 0,
          scale: own.from,
          transform: fn('translateY', own.travel),
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
            own: { travel: token('space-2xs') },
            transformOrigin: [measured('floating-arrow-x', '50%'), '100%'],
          },
        ),
        rule({ placedBottom: true }, { transformOrigin: [measured('floating-arrow-x', '50%'), 0] }),
        rule({ part: { 'data-placed': true } }, { opacity: 1, scale: 1, transform: 'none' }),
        rule([{ reducedMotion: true }, { part: { 'data-placed': true }, reducedMotion: true }], {
          scale: 1,
          transform: 'none',
          transition: 'none',
        }),
        web([rule({ supports: 'not (overlay: auto)' }, { transitionBehavior: 'normal' })]),
        rule({
          '--menu-item-start': '0px',
          '--menu-item-end': '0px',
          backdropFilter: own.materialBackdrop('none'),
          maxBlockSize: hookOf(
            'menu',
            'max-block-size',
            measured('floating-available-block-size', 'none'),
          ),
          minInlineSize: hookOf('menu', 'min-inline-size', '12rem'),
          overflowY: 'auto',
          paddingBlock: token('space-xs'),
          paddingInline: token('space-none'),
        }),
        rule({ submenuStart: true }, { '--menu-item-start': column }),
        rule({ submenuMark: true }, { '--menu-item-end': column }),
        rule({ placedLeft: true }, { transformOrigin: ['100%', 0] }),
        rule({ placedRight: true }, { transformOrigin: [0, 0] }),
      ]),
    ]
  },
)
