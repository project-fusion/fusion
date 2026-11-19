import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('border beam server output', () => {
  const served = ssr(html`<helix-border-beam><p>Working</p></helix-border-beam>`)

  test('serves the light, hidden from screen readers', () => {
    expect(partTag(served, 'beam')).toContain('aria-hidden="true"')
  })

  test('the host carries nothing the page did not write', () => {
    expect(hostAttributes(served, 'helix-border-beam')).toEqual([])
  })
})
