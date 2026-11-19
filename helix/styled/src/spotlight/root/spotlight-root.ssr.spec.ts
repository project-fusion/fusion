import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('spotlight server output', () => {
  const served = ssr(html`<helix-spotlight><p>Card</p></helix-spotlight>`)

  test('serves the light over the content and on its edge, hidden from screen readers', () => {
    expect(partTag(served, 'glow')).toContain('aria-hidden="true"')
    expect(partTag(served, 'edge')).toContain('aria-hidden="true"')
  })

  test('the host carries nothing the page did not write', () => {
    expect(hostAttributes(served, 'helix-spotlight')).toEqual([])
  })
})
