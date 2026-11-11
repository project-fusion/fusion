import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('styled column manager server output', () => {
  const markup = ssr(
    html`<helix-column-manager for="invoices" label="Invoice columns"></helix-column-manager>`,
  )

  test('serves the heading as the headless tier does', () => {
    expect(partTag(markup, 'list')).toContain('aria-labelledby="title"')
  })

  test('the host carries only what the page wrote', () => {
    expect(hostAttributes(markup, 'helix-column-manager')).toEqual(['for', 'label'])
  })
})
