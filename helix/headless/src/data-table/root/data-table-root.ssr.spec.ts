import { describe, expect, test } from 'bun:test'
import {
  hostAttributes,
  partTag,
  rendered,
  ssr,
  withoutStyles,
} from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'
import '../../table/index.js'

/**
 * The server output.
 *
 * **Lit's element shim carries attributes and not a tree**, so `this.children`
 * is `undefined` on the server. `tableColumns` is read during `render`, and
 * spreading an undefined `children` throws and takes the whole SSR suite down
 * with an unhandled error. The `?? []` guarding it is invisible in a DOM spec,
 * because there `children` always exists, which is the entire reason these
 * specs run in a second process.
 *
 * The rows are a property here rather than markup, so what a crawler gets is not
 * an accident of what the consumer typed: the table renders its cells from data
 * on the server exactly as it does in a browser, and that is the property worth
 * asserting.
 */

const rows = [
  { name: 'alpha', size: 30 },
  { name: 'bravo', size: 4 },
]

const markup = ssr(html`<helix-headless-data-table
  .rows=${rows}
  label="Files"
  sort="name:asc"
>
  <helix-headless-table-column field="name" sortable>Name</helix-headless-table-column>
  <helix-headless-table-column field="size" text-align="end">Size</helix-headless-table-column>
</helix-headless-data-table>`)

describe('data table server output', () => {
  test('it renders at all, which is the assertion this family failed before', () => {
    expect(markup).toBeTruthy()
    expect(partTag(markup, 'table')).toContain('role="rowgroup"')
  })

  test('the head row is served, so the grid is not one long list before upgrade', () => {
    expect(partTag(markup, 'head')).toContain('role="row"')
  })

  /**
   * **The limitation, pinned so it cannot change quietly.**
   *
   * The headings are served, because a column renders its own, and the row
   * elements are served, because their count comes from `rows`, which is a
   * property. The **cell values are not**, because reading them needs the
   * columns and the columns are markup children that Lit SSR does not give this
   * element. So a crawler sees a table of the right shape with nothing in it,
   * which is strictly less than `Table` serves for a table whose rows are
   * markup.
   *
   * That is the cost of "the schema is markup and the data is a property", and
   * it is a bigger version of a cost the design already accepted: a consumer
   * hand-authoring HTML with no build step gets default cell rendering. Filed
   * rather than worked around here, because the obvious workaround is a
   * `columns` property beside the markup columns, which splits one source of
   * truth for columns into two that nothing checks agree: a table rendered one
   * way on the server and another in the browser, with a hydration mismatch on
   * top.
   *
   * Asserted rather than left implicit, so the day it is fixed this spec fails
   * and says what changed.
   */
  test('the headings and the row structure are served, and the cell values are not', () => {
    const served = withoutStyles(markup)
    /* `toContain('Name')` read the column's own light-DOM text back out of the
       render, so it passed with the column rendering nothing: a heading is
       served by the slot the column puts in its own shadow root, read off a
       column with no children. */
    const column = ssr(
      html`<helix-headless-table-column field="name" sortable></helix-headless-table-column>`,
    )
    expect(rendered(column, 'helix-headless-table-column')).toMatch(
      /<button part="sort"[^>]*><slot><\/slot>/,
    )
    expect(rendered(served, 'helix-headless-data-table')).toContain('aria-rowindex="2"')
    expect(rendered(served, 'helix-headless-data-table')).toContain('aria-rowindex="3"')
    expect(served).not.toContain('alpha')
  })

  test('the host writes no attributes of its own, so hydration has nothing to reconcile', () => {
    expect(hostAttributes(markup, 'helix-headless-data-table')).toEqual(['label', 'sort'])
    expect(hostAttributes(markup, 'helix-headless-table-column')).toEqual(['field', 'sortable'])
  })

  /**
   * The counts belong to the grid, which is the host, and the host says them
   * through its internals, which a server does not write. On the `rowgroup`
   * they applied to nothing, so the served markup carries none there, and the
   * rows still carry their place in the result.
   */
  test('the row count is not served on the row group, where it means nothing', () => {
    expect(partTag(markup, 'table')).not.toContain('aria-rowcount')
    expect(rendered(markup, 'helix-headless-data-table')).toContain('aria-rowindex="2"')
  })

  /**
   * `children` is undefined on the server, so the count is unknown rather than
   * zero, and the attribute is left off rather than served as a lie. An
   * `aria-colcount="0"` on a two-column grid is worse than none: a screen
   * reader told there are no columns has been told something false, where a
   * screen reader told nothing falls back to counting what it can see.
   */
  test('the column count is absent rather than zero, since the server cannot count them', () => {
    expect(partTag(markup, 'table')).not.toContain('aria-colcount')
  })

  /**
   * **The row direction of the same argument, which this spec used to ask in
   * one direction only.**
   *
   * A consumer who binds `.rows` in a template has them on the server, which is
   * the render every test above is made against. A consumer who assigns them
   * from a script has them only once that script has run, and a server's markup
   * ends at the parse: `rows` is empty there and empty is not the answer, it is
   * the absence of one. Served anyway it was three false statements at once, and
   * the reader met the worst of them first, "Nothing to show" over a result on
   * its way in.
   */
  test('a table whose rows have not arrived says nothing about them', () => {
    const unknown = withoutStyles(
      ssr(html`<helix-headless-data-table label="Files" page-size="4">
        <helix-headless-table-column field="name">Name</helix-headless-table-column>
      </helix-headless-data-table>`),
    )
    expect(rendered(unknown, 'helix-headless-data-table')).not.toContain('part="empty"')
    expect(partTag(unknown, 'table')).not.toContain('aria-rowcount')
    expect(partTag(unknown, 'pagination')).not.toContain('total=')
    /* The other polarity is the test above, so the pair cannot be met by a
       table that says nothing whatever: bound rows are known on a server and
       are counted there. */
  })
})

