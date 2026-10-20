import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('styled find server output', () => {
  const markup = ssr(html`<helix-find for="notes" open label="Find in notes"></helix-find>`)

  test('serves the bar as the headless tier does', () => {
    expect(partTag(markup, 'bar')).toContain('aria-label="Find in notes"')
    expect(partTag(markup, 'next')).toContain('label="Next match"')
  })

  test('the host carries only what the page wrote', () => {
    expect(hostAttributes(markup, 'helix-find')).toEqual(['for', 'label', 'open'])
  })
})
