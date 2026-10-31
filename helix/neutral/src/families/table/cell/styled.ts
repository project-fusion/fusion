import { inherited, measured, native, product, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import cell from './headless.js'

/**
 * One cell of a table, in its styled tier.
 *
 * **A stated height rather than one falling out of the padding**, so every row
 * is the same height whatever is in it: a cell holding a tag or an icon button
 * was taller than the text cell beside it, and a table whose rows differ by a
 * few pixels reads as a table nobody measured.
 *
 * **Content, so full foreground and not `foreground-muted`**: that is the color
 * for chrome around something a reader is looking at, and a table's cells are
 * the thing they are looking at. The rules and the column headings are what
 * recede.
 *
 * **The edge is the column's**, which the table publishes because the cell is
 * the consumer's markup and it may write nothing onto it. Both properties:
 * `justify-content` moves a value that fits and `text-align` lines up one that
 * wraps. Under a column that sets no edge both declarations drop out. A phone's
 * row gives the same edge to the box around the cell.
 *
 * **A long identifier breaks rather than running into the column beside it**,
 * with `anywhere` and not `break-word`, because only `anywhere` lowers the
 * min-content size.
 *
 * **A header cell is content and not a label**, so weight carries it and it
 * keeps the foreground and the size of the cells beside it. Not capitals, which
 * cost legibility and are read letter by letter by some screen readers.
 *
 * **The focus ring is inset**, so the table's scrolling box does not clip it.
 */
export default styles(
  cell,
  {
    prefix: 'table',
    hooks: {
      cellMinBlockSize: token('size-control'),
      paddingBlock: token('space-xs'),
      ruleColor: token('color-border'),
    },
    stylesheet: 'table/cell/table-cell.generated.css',
  },
  ({ hook, on, rule }) => [
    on('host', [
      rule({
        alignItems: 'center',
        borderBlockEnd: [token('border-thin'), 'solid', hook.ruleColor],
        boxSizing: 'border-box',
        color: token('color-foreground'),
        display: 'flex',
        fontSize: token('text-sm'),
        minBlockSize: hook.cellMinBlockSize,
        minInlineSize: 0,
        paddingBlock: hook.paddingBlock,
        paddingInline: [token('space-none'), token('space-md')],
        web: {
          justifyContent: measured('table-cell-align'),
          overflowWrap: 'anywhere',
          textAlign: measured('table-cell-align'),
        },
      }),
      rule({ header: true }, { fontWeight: token('weight-medium') }),
      web([
        rule(
          { focusVisible: true },
          {
            outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
            outlineOffset: product(token('size-focus-offset'), '-1'),
          },
        ),
      ]),
      /* A phone's box is as wide as its track, and the words wrap in it. The row
         gives the cell its column's edge as two hooks. */
      native([
        rule({
          flexGrow: 1,
          flexShrink: 1,
          justifyContent: inherited('table-cell-justify', 'flex-start'),
          textAlign: inherited('table-cell-align', 'start'),
        }),
      ]),
    ]),
    /* A cell that holds text of its own flows it as a line of text. Otherwise the
       slot is `display: contents` and each run of text and each element is its
       own flex item, so words sat side by side in columns and broke mid-word at
       390px. A cell of elements alone keeps the flex layout. */
    on({ region: 'default' }, [
      web([rule({ text: true }, { display: 'block', minInlineSize: 0 })]),
    ]),
    /* The cell can shrink and its content could not: a flex item inside keeps an
       automatic minimum of its own until it is told otherwise. */
    on({ region: 'default', slotted: '*' }, [web([rule({ minInlineSize: 0 })])]),
  ],
)
