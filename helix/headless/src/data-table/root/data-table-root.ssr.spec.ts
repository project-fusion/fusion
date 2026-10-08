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
 * The rows are a property here, and the cells they make are not served: a
 * server cannot give this element its columns to read them with. What carries
 * the values to a crawler is the first page the page writes as rows, which the
 * served root projects.
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
   * **The values are served when the page writes the first page as rows.**
   *
   * The table reads each cell from its column, and Lit SSR gives this element
   * no children to read, so it cannot draw a value on a server. The page can:
   * it writes the first page as `TableRow` and `TableCell` children, and the
   * served root projects them, through a default slot in the header, which
   * takes the columns too. The columns carry no `slot`, and a server's root
   * routes by name, so before this slot they were assigned nowhere and painted
   * nothing until hydration.
   *
   * What a component owes a server for content it did not write is the slot
   * that projects it, read off a render with no children, so that is what is
   * asserted, with the absence of any row drawn from `rows` beside it: the
   * served rows stand in for those until the table draws its own.
   */
  test('the served root projects the columns and the first page the page wrote', () => {
    const bare = rendered(
      withoutStyles(
        ssr(html`<helix-headless-data-table label="Files"></helix-headless-data-table>`),
      ),
      'helix-headless-data-table',
    )
    expect(bare).toMatch(/<div part="head"[^>]*>(?:(?!<\/div>)[\s\S])*<slot\s*><\/slot>/)
    const served = rendered(withoutStyles(markup), 'helix-headless-data-table')
    expect(served).not.toMatch(/part="row"/)
    expect(served).not.toContain('aria-rowindex="2"')
    /* A heading is served by the slot the column puts in its own shadow root,
       read off a column with no children. */
    const column = ssr(
      html`<helix-headless-table-column field="name" sortable></helix-headless-table-column>`,
    )
    expect(rendered(column, 'helix-headless-table-column')).toMatch(
      /<button part="sort"[^>]*><slot><\/slot>/,
    )
  })

  /**
   * The checkbox and grip headings are served over their columns: each row the
   * page served leads with a box of the same size in their place, from
   * `helix.css`, so a heading stands over its values from the first paint.
   */
  test('the checkbox and grip headings are served', () => {
    const served = rendered(
      withoutStyles(
        ssr(html`<helix-headless-data-table
          .rows=${rows}
          label="Files"
          reorderable-rows
          row-key="name"
          selectable
        ></helix-headless-data-table>`),
      ),
      'helix-headless-data-table',
    )
    expect(served).toContain('part="select-all"')
    expect(served).toContain('part="grip-head"')
  })

  /**
   * **`columns` is the one track list a server can send.** It has no columns to
   * read a `width` from, so a table sized by its own attribute is laid out at
   * its widths from the first paint, the checkbox column ahead of them.
   */
  test('the track list in `columns` is served, after the checkbox column', () => {
    const served = ssr(html`<helix-headless-data-table
      columns="2fr 8rem"
      label="Files"
      row-key="name"
      selectable
    ></helix-headless-data-table>`)
    expect(partTag(served, 'table')).toContain('--data-table-template: max-content 2fr 8rem')
    expect(partTag(markup, 'table')).not.toContain('--data-table-template')
  })

  /**
   * **The pagination's row is held on a server**, which cannot count the rows
   * a page served: the footer says so, and the styled tier keeps its height,
   * so nothing below moves once the rows arrive and the pagination draws.
   */
  test("the footer holds the pagination's row on a server", () => {
    const paged = ssr(html`<helix-headless-data-table
      label="Files"
      page-size="2"
    ></helix-headless-data-table>`)
    expect(partTag(paged, 'footer')).toContain('data-held')
    expect(partTag(markup, 'footer')).not.toContain('data-held')
  })

  test('the host writes no attributes of its own, so hydration has nothing to reconcile', () => {
    expect(hostAttributes(markup, 'helix-headless-data-table')).toEqual(['label', 'sort'])
    expect(hostAttributes(markup, 'helix-headless-table-column')).toEqual(['field', 'sortable'])
  })

  /**
   * The counts belong to the grid, which is the host, and the host says them
   * through its internals, which a server does not write. On the `rowgroup`
   * they applied to nothing, so the served markup carries none there, and the
   * header row still carries its place.
   */
  test('the row count is not served on the row group, where it means nothing', () => {
    expect(partTag(markup, 'table')).not.toContain('aria-rowcount')
    expect(partTag(markup, 'head')).toContain('aria-rowindex="1"')
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
     and the served count is zero whatever the seed says. It is the reason the
     values reach a server only as rows the page writes, and the seed is
     asserted in the DOM spec instead. */
})

describe('a data table that loads more, on the server', () => {
  test('serves the row that asks, after the rows it was given', () => {
    const served = rendered(
      ssr(html`<helix-headless-data-table .rows=${rows} label="Files" load-more>
        <helix-headless-table-column field="name">Name</helix-headless-table-column>
      </helix-headless-data-table>`),
      'helix-headless-data-table',
    )
    expect(served).toMatch(/<div\s+part="more"\s+role="row"/)
    expect(served).toContain('Load more')
  })

  test('serves none without rows to follow', () => {
    const served = rendered(
      ssr(html`<helix-headless-data-table label="Files" load-more></helix-headless-data-table>`),
      'helix-headless-data-table',
    )
    expect(served).not.toContain('part="more"')
  })
})
