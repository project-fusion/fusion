import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('styled table export server output', () => {
  const markup = ssr(html`<helix-table-export for="invoices"></helix-table-export>`)

  test('serves the panel as the headless tier does', () => {
    expect(partTag(markup, 'format')).toContain('<fieldset')
  })

  test('the host carries only what the page wrote', () => {
    expect(hostAttributes(markup, 'helix-table-export')).toEqual(['for'])
  })
})
