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

const rows = [
  { name: 'alpha', size: 30 },
  { name: 'bravo', size: 4 },
]

describe('data table server output', () => {
  test('the grid and its head row ship, so the shape is not one long list', () => {
    const markup = ssr(html`<helix-data-table .rows=${rows} label="Files"></helix-data-table>`)
    expect(partTag(markup, 'table')).toContain('role="rowgroup"')
    expect(partTag(markup, 'head')).toContain('role="row"')
  })

  /**
   * **The empty state is the one thing a collection must never get wrong, and
   * this is the tier it reached a consumer through.**
   *
   * The rows are a property. A consumer who binds it in a template has them on
   * the server; a consumer who assigns it from a script has them only once that
   * script has run, which is after the parse a server's markup ends at. Empty
   * there is not an answer, and served as one it was three false statements at
   * once: "Nothing to show" over a result on its way in, a row count of zero,
   * and a pagination told the result was empty.
   */
  test('a table whose rows have not arrived says nothing about them', () => {
    const unknown = withoutStyles(
      ssr(html`<helix-data-table label="Files" page-size="4">
        <helix-table-column field="name">Name</helix-table-column>
      </helix-data-table>`),
    )
    expect(rendered(unknown, 'helix-data-table')).not.toContain('part="empty"')
    expect(partTag(unknown, 'table')).not.toContain('aria-rowcount')
    expect(partTag(unknown, 'pagination')).not.toContain('total=')
  })

  /* The count is the grid's, on the host's internals, which a server does not
     write: the `rowgroup` it used to sit on applied it to nothing. */
  test('a table handed its rows serves them with their place in the result', () => {
    const markup = ssr(html`<helix-data-table .rows=${rows} label="Files"></helix-data-table>`)
    expect(partTag(markup, 'table')).not.toContain('aria-rowcount')
    expect(rendered(markup, 'helix-data-table')).toContain('aria-rowindex="3"')
  })

  test('the host carries only what the consumer wrote', () => {
    const markup = ssr(html`<helix-data-table .rows=${rows} label="Files"></helix-data-table>`)
    expect(hostAttributes(markup, 'helix-data-table')).toEqual(['label'])
  })
})
