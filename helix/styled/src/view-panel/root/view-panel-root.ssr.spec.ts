import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('styled view panel server output', () => {
  const markup = ssr(html`<helix-view-panel for="invoices"></helix-view-panel>`)

  test('serves its parts as the headless tier does', () => {
    expect(partTag(markup, 'reset')).toContain('type="button"')
  })

  test('the host carries only what the page wrote', () => {
    expect(hostAttributes(markup, 'helix-view-panel')).toEqual(['for'])
  })
})
