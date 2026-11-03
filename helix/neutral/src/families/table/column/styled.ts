import {
  difference,
  first,
  list,
  measured,
  native,
  product,
  quotient,
  token,
  web,
} from '../../../style.js'
import { styles } from '../../../table.js'
import column from './headless.js'

/**
 * One column of a table, in its styled tier: a header cell, with the same rule
 * and inset as the cells below it, so the heading and its column read as one
 * line down the table.
 *
 * **Weight and color carry the heading, not capitals or a smaller size.** The
 * caption treatment is a step smaller than the column it names, which reads as
 * a footnote to its own data.
 *
 * **Taller than a row**, because the header is a band rather than the first row
 * of data.
 *
 * **Each `--_table-heading-*` is a data table's hooks, relayed.** That table's
 * sheet can reach the column element and not the box inside it, so it sets these
 * on the column and they inherit in here. Unset, each falls back to what a
 * heading is in either table.
 *
 * **The heading's words and chevrons are one button.** The chevrons stay quiet
 * until one of them is the current direction.
 *
 * **The heading goes to the edge its values go to**, so `Size` sits over digits
 * set to the end rather than at the start above them.
 *
 * **A grip is quiet until held**, and a separator is a strip on the edge, wider
 * than the line it draws, because a one pixel target is one nobody can grab.
 * The strip stands inside the heading's end padding: straddling the boundary, it
 * covered the next heading's grip and pushed the last column out past the
 * table's scroll box.
 */
