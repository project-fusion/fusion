import { headless, Slot } from '../../../render.js'

/**
 * One cell of a table, in its headless tier: what a row holds.
 *
 * **`header` makes the cell a header.** In a row that holds a cell without
 * `header` it heads its row, and in a row of `header` cells alone it heads its
 * column, as `<th>` does with no `scope`. The web sets the role on the host. A
 * phone has no role for a cell or a header, so it says the column's heading with
 * the cell's words.
 *
 * **The row places a cell**, so what the table works out for a column reaches
 * every cell under it from the row around it: the track's width, the edge the
 * column lines up against, and the words of its heading.
 *
 * **Held to `helix-table-cell`.** `helix system check` compares the props, the
 * states, and the regions with what the manifest says the element has.
 */
export default headless('table-cell', {
  props: {
    header: false,
  },
  events: {},
  states: ['settled', 'text'],
  render: () => <Slot />,
})
