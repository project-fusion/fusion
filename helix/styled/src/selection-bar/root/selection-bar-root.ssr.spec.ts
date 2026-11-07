import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('styled selection bar server output', () => {
  const markup = ssr(html`<helix-selection-bar for="invoices"></helix-selection-bar>`)

  test('serves its parts as the headless tier does', () => {
    expect(partTag(markup, 'clear')).toContain('type="button"')
  })

  test('the host carries only what the page wrote', () => {
    expect(hostAttributes(markup, 'helix-selection-bar')).toEqual(['for'])
  })
})