export default styles(
  column,
  {
    prefix: 'table',
    hooks: {
      paddingBlock: null,
      ruleColor: token('color-border'),
    },
    own: {
      tableHeadingBackgroundColor: null,
      tableHeadingLayer: null,
      tableHeadingPosition: null,
    },
    stylesheet: 'table/column/table-column.generated.css',
  },
  ({ hook, on, own, rule }) => {
    const ring = [
      rule(
        { focusVisible: true },
        {
          outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
          outlineOffset: token('size-focus-offset'),
        },
      ),
    ]
    /* The quiet ink. The web's chevrons carry the rest as attributes on the element. */
    const chevron = [
      rule({ stroke: token('color-foreground-subtle') }),
      native([
        rule({ fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 1.9 }),
      ]),
    ]
    return [
      on('host', [
        web([rule({ display: 'contents' })]),
        native([
          rule({ flexGrow: 1 }),
          /* The menu stands beside the column on a phone, so the rule runs under both. */
          rule(
            { hasMenu: true },
            {
              borderBlockEnd: [
                token('border-thin'),
                'solid',
                measured('_table-heading-rule-color', hook.ruleColor),
              ],
            },
          ),
        ]),
      ]),
      on('column', [
        rule({
          alignItems: 'center',
          backgroundColor: own.tableHeadingBackgroundColor('transparent'),
          borderBlockEnd: [
            token('border-thin'),
            'solid',
            measured('_table-heading-rule-color', hook.ruleColor),
          ],
          boxSizing: 'border-box',
          color: measured('_table-heading-color', token('color-foreground-muted')),
          display: 'flex',
          fontFamily: token('font-sans'),
          fontSize: measured('_table-heading-text', token('text-control')),
          fontWeight: token('weight-semibold'),
          minBlockSize: token('size-control-loose'),
          minInlineSize: 0,
          paddingBlock: measured(
            '_table-heading-padding-block',
            first(hook.paddingBlock, token('space-none')),
          ),
          paddingInline: measured(
            '_table-heading-padding-inline',
            list([token('space-none'), token('space-md')]),
          ),
          web: {
            insetBlockStart: 0,
            position: own.tableHeadingPosition('relative'),
            zIndex: own.tableHeadingLayer('auto'),
          },
        }),
        native([
          rule({ flexDirection: 'row', flexGrow: 1 }),
          rule({ hasMenu: true }, { borderBlockEndWidth: token('space-none'), flexGrow: 0 }),
        ]),
        rule({ textAlign: 'center' }, { justifyContent: 'center' }),
        rule({ textAlign: 'end' }, { justifyContent: 'flex-end' }),
        web([
          rule(
            { focusVisible: true },
            {
              outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
              outlineOffset: product(token('size-focus-offset'), '-1'),
            },
          ),
        ]),
      ]),
      on('sort', [
        rule({
          web: { all: 'unset', cursor: 'pointer' },
          alignItems: 'center',
          boxSizing: 'border-box',
          display: 'inline-flex',
          flex: '1',
          gap: token('space-2xs'),
          minInlineSize: 0,
          position: 'relative',
        }),
        rule({ textAlign: 'center' }, { justifyContent: 'center' }),
        /* The chevrons come before the words here, so the words stay over the values
           they name. `flex-start` because `row-reverse` turns the main axis around. */
        rule({ textAlign: 'end' }, { flexDirection: 'row-reverse', justifyContent: 'flex-start' }),
        web([rule({ hover: true }, { color: token('color-foreground') })]),
        rule([{ sortedAscending: true }, { sortedDescending: true }], {
          color: token('color-foreground'),
        }),
        /* The sort button shrinks to its words so the menu button sits beside the
           chevrons. A press on the rest of the heading still sorts: the table listens on
           the whole column. */
        rule({ hasMenu: true }, { flex: '0 1 auto' }),
        web(ring),
      ]),
      /* Two chevrons, quiet until one of them is the current direction. The box is
         wider than the chevrons so the hover has room to draw behind them. */
      on('sort-mark', [
        rule({
          blockSize: '1.07em',
          borderRadius: token('radii-sm'),
          flex: 'none',
          inlineSize: '1.07em',
        }),
        /* The whole heading is the button, so the highlight answers a pointer anywhere
           on it. */
        web([
          rule({ within: { sort: { hover: true } } }, { backgroundColor: token('color-hover') }),
        ]),
      ]),
      on('sort-up', [
        ...chevron,
        rule({ sortedAscending: true }, { stroke: token('color-foreground') }),
      ]),
      on('sort-down', [
        ...chevron,
        rule({ sortedDescending: true }, { stroke: token('color-foreground') }),
      ]),
      /* The same quiet ink and hover as the chevrons, so the two marks read as one
         group and neither competes with the words. */
      on('menu-button', [
        web([
          rule({
            all: 'unset',
            alignItems: 'center',
            borderRadius: token('radii-sm'),
            boxSizing: 'border-box',
            color: token('color-foreground-subtle'),
            cursor: 'pointer',
            display: 'inline-flex',
            flex: 'none',
            marginInlineStart: token('space-2xs'),
            position: 'relative',
          }),
          /* The words stay over the values they name, so the button goes before the
             chevrons, and the grip stays first. */
          rule(
            { textAlign: 'end' },
            {
              marginInline: list([token('space-none'), token('space-2xs')]),
              order: '-1',
            },
          ),
          rule(
            { hover: true },
            { backgroundColor: token('color-hover'), color: token('color-foreground') },
          ),
        ]),
        web(ring),
      ]),
      /* Written out: the vocabulary names no open menu's button. */
      on({ part: 'menu-button', selector: '[part="menu-button"][aria-expanded="true"]' }, [
        web([rule({ backgroundColor: token('color-hover'), color: token('color-foreground') })]),
      ]),
      /* The press reaches `--helix-size-target`, in a transparent box, so nothing
         drawn moves. */
      on({ after: 'menu-button' }, [
        web([
          rule({
            content: '""',
            inset: quotient(difference(token('size-target'), '100%'), '-2'),
            position: 'absolute',
          }),
        ]),
      ]),
      on('menu-mark', [web([rule({ blockSize: '1.07em', inlineSize: '1.07em' })])]),
      /* The press reaches `--helix-size-target`, in a transparent box, so nothing
         drawn moves. */
      on({ after: 'sort' }, [
        web([
          rule({
            content: '""',
            inset: quotient(difference(token('size-target'), '100%'), '-2'),
            position: 'absolute',
          }),
        ]),
      ]),
      /* Written out: the vocabulary names no last of a kind. The last heading ends
         on the rule with the values under it. */
      on({ part: 'column', selector: ':host(:last-of-type) [part="column"]' }, [
        web([
          rule({
            paddingInline: measured('_table-heading-padding-inline', token('space-none')),
          }),
        ]),
      ]),
      on('grip', [
        rule({
          web: { all: 'unset', cursor: 'grab', touchAction: 'none' },
          alignItems: 'center',
          borderRadius: token('radii-sm'),
          boxSizing: 'border-box',
          color: token('color-foreground-muted'),
          /* Room above and below the mark, so the mark stays under three quarters of the
             button's height. Along the row it stays the mark's width. */
          paddingBlock: token('space-2xs'),
          display: 'inline-flex',
          flex: 'none',
          marginInlineEnd: token('space-2xs'),
        }),
        web([rule({ textAlign: 'end' }, { order: '-2' })]),
        web([rule({ active: true }, { cursor: 'grabbing' })]),
        web(ring),
      ]),
      /* The row's and the list item's grip, which the heading's smaller type
         would otherwise draw a pixel smaller. */
      on('grip-mark', [
        rule({ blockSize: token('text-control'), inlineSize: token('text-control') }),
      ]),
      on('resizer', [
        rule({
          inlineSize: token('space-sm'),
          insetBlock: 0,
          insetInlineEnd: 0,
          position: 'absolute',
          web: { cursor: 'col-resize', touchAction: 'none' },
        }),
        web(ring),
      ]),
      on({ after: 'resizer' }, [
        web([
          rule({
            borderInlineEnd: [token('border-thin'), 'solid', 'transparent'],
            content: '""',
            insetBlock: token('space-xs'),
            insetInlineEnd: 0,
            position: 'absolute',
          }),
          rule({ hover: true }, { borderInlineEndColor: token('color-foreground-muted') }),
          rule({ focusVisible: true }, { borderInlineEndColor: token('color-foreground-muted') }),
        ]),
      ]),
    ]
  },
)
