import printEconomy from '../../../fragments/print-economy.js'
import { difference, native, product, token } from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * Flex's styled tier, which writes `helix/styled/src/flex/root/flex-root.generated.css`.
 *
 * **The host is the container.** No wrapper part, so the element adds no box
 * of its own and costs exactly the div it replaces. A phone draws it as a
 * flex view, which lays out the children passed in.
 *
 * **The gap on each axis is a private value**, so `row-gap` and `column-gap`
 * each win over `gap` on their own axis with no rule for every pair. Named
 * for the family, and set on every host, so a flex inside another takes
 * nothing from it. A gap is space, so on a phone it stops growing at the
 * largest standard text size.
 *
 * **The patterns come first**, so every attribute below, written on the same
 * element, wins over the value a pattern chose.
 *
 * **`switch` decides by the flex's own width.** Each item's basis is the
 * distance from the threshold to the row's width, times a large number:
 * negative while the row is wider, which a basis takes as zero, so the items
 * share it; and wider than the row below the threshold, so each wraps onto a
 * line of its own. A phone measures the flex's width as it lays out and
 * works the basis out from it, so the first frame draws the items sharing
 * the row until the width is known. Its items shrink to their line there, as
 * a flex item shrinks on the web, since a view does not unless it says so.
 *
 * **A phone styles the children that are Helix components.** `flank` and
 * `switch` give each item its basis and grow through the `::slotted()` rules,
 * which a Helix component reads from the flex around it. A view of the app's
 * own takes its size from its own style.
 */
export default styles(
  root,
  {
    prefix: 'flex',
    hooks: {
      flankMin: '50%',
      flankSize: 'auto',
      switchAt: '30rem',
    },
    own: { flexColumnGap: null, flexGap: null, flexRowGap: null },
    stylesheet: 'flex/root/flex-root.generated.css',
  },
  ({ hook, include, on, own, rule, variants }) => [
    on('host', [
      rule({
        columnGap: own.flexColumnGap,
        display: 'flex',
        flexDirection: 'row',
        rowGap: own.flexRowGap,
        own: { flexColumnGap: own.flexGap, flexGap: token('space-none'), flexRowGap: own.flexGap },
      }),
      rule({ inline: true }, { display: 'inline-flex' }),
      variants('direction', {
        column: { flexDirection: 'column' },
        'row-reverse': { flexDirection: 'row-reverse' },
        'column-reverse': { flexDirection: 'column-reverse' },
      }),
      rule(
        { layout: ['cluster', 'flank', 'flank-end', 'split'] },
        { alignItems: 'center', flexWrap: 'wrap' },
      ),
      variants('layout', {
        split: { justifyContent: 'space-between' },
        switch: { flexWrap: 'wrap' },
      }),
      rule({ wrap: true }, { flexWrap: 'wrap' }),
      rule({ wrap: 'reverse' }, { flexWrap: 'wrap-reverse' }),
      variants('gap', {
        '2xs': { own: { flexGap: token('space-2xs') } },
        xs: { own: { flexGap: token('space-xs') } },
        sm: { own: { flexGap: token('space-sm') } },
        md: { own: { flexGap: token('space-md') } },
        lg: { own: { flexGap: token('space-lg') } },
        xl: { own: { flexGap: token('space-xl') } },
        '2xl': { own: { flexGap: token('space-2xl') } },
        /* `3xl` is the top of the space scale, and the pair stops where it does. */
        '3xl': { own: { flexGap: token('space-3xl') } },
      }),
      variants('rowGap', {
        none: { own: { flexRowGap: token('space-none') } },
        '2xs': { own: { flexRowGap: token('space-2xs') } },
        xs: { own: { flexRowGap: token('space-xs') } },
        sm: { own: { flexRowGap: token('space-sm') } },
        md: { own: { flexRowGap: token('space-md') } },
        lg: { own: { flexRowGap: token('space-lg') } },
        xl: { own: { flexRowGap: token('space-xl') } },
        '2xl': { own: { flexRowGap: token('space-2xl') } },
        '3xl': { own: { flexRowGap: token('space-3xl') } },
      }),
      variants('columnGap', {
        none: { own: { flexColumnGap: token('space-none') } },
        '2xs': { own: { flexColumnGap: token('space-2xs') } },
        xs: { own: { flexColumnGap: token('space-xs') } },
        sm: { own: { flexColumnGap: token('space-sm') } },
        md: { own: { flexColumnGap: token('space-md') } },
        lg: { own: { flexColumnGap: token('space-lg') } },
        xl: { own: { flexColumnGap: token('space-xl') } },
        '2xl': { own: { flexColumnGap: token('space-2xl') } },
        '3xl': { own: { flexColumnGap: token('space-3xl') } },
      }),
      /* The attribute is named for the property, so the rule is the value with
         the flex spelling where CSS has one. */
      variants('alignItems', {
        start: { alignItems: 'flex-start' },
        center: { alignItems: 'center' },
        end: { alignItems: 'flex-end' },
        baseline: { alignItems: 'baseline' },
      }),
      variants('alignContent', {
        start: { alignContent: 'flex-start' },
        center: { alignContent: 'center' },
        end: { alignContent: 'flex-end' },
        between: { alignContent: 'space-between' },
        around: { alignContent: 'space-around' },
        stretch: { alignContent: 'stretch' },
      }),
      rule({ alignItems: 'stretch' }, { alignItems: 'stretch' }),
      variants('justifyContent', {
        start: { justifyContent: 'flex-start' },
        center: { justifyContent: 'center' },
        end: { justifyContent: 'flex-end' },
        between: { justifyContent: 'space-between' },
        around: { justifyContent: 'space-around' },
      }),
    ]),
    /* The fixed item keeps its own width, or `--flex-flank-size`, and the
       other takes the rest. A grow of 999 against 1 gives the rest to the
       second, and its minimum is what makes the pair stack once the row is
       too narrow for both. */
    on({ slotted: '*' }, [
      rule(
        [
          { child: 'first', layout: 'flank' },
          { child: 'last', layout: 'flank-end' },
        ],
        { flexBasis: hook.flankSize, flexGrow: 1 },
      ),
      rule(
        [
          { child: 'last', layout: 'flank' },
          { child: 'first', layout: 'flank-end' },
        ],
        { flexBasis: 0, flexGrow: 999, minInlineSize: hook.flankMin },
      ),
      rule(
        { layout: 'switch' },
        { flexBasis: product(difference(hook.switchAt, '100%'), 999), flexGrow: 1 },
      ),
      /* A view does not shrink unless it says so, and a flex item does. */
      native([rule({ layout: 'switch' }, { flexShrink: 1 })]),
    ]),
    /* Layout only, and it keeps its own. */
    include(printEconomy),
  ],
)
