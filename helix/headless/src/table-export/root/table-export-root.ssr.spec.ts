import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('table export server output', () => {
  const markup = ssr(
    html`<helix-headless-table-export for="invoices"></helix-headless-table-export>`,
  )

  test('serves its groups and buttons, disabled until the table is found', () => {
    expect(partTag(markup, 'rows')).toContain('<fieldset')
    expect(partTag(markup, 'export')).toContain('disabled')
  })

  test('the host carries only what the page wrote', () => {
    expect(hostAttributes(markup, 'helix-headless-table-export')).toEqual(['for'])
  })
})
