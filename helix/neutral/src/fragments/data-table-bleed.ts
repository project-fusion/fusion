import { difference, first, measured, product, quotient, sum, token, web } from '../style.js'
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
    /* **A leading checkbox or grip on the words' column**, rather than a step
       in from it. The step was the room between the table's edge and its
       first box, which the bleed now gives, and the box sat centered in its
       track: start aligned with no start padding, it stands where the text of
       a table with no such column would. The track keeps its width, so nothing
       after it moves. */
    on(
      {
        part: 'row',
        selector:
          ':host([bleed]) :where([part~="row"], [part="head"]) > :is([part~="select"], [part="select-all"], [part="row-grip"], [part="grip-head"]):first-child',
      },
      [web([rule({ justifyContent: 'flex-start', paddingInlineStart: token('space-none') })])],
    ),
    /* **Chosen rows next to each other are one block**, as a run of chosen
       rows in a list is one selection: no rule across it and no corners
       inside it, only at its first row's top and its last row's bottom. */
    on(
      {
        part: 'row',
        selector:
          ':host([bleed]) [part~="row"][aria-selected="true"]:has(+ [part~="row"][aria-selected="true"]) > *',
      },
      [web([rule({ borderBlockEndColor: 'transparent' })])],
    ),
    on(
      {
        part: 'row',
        selector:
          ':host([bleed]) [part~="row"][aria-selected="true"]:has(+ [part~="row"][aria-selected="true"]) > :first-child::before, :host([bleed]) [part~="row"][aria-selected="true"]:has(+ [part~="row"][aria-selected="true"]) > :last-child::after',
      },
      [
        web([
          rule({
            borderEndEndRadius: token('radii-none'),
            borderEndStartRadius: token('radii-none'),
          }),
        ]),
      ],
    ),
    on(
      {
        part: 'row',
        selector:
          ':host([bleed]) [part~="row"][aria-selected="true"] + [part~="row"][aria-selected="true"] > :first-child::before, :host([bleed]) [part~="row"][aria-selected="true"] + [part~="row"][aria-selected="true"] > :last-child::after',
      },
      [
        web([
          rule({
            borderStartEndRadius: token('radii-none'),
            borderStartStartRadius: token('radii-none'),
          }),
        ]),
      ],
    ),
    /* **`bleed="inset"`: the fill kept off the rules**, rounded at both ends,
       as a menu draws its highlight, for a table set inside a card or a panel
       of its own. The reach past the words is the bleed's; the gap above and
       below it is half the bleed, so a fill never touches the line it sits
       between.

       A row has no box of its own, so each cell draws its share. The cell
       keeps the background-color every state above gives it and clips it to
       its own glyphs, where the words cover it, so it paints nothing; a
       pseudo-element inherits that color and draws it inset. Hover, selection
       and dragging need no rules of their own here. */
    on({ part: 'row', selector: ':host([bleed="inset"]) [part~="row"] > *' }, [
      web([rule({ backgroundClip: 'text', isolation: 'isolate', position: 'relative' })]),
    ]),
    on({ part: 'row', selector: ':host([bleed="inset"]) [part~="row"] > *::before' }, [
      web([
        rule({
          backgroundColor: 'inherit',
          borderRadius: token('radii-none'),
          content: '""',
          insetBlock: quotient(own.dataTableBleed, 2),
          insetInline: token('space-none'),
          pointerEvents: 'none',
          position: 'absolute',
          zIndex: token('layer-beneath'),
        }),
      ]),
    ]),
    on({ part: 'row', selector: ':host([bleed="inset"]) [part~="row"] > :first-child::before' }, [
      web([
        rule({
          insetBlock: quotient(own.dataTableBleed, 2),
          borderEndStartRadius: token('radii-sm'),
          borderStartStartRadius: token('radii-sm'),
          inlineSize: 'auto',
          insetInlineStart: product(own.dataTableBleed, '-1'),
        }),
      ]),
    ]),
    on({ part: 'row', selector: ':host([bleed="inset"]) [part~="row"] > :last-child::before' }, [
      web([
        rule({
          insetBlock: quotient(own.dataTableBleed, 2),
          borderEndEndRadius: token('radii-sm'),
          borderStartEndRadius: token('radii-sm'),
          insetInlineEnd: product(own.dataTableBleed, '-1'),
        }),
      ]),
    ]),
    on({ part: 'row', selector: ':host([bleed="inset"]) [part~="row"] > :last-child::after' }, [
      web([rule({ content: 'none' })]),
    ]),
    /* A run of chosen rows in the inset form is one block too: the gap
       between two of them closes, over the rule that no longer draws. */
    on(
      {
        part: 'row',
        selector:
          ':host([bleed="inset"]) [part~="row"][aria-selected="true"]:has(+ [part~="row"][aria-selected="true"]) > *::before',
      },
      [
        web([
          rule({
            borderEndEndRadius: token('radii-none'),
            borderEndStartRadius: token('radii-none'),
            insetBlockEnd: product(token('border-thin'), '-1'),
          }),
        ]),
      ],
    ),
    on(
      {
        part: 'row',
        selector:
          ':host([bleed="inset"]) [part~="row"][aria-selected="true"] + [part~="row"][aria-selected="true"] > *::before',
      },
      [
        web([
          rule({
            borderStartEndRadius: token('radii-none'),
            borderStartStartRadius: token('radii-none'),
            insetBlockStart: token('space-none'),
          }),
        ]),
      ],
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
