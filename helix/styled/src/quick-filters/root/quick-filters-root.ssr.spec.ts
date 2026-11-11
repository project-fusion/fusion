import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('styled quick filters server output', () => {
  const markup = ssr(
    html`<helix-quick-filters for="invoices" label="Invoice views"></helix-quick-filters>`,
  )

  test('serves the row as the headless tier does', () => {
    expect(partTag(markup, 'list')).toContain('aria-label="Invoice views"')
  })

  test('the host carries only what the page wrote', () => {
    expect(hostAttributes(markup, 'helix-quick-filters')).toEqual(['for', 'label'])
  })
})
