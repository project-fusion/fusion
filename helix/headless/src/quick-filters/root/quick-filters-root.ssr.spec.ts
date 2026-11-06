import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('quick filters server output', () => {
  const markup = ssr(
    html`<helix-headless-quick-filters for="invoices"></helix-headless-quick-filters>`,
  )

  test('serves the row and its save button, with no presets until the children are known', () => {
    expect(partTag(markup, 'list')).toContain('role="toolbar"')
    expect(partTag(markup, 'save')).toContain('type="button"')
  })

  test('the host carries only what the page wrote', () => {
    expect(hostAttributes(markup, 'helix-headless-quick-filters')).toEqual(['for'])
  })
})
