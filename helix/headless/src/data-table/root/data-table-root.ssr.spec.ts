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
  <helix-headless-table-column field="size" align="end">Size</helix-headless-table-column>
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
   * which is strictly less than `helix-table` serves for a table whose rows are
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
   * The count describes the result. On the server there is no window yet and
   * the number still has to be the whole set, or the first thing a screen reader
   * hears is a smaller table than the one that arrives.
   */
  test('the row count is the whole result, header included', () => {
    expect(partTag(markup, 'table')).toContain('aria-rowcount="3"')
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
})
