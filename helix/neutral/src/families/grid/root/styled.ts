import printEconomy from '../../../fragments/print-economy.js'
import { derived, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * Grid's styled tier, which writes `helix/styled/src/grid/root/grid-root.generated.css`.
 *
 * **The track list is read from hooks no rule here sets**, and the fallback
 * is a single column. `--grid-columns` wins over everything the element works
 * out for itself, then the track list `min` or a count above six asks for,
 * `--_grid-template`, which the element derives from its props, then the
 * count's own rule. A phone derives the same track list with the same
 * function, and lays the cells out on it with the native grid.
 *
 * **The gap on each axis is a private value**, so `row-gap` and `column-gap`
 * each win over `gap` on their own axis with no rule for every pair. Set on
 * every host, so a grid inside another takes nothing from it.
 *
 * **A child spans columns with `data-grid-span`**, on the child itself, so a
 * rule of the page's own still wins. A phone reads the same attribute from
 * the child's props.
 *
 * **Named areas are the web's.** A child takes its area with `grid-area` in
 * the page's own stylesheet, which a phone has no channel for, so a phone
 * places every cell in row order. Column flow and dense packing are the
 * web's too.
 */
export default styles(
  root,
  {
    prefix: 'grid',
    hooks: {
      areas: 'none',
      columns: null,
      rows: 'none',
    },
    own: ['grid-column-gap', 'grid-gap', 'grid-row-gap'],
    stylesheet: 'grid/root/grid-root.generated.css',
  },
  ({ hook, include, on, own, rule, variants }) => [
    on('host', [
      rule({
        columnGap: own.columnGap,
        display: 'grid',
        web: { gridTemplateAreas: hook.areas },
        gridTemplateColumns: hook.columns(derived('grid-template', 'minmax(0, 1fr)')),
        gridTemplateRows: hook.rows,
        rowGap: own.rowGap,
        own: { columnGap: own.gap, gap: token('space-none'), rowGap: own.gap },
      }),
      /* A fixed count is plain CSS, so it is right in server-rendered markup
         with no JavaScript. */
      variants('columns', {
        '2': {
          gridTemplateColumns: hook.columns(derived('grid-template', 'repeat(2, minmax(0, 1fr))')),
        },
        '3': {
          gridTemplateColumns: hook.columns(derived('grid-template', 'repeat(3, minmax(0, 1fr))')),
        },
        '4': {
          gridTemplateColumns: hook.columns(derived('grid-template', 'repeat(4, minmax(0, 1fr))')),
        },
        '5': {
          gridTemplateColumns: hook.columns(derived('grid-template', 'repeat(5, minmax(0, 1fr))')),
        },
        '6': {
          gridTemplateColumns: hook.columns(derived('grid-template', 'repeat(6, minmax(0, 1fr))')),
        },
      }),
      /* `none`, which is what `Flex` has. */
      variants('gap', {
        none: { own: { gap: token('space-none') } },
        '2xs': { own: { gap: token('space-2xs') } },
        xs: { own: { gap: token('space-xs') } },
        sm: { own: { gap: token('space-sm') } },
        md: { own: { gap: token('space-md') } },
        lg: { own: { gap: token('space-lg') } },
        xl: { own: { gap: token('space-xl') } },
        '2xl': { own: { gap: token('space-2xl') } },
        /* `3xl` is the top of the space scale, and the pair stops where it does. */
        '3xl': { own: { gap: token('space-3xl') } },
      }),
      variants('row-gap', {
        none: { own: { rowGap: token('space-none') } },
        '2xs': { own: { rowGap: token('space-2xs') } },
        xs: { own: { rowGap: token('space-xs') } },
        sm: { own: { rowGap: token('space-sm') } },
        md: { own: { rowGap: token('space-md') } },
        lg: { own: { rowGap: token('space-lg') } },
        xl: { own: { rowGap: token('space-xl') } },
        '2xl': { own: { rowGap: token('space-2xl') } },
        '3xl': { own: { rowGap: token('space-3xl') } },
      }),
      variants('column-gap', {
        none: { own: { columnGap: token('space-none') } },
        '2xs': { own: { columnGap: token('space-2xs') } },
        xs: { own: { columnGap: token('space-xs') } },
        sm: { own: { columnGap: token('space-sm') } },
        md: { own: { columnGap: token('space-md') } },
        lg: { own: { columnGap: token('space-lg') } },
        xl: { own: { columnGap: token('space-xl') } },
        '2xl': { own: { columnGap: token('space-2xl') } },
        '3xl': { own: { columnGap: token('space-3xl') } },
      }),
      /* The attribute is named for the property, so the rule is the value. */
      variants('align-items', {
        start: { alignItems: 'start' },
        center: { alignItems: 'center' },
        end: { alignItems: 'end' },
      }),
      variants('justify-items', {
        start: { justifyItems: 'start' },
        center: { justifyItems: 'center' },
        end: { justifyItems: 'end' },
      }),
      /* A phone places each cell in row order. */
      web([
        rule({ 'auto-flow': 'column' }, { gridAutoFlow: 'column' }),
        rule({ 'auto-flow': 'dense' }, { gridAutoFlow: 'dense' }),
        rule({ 'auto-flow': 'column-dense' }, { gridAutoFlow: 'column dense' }),
      ]),
    ]),
    /* A child that spans columns. */
    on({ slotted: '[data-grid-span="full"]' }, [rule({ gridColumn: '1 / -1' })]),
    on({ slotted: '[data-grid-span="2"]' }, [rule({ gridColumn: 'span 2' })]),
    on({ slotted: '[data-grid-span="3"]' }, [rule({ gridColumn: 'span 3' })]),
    on({ slotted: '[data-grid-span="4"]' }, [rule({ gridColumn: 'span 4' })]),
    on({ slotted: '[data-grid-span="5"]' }, [rule({ gridColumn: 'span 5' })]),
    on({ slotted: '[data-grid-span="6"]' }, [rule({ gridColumn: 'span 6' })]),
    /* Layout only, and it keeps its own. */
    include(printEconomy),
  ],
)
