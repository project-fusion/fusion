import { difference, first, measured, product, sum, token, web } from '../style.js'
import { fragment } from '../table.js'

/**
 * Data Table's `bleed`: the rules stay on the words' column, and a row's fill
 * reaches past both ends of them, rounded where it reaches out, as a list
 * row's is. A row has no box to take a margin, so the table takes the room as
 * padding inside the box that scrolls and clips, pulled back out by the same
 * margin, and the first and last cell of each row paint their own fill into
 * it. The table's parent has to leave the room, as a list's does. After them,
 * a tree grid's row header steps in by its depth.
 */
export default fragment(
  'data-table-bleed',
  {
    parts: ['cell', 'row', 'table'],
    hooks: { bleed: null, indent: null, toggleGap: null, toggleSize: null },
    own: { dataTableBleed: null, dataTableDepth: null, dataTableGutter: null },
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
            boxSizing: 'content-box',
            marginInline: product(own.dataTableBleed, '-1'),
            paddingInline: own.dataTableBleed,
          },
        ),
      ]),
    ]),
    /* Written out: the first and last cell of every row hold the reach. */
    on(
      {
        part: 'row',
        selector:
          ':host([bleed]) [part~="row"] > :first-child, :host([bleed]) [part~="row"] > :last-child',
      },
      [web([rule({ position: 'relative' })])],
    ),
    /* Written out: the reach takes the cell's own fill, in every state the rows give it, and
       runs down over the rule's thickness, so it ends where the line under the row does. */
    on(
      {
        part: 'row',
        selector:
          ':host([bleed]) [part~="row"] > :first-child::before, :host([bleed]) [part~="row"] > :last-child::after',
      },
      [
        web([
          rule({
            backgroundColor: 'inherit',
            content: '""',
            inlineSize: own.dataTableBleed,
            insetBlock: [0, product(token('border-thin'), '-1')],
            pointerEvents: 'none',
            position: 'absolute',
          }),
        ]),
      ],
    ),
    on({ part: 'row', selector: ':host([bleed]) [part~="row"] > :first-child::before' }, [
      web([
        rule({
          borderEndStartRadius: token('radii-sm'),
          borderStartStartRadius: token('radii-sm'),
          insetInlineStart: product(own.dataTableBleed, '-1'),
        }),
      ]),
    ]),
    on({ part: 'row', selector: ':host([bleed]) [part~="row"] > :last-child::after' }, [
      web([
        rule({
          borderEndEndRadius: token('radii-sm'),
          borderStartEndRadius: token('radii-sm'),
          insetInlineEnd: product(own.dataTableBleed, '-1'),
        }),
      ]),
    ]),
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
          paddingInlineStart: own.dataTableDepth,
        }),
      ]),
    ]),
    on(
      {
        part: 'cell',
        selector: ':host([child-field]) [part~="cell-header"]:not(:has([part~="toggle"]))',
      },
      [web([rule({ paddingInlineStart: sum(own.dataTableDepth, own.dataTableGutter) })])],
    ),
  ],
)
