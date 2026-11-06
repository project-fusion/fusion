import printEconomy from '../../../fragments/print-economy.js'
import { derive, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * Grid's styled tier.
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
    own: { gridColumnGap: null, gridGap: null, gridRowGap: null },
    stylesheet: 'grid/root/grid-root.generated.css',
  },
  ({ hook, include, on, own, rule, variants }) => [
    on('host', [
      rule({
        columnGap: own.gridColumnGap,
        display: 'grid',
        web: { gridTemplateAreas: hook.areas },
        gridTemplateColumns: hook.columns(derive('grid-template', 'minmax(0, 1fr)')),
        gridTemplateRows: hook.rows,
        rowGap: own.gridRowGap,
        own: { gridColumnGap: own.gridGap, gridGap: token('space-none'), gridRowGap: own.gridGap },
      }),
      /* A fixed count is plain CSS, so it is right in server-rendered markup
         with no JavaScript. */
      variants('columns', {
        '2': {
          gridTemplateColumns: hook.columns(derive('grid-template', 'repeat(2, minmax(0, 1fr))')),
        },
        '3': {
          gridTemplateColumns: hook.columns(derive('grid-template', 'repeat(3, minmax(0, 1fr))')),
        },
        '4': {
          gridTemplateColumns: hook.columns(derive('grid-template', 'repeat(4, minmax(0, 1fr))')),
        },
        '5': {
          gridTemplateColumns: hook.columns(derive('grid-template', 'repeat(5, minmax(0, 1fr))')),
        },
        '6': {
          gridTemplateColumns: hook.columns(derive('grid-template', 'repeat(6, minmax(0, 1fr))')),
        },
      }),
      /* `none`, which is what `Flex` has. */
      variants('gap', {
        none: { own: { gridGap: token('space-none') } },
        '2xs': { own: { gridGap: token('space-2xs') } },
        xs: { own: { gridGap: token('space-xs') } },
        sm: { own: { gridGap: token('space-sm') } },
        md: { own: { gridGap: token('space-md') } },
        lg: { own: { gridGap: token('space-lg') } },
        xl: { own: { gridGap: token('space-xl') } },
        '2xl': { own: { gridGap: token('space-2xl') } },
        /* `3xl` is the top of the space scale, and the pair stops where it does. */
        '3xl': { own: { gridGap: token('space-3xl') } },
      }),
      variants('rowGap', {
        none: { own: { gridRowGap: token('space-none') } },
        '2xs': { own: { gridRowGap: token('space-2xs') } },
        xs: { own: { gridRowGap: token('space-xs') } },
        sm: { own: { gridRowGap: token('space-sm') } },
        md: { own: { gridRowGap: token('space-md') } },
        lg: { own: { gridRowGap: token('space-lg') } },
        xl: { own: { gridRowGap: token('space-xl') } },
        '2xl': { own: { gridRowGap: token('space-2xl') } },
        '3xl': { own: { gridRowGap: token('space-3xl') } },
      }),
      variants('columnGap', {
        none: { own: { gridColumnGap: token('space-none') } },
        '2xs': { own: { gridColumnGap: token('space-2xs') } },
        xs: { own: { gridColumnGap: token('space-xs') } },
        sm: { own: { gridColumnGap: token('space-sm') } },
        md: { own: { gridColumnGap: token('space-md') } },
        lg: { own: { gridColumnGap: token('space-lg') } },
        xl: { own: { gridColumnGap: token('space-xl') } },
        '2xl': { own: { gridColumnGap: token('space-2xl') } },
        '3xl': { own: { gridColumnGap: token('space-3xl') } },
      }),
      /* The attribute is named for the property, so the rule is the value. */
      variants('alignItems', {
        start: { alignItems: 'start' },
        center: { alignItems: 'center' },
        end: { alignItems: 'end' },
      }),
      variants('justifyItems', {
        start: { justifyItems: 'start' },
        center: { justifyItems: 'center' },
        end: { justifyItems: 'end' },
      }),
      /* A phone places each cell in row order. */
      web([
        rule({ autoFlow: 'column' }, { gridAutoFlow: 'column' }),
        rule({ autoFlow: 'dense' }, { gridAutoFlow: 'dense' }),
        rule({ autoFlow: 'column-dense' }, { gridAutoFlow: 'column dense' }),
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
