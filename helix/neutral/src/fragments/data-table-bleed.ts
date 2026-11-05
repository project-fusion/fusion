import { difference, first, measured, product, sum, token, web } from '../style.js'
import { fragment } from '../table.js'

/**
 * Data Table's `bleed`: the words stay on the table's edge, and each row
 * reaches past it. The table is wider than its host by the bleed on each
 * side, and the first and last box of every row, the headings' included, take
 * the same amount on top of their own inset, so the words stand where they did
 * while each row's fill and the rule under it run on to the same edge. A
 * chosen or hovered row is its fill between the lines. The table's parent has
 * to leave the room, as a list's does. After them, a tree grid's row header
 * steps in by its depth, from the lead the bleed gives it.
 */
export default fragment(
  'data-table-bleed',
  {
    parts: ['cell', 'row', 'select', 'table'],
    hooks: { bleed: null, indent: null, toggleGap: null, toggleSize: null },
    own: {
      dataTableBleed: null,
      dataTableDepth: null,
      dataTableGutter: null,
      dataTableLead: null,
      tableHeadingPaddingInline: null,
    },
    props: ['bleed'],
  },
  ({ hook, on, own, rule }) => [
    on('host', [
      rule({ bleed: true }, { own: { dataTableBleed: hook.bleed(token('space-row-bleed')) } }),
    ]),
    on('table', [
      web([
        rule(
          { bleed: true },
          {
            inlineSize: sum('100%', product(own.dataTableBleed, 2)),
            marginInline: product(own.dataTableBleed, '-1'),
          },
        ),
      ]),
    ]),
    /* Written out: the first and last box of every row, the headings' row included. */
    on(
      {
        part: 'row',
        selector: ':host([bleed]) :where([part~="row"], [part="head"]) > :first-child',
      },
      [
        web([
          rule({
            own: { dataTableLead: own.dataTableBleed },
            paddingInlineStart: own.dataTableBleed,
          }),
        ]),
      ],
    ),
    on(
      {
        part: 'row',
        selector: ':host([bleed]) :where([part~="row"], [part="head"]) > :last-child',
      },
      [web([rule({ paddingInlineEnd: own.dataTableBleed })])],
    ),
    /* Written out: a checkbox or a grip leading the row keeps its own step inside the bleed. */
    on(
      {
        part: 'select',
        selector:
          ':host([bleed]) :where([part~="row"], [part="head"]) > :is([part~="select"], [part="select-all"], [part="row-grip"], [part="grip-head"]):first-child',
      },
      [web([rule({ paddingInlineStart: sum(token('space-sm'), own.dataTableBleed) })])],
    ),
    /* Written out: each column draws its heading, and the first and the last are
       handed the bleed, the first only where nothing leads it. */
    on(
      {
        part: 'row',
        selector:
          ':host([bleed]:not([selectable]):not([reorderable-rows])) ::slotted(helix-table-column:first-of-type)',
      },
      [
        web([
          rule({ own: { tableHeadingPaddingInline: [own.dataTableBleed, token('space-md')] } }),
        ]),
      ],
    ),
    on({ part: 'row', selector: ':host([bleed]) ::slotted(helix-table-column:last-of-type)' }, [
      web([
        rule({
          own: { tableHeadingPaddingInline: [token('space-none'), own.dataTableBleed] },
        }),
      ]),
    ]),
    on(
      {
        part: 'row',
        selector:
          ':host([bleed]:not([selectable]):not([reorderable-rows])) ::slotted(helix-table-column:only-of-type)',
      },
      [web([rule({ own: { tableHeadingPaddingInline: own.dataTableBleed } })])],
    ),
    /* Written out: a chosen or hovered row draws no rule across its fill. */
    on(
      {
        part: 'row',
        selector:
          ':host([bleed]) [part~="row"][aria-selected="true"] > *, :host([bleed][row-link]) [part~="row"]:hover > *',
      },
      [web([rule({ borderBlockEndColor: 'transparent' })])],
    ),
    /* Written out: a row header holds two names, and steps in by its depth. */
    on({ part: 'cell', selector: ':host([child-field]) [part~="cell-header"]' }, [
      web([
        rule({
          own: {
            dataTableDepth: product(
              difference(measured('data-table-level'), '1'),
              first(hook.indent, own.dataTableGutter),
            ),
            dataTableGutter: sum(
              hook.toggleSize(token('size-icon-tight')),
              hook.toggleGap(token('space-2xs')),
            ),
          },
          paddingInlineStart: sum(own.dataTableLead(token('space-none')), own.dataTableDepth),
        }),
      ]),
    ]),
    on(
      {
        part: 'cell',
        selector: ':host([child-field]) [part~="cell-header"]:not(:has([part~="toggle"]))',
      },
      [
        web([
          rule({
            paddingInlineStart: sum(
              own.dataTableLead(token('space-none')),
              own.dataTableDepth,
              own.dataTableGutter,
            ),
          }),
        ]),
      ],
    ),
  ],
)