describe('the uncontrolled defaults a table takes from markup', () => {
  /* Each is the seed half of a property the table goes on owning, and each is
     resolved into the render rather than read back on its own: `defaultFilter`
     is what `filter` answers until somebody types, `defaultPageSize` is what
     `pageSize` answers until somebody chooses, and `paginated` answers from the
     page size unless a consumer says otherwise.
   *
   * Resolved by the server's render, because the row of pages is under the
   * table: filled in on the first client update it appears after the table has
   * been painted and moves whatever is beneath it. */
  const many = [
    { name: 'alpha', size: 1 },
    { name: 'bravo', size: 2 },
    { name: 'charlie', size: 3 },
  ]
  test('`paginated` is what puts the row of pages in the served markup at all', () => {
    /* It is not a style on a control that is always there: switched off, the
       element is not rendered, so a table that turned it on at hydration grows
       a whole row of controls under itself after the first paint. */
    const off = ssr(
      html`<helix-headless-data-table .rows=${many} label="Files"></helix-headless-data-table>`,
    )
    expect(partTag(off, 'pagination')).toBe('')

    const on = ssr(
      html`<helix-headless-data-table
        .rows=${many}
        label="Files"
        paginated
      ></helix-headless-data-table>`,
    )
    expect(partTag(on, 'pagination')).not.toBe('')
  })

  test('`default-page-size` is the size the served pagination is drawn at', () => {
    /* The seed rather than the state: `pageSize` answers from it until somebody
       chooses, and the row of pages under the table is laid out from the
       answer. Resolved on the first client update instead, the page count
       changes under the reader once. */
    const table = ssr(
      html`<helix-headless-data-table
        .rows=${many}
        default-page-size="2"
        label="Files"
      ></helix-headless-data-table>`,
    )
    /* `paginated` is not written here, which is half the point: it answers from
       the page size, so a size alone is enough to serve the control. */
    expect(partTag(table, 'pagination')).toContain('page-size="2"')
  })

  /* `default-filter` is not asserted here and cannot be. The filter matches on
     each column's ordering value, the columns are markup children, and Lit SSR
     gives this element no tree to read them from, so every row matches nothing
     and the served count is zero whatever the seed says. It is the same
     limitation the note above pins for the cell values, and the seed is
     asserted in the DOM spec instead. */
})
