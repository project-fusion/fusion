import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('cursor server output', () => {
  const served = ssr(html`<helix-cursor name="Ada"></helix-cursor>`)

  test('serves the pointer, hidden from screen readers', () => {
    expect(partTag(served, 'pointer')).toContain('aria-hidden="true"')
  })

  test('the host carries nothing the page did not write', () => {
    expect(hostAttributes(served, 'helix-cursor')).toEqual(['name'])
  })
})
