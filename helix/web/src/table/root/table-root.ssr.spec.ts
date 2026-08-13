import { describe, expect, test } from 'bun:test'
import { hostTag, partTag, ssr, withoutStyles } from '@fusion-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

const markup = ssr(html`<helix-table columns="10rem 1fr" label="Attributes">
  <helix-table-row>
    <helix-table-cell header>Name</helix-table-cell>
    <helix-table-cell>appearance</helix-table-cell>
  </helix-table-row>
</helix-table>`)

describe('table server output', () => {
  test('the table role and name are in the served markup', () => {
    expect(partTag(markup, 'table')).toContain('role="table"')
    expect(partTag(markup, 'table')).toContain('aria-label="Attributes"')
  })

  test('rows and cells carry their roles on the host, written before hydration', () => {
    // Set in `willUpdate`, which the server does call, unlike
    // `connectedCallback`. Without it the served table has no structure.
    expect(hostTag(markup, 'helix-table-row')).toContain('role="row"')
    expect(hostTag(markup, 'helix-table-cell')).toContain('role="columnheader"')
  })

  test('the content is in the markup for a crawler', () => {
    expect(withoutStyles(markup)).toContain('appearance')
  })
})
