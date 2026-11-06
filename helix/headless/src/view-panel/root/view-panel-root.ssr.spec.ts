import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('view panel server output', () => {
  const markup = ssr(html`<helix-headless-view-panel for="invoices"></helix-headless-view-panel>`)

  test('serves the heading, the list, and Show, with the open section hidden', () => {
    expect(partTag(markup, 'title')).toContain('part="title"')
    expect(partTag(markup, 'page')).toContain('hidden')
    expect(partTag(markup, 'show')).toContain('helix-headless-button')
  })

  test('the host carries only what the page wrote', () => {
    expect(hostAttributes(markup, 'helix-headless-view-panel')).toEqual(['for'])
  })
})
